import { Request, Response, NextFunction } from 'express';
import { User } from '../models';

export interface AuthRequest extends Request {
  userId?: string;
  user?: any;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findById(userId).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.userId = userId;
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.session?.userId;
  if (userId) {
    req.userId = userId;
  }
  next();
}
