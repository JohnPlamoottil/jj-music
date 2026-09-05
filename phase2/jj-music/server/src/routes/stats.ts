import { Router } from 'express';
import { Song, Playlist, PlaybackHistory } from '../models';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import type { Response } from 'express';

const router = Router();

router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [songCount, favorites, playlistCount, totalPlayTime, listeningTime] = await Promise.all([
      Song.countDocuments({ userId: req.userId }),
      Song.countDocuments({ userId: req.userId, favorite: true }),
      Playlist.countDocuments({ userId: req.userId }),
      Song.aggregate([
        { $match: { userId: req.userId! } },
        { $group: { _id: null, total: { $sum: '$duration' } } },
      ]),
      PlaybackHistory.countDocuments({ userId: req.userId }),
    ]);

    const totalSeconds = totalPlayTime[0]?.total || 0;

    res.json({
      data: {
        songCount,
        favoriteCount: favorites,
        playlistCount,
        totalPlayTime: totalSeconds,
        listeningTime,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
