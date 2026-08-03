import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    hostelId: string | null;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  let token = req.cookies?.['access_token'] as string | undefined;
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as {
      id: string;
      email: string;
      role: string;
      hostelId: string | null;
    };
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

export function requireRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Access denied. Unauthorized role.' });
      return;
    }
    next();
  };
}
