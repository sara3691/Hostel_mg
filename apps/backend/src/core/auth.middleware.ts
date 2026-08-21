import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config';
import { sessionStore } from './sessionStore';
import { prisma } from './prisma';
import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      role: string;
      hostelId: string | null;
    }
  }
}

export interface AuthRequest extends Request {
  user?: Express.User;
}

// Generate persistent 30-day JWT token
export function signUserToken(payload: { id: string; email: string; role: string; hostelId: string | null }): string {
  return jwt.sign(
    {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      hostelId: payload.hostelId
    },
    config.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// Stateless JWT-first authentication middleware with session-store fallback
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  let token = req.cookies?.['access_token'] as string | undefined;
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  // 1. Try JWT verification (Stateless, persistent across restarts)
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as Express.User;
    if (decoded && decoded.id) {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        hostelId: decoded.hostelId ?? null
      };
      return next();
    }
  } catch (jwtErr) {
    // JWT expired or signature invalid, check session store fallback
  }

  // 2. Fallback to in-memory session store for legacy sessions
  const session = sessionStore.getSession(token);
  if (session) {
    req.user = session;
    return next();
  }

  res.status(401).json({ success: false, error: 'Invalid or expired session' });
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
