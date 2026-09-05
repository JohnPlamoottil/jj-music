import { Router } from 'express';
import { User } from '../models';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';
import type { Response } from 'express';

const router = Router();

router.post('/login', async (req: AuthRequest, res: Response, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new AppError(400, 'Email and password required');
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      throw new AppError(401, 'Invalid email or password');
    }

    req.session.userId = user._id.toString();
    res.json({ data: user.toJSON() });
  } catch (err: any) {
    next(err);
  }
});

router.post('/register', async (req: AuthRequest, res: Response, next) => {
  try {
    if (!config.ALLOW_REGISTRATION) {
      throw new AppError(403, 'Registration is closed');
    }

    const { email, password } = req.body;
    if (!email || !password) {
      throw new AppError(400, 'Email and password required');
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new AppError(409, 'Email already registered');
    }

    const user = new User({
      email: email.toLowerCase(),
      passwordHash: password,
      displayName: email.split('@')[0],
    });

    await user.save();
    req.session.userId = user._id.toString();
    res.status(201).json({ data: user.toJSON() });
  } catch (err: any) {
    next(err);
  }
});

router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({ data: req.user.toJSON() });
});

router.post('/logout', (req: AuthRequest, res: Response) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.json({ data: null });
  });
});

export default router;
