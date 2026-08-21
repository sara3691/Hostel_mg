import webpush from 'web-push';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from './prisma';
import { Role } from '@prisma/client';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  vibrate?: number[];
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

class PushService {
  private vapidPublicKey: string = '';
  private vapidPrivateKey: string = '';
  private vapidSubject: string = 'mailto:admin@smarthostel.local';
  private initialized: boolean = false;

  constructor() {
    this.initVapid();
  }

  private initVapid() {
    try {
      const vapidFile = path.resolve(process.cwd(), 'vapid-keys.json');

      if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        this.vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
        this.vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
        if (process.env.VAPID_SUBJECT) {
          this.vapidSubject = process.env.VAPID_SUBJECT;
        }
      } else if (fs.existsSync(vapidFile)) {
        const fileContent = fs.readFileSync(vapidFile, 'utf-8');
        const keys = JSON.parse(fileContent);
        this.vapidPublicKey = keys.publicKey;
        this.vapidPrivateKey = keys.privateKey;
      } else {
        // Generate new stable keys and persist to file
        const generated = webpush.generateVAPIDKeys();
        this.vapidPublicKey = generated.publicKey;
        this.vapidPrivateKey = generated.privateKey;
        fs.writeFileSync(vapidFile, JSON.stringify(generated, null, 2));
      }

      webpush.setVapidDetails(
        this.vapidSubject,
        this.vapidPublicKey,
        this.vapidPrivateKey
      );
      this.initialized = true;
      console.log('[PUSH SERVICE] VAPID initialized successfully. Public Key available.');
    } catch (err) {
      console.error('[PUSH SERVICE] Failed to initialize VAPID details:', err);
    }
  }

  public getPublicKey(): string {
    return this.vapidPublicKey;
  }

  public async registerSubscription(
    userId: string,
    role: Role,
    hostelId: string | null,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    userAgent?: string
  ) {
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      throw new Error('Invalid subscription object');
    }

    try {
      const existing = await prisma.pushSubscription.findUnique({
        where: { endpoint: subscription.endpoint }
      });

      if (existing) {
        return await prisma.pushSubscription.update({
          where: { endpoint: subscription.endpoint },
          data: {
            userId,
            role,
            hostelId,
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
            userAgent: userAgent || existing.userAgent
          }
        });
      }

      return await prisma.pushSubscription.create({
        data: {
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userId,
          role,
          hostelId,
          userAgent: userAgent || null
        }
      });
    } catch (err: any) {
      console.error('[PUSH SERVICE] Error registering subscription:', err.message);
      throw err;
    }
  }

  public async unregisterSubscription(userId: string, endpoint?: string) {
    try {
      if (endpoint) {
        await prisma.pushSubscription.deleteMany({
          where: { endpoint, userId }
        });
      } else {
        await prisma.pushSubscription.deleteMany({
          where: { userId }
        });
      }
      return true;
    } catch (err: any) {
      console.error('[PUSH SERVICE] Error unregistering subscription:', err.message);
      return false;
    }
  }

  public async sendNotificationToUser(userId: string, payload: PushNotificationPayload) {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId }
    });

    return this.dispatchToSubscriptions(subscriptions, payload);
  }

  public async broadcastToUsers(userIds: string[], payload: PushNotificationPayload) {
    if (!userIds.length) return { sent: 0, failed: 0 };

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: { in: userIds } }
    });

    return this.dispatchToSubscriptions(subscriptions, payload);
  }

  public async broadcastToRoles(roles: Role[], hostelId?: string | null, payload?: PushNotificationPayload) {
    const whereClause: any = {
      role: { in: roles }
    };

    if (hostelId) {
      whereClause.OR = [
        { hostelId },
        { hostelId: null }
      ];
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: whereClause
    });

    if (payload) {
      return this.dispatchToSubscriptions(subscriptions, payload);
    }
    return { sent: 0, failed: 0 };
  }

  private async dispatchToSubscriptions(subscriptions: any[], payload: PushNotificationPayload) {
    let sent = 0;
    let failed = 0;
    const stringified = JSON.stringify(payload);

    const options: webpush.RequestOptions = {
      TTL: 86400, // 24 hours
      urgency: 'high'
    };

    const promises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, stringified, options);
        sent++;
      } catch (err: any) {
        failed++;
        console.warn(`[PUSH SERVICE] Failed to send push to ${sub.endpoint.slice(0, 30)}... Code: ${err.statusCode}`);
        // If expired or gone (404 / 410), clean up from database
        if (err.statusCode === 404 || err.statusCode === 410) {
          try {
            await prisma.pushSubscription.delete({ where: { id: sub.id } });
          } catch (_) {}
        }
      }
    });

    await Promise.allSettled(promises);
    return { sent, failed, total: subscriptions.length };
  }
}

export const pushService = new PushService();
