import { Request, Response, NextFunction } from 'express';
import { sessionStore } from './sessionStore';
import { prisma } from './prisma';
import { Role } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    hostelId: string | null;
  };
}

// Session-based authentication middleware (Development Mode: No JWT)
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  let token = req.cookies?.['access_token'] as string | undefined;
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const session = sessionStore.getSession(token);
  if (!session) {
    res.status(401).json({ success: false, error: 'Invalid or expired session' });
    return;
  }

  req.user = session;
  next();
}

// Helper to check user permission dynamically
export async function checkUserPermission(userId: string, role: string, permission: string): Promise<boolean> {
  if (role === 'SUPER_ADMIN') return true;

  try {
    const hasPerm = await prisma.rolePermission.findFirst({
      where: {
        role: role as Role,
        permission: permission
      }
    });
    return !!hasPerm;
  } catch (err) {
    console.error('Permission check error:', err);
    return false;
  }
}

// Middleware to enforce dynamic permissions
export function requirePermission(permission: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const permitted = await checkUserPermission(req.user.id, req.user.role, permission);
    if (!permitted) {
      res.status(403).json({ success: false, error: `Access denied. Requires permission: ${permission}` });
      return;
    }

    next();
  };
}

// Retro-compatible requireRole middleware using dynamic checks internally or fallback
export function requireRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Access denied. Unauthorized role.' });
      return;
    }
    next();
  };
}
