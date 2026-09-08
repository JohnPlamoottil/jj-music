import { Router } from 'express';
import { Song, Playlist } from '../models';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import type { Response } from 'express';

const router = Router();

router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [songs, playlists] = await Promise.all([
      Song.find({ userId: req.userId }).select(
        'artist album duration'
      ),
      Playlist.countDocuments({ userId: req.userId }),
    ]);

    const artists = new Set(
      songs
        .map((song) => song.artist)
        .filter(Boolean)
    ).size;

    const albums = new Set(
      songs
        .map((song) => `${song.album}|||${song.artist}`)
        .filter(Boolean)
    ).size;

    const totalDuration = songs.reduce(
      (total, song) => total + (song.duration || 0),
      0
    );

    res.json({
      data: {
        songs: songs.length,
        artists,
        albums,
        playlists,
        totalDuration,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;