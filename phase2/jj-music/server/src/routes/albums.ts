import { Router } from 'express';
import { Song } from '../models';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import type { Response } from 'express';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const albums = await Song.aggregate([
      { $match: { userId: req.userId! } },
      { $group: { _id: '$album', artist: { $first: '$artist' }, artwork: { $first: '$artworkUrl' }, year: { $first: '$year' }, genre: { $first: '$genre' } } },
      { $sort: { artist: 1, _id: 1 } },
      { $skip: skip },
      { $limit: limitNum },
    ]);

    const total = await Song.distinct('album', { userId: req.userId });

    res.json({
      data: {
        items: albums.map(a => ({
          id: a._id,
          name: a._id,
          artist: a.artist,
          year: a.year,
          genre: a.genre,
          artworkUrl: a.artwork,
        })),
        total: total.length,
        page: pageNum,
        limit: limitNum,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list albums' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const albumName = decodeURIComponent(req.params.id);
    const songs = await Song.find({ userId: req.userId, album: albumName }).sort({ trackNumber: 1, title: 1 });

    if (songs.length === 0) {
      throw new AppError(404, 'Album not found');
    }

    const first = songs[0];
    res.json({
      data: {
        id: albumName,
        name: albumName,
        artist: first.artist,
        year: first.year,
        genre: first.genre,
        artworkUrl: first.artworkUrl,
        songs: songs.map(song => ({
          id: song._id.toString(),
          title: song.title,
          artist: song.artist,
          album: song.album,
          genre: song.genre,
          year: song.year,
          trackNumber: song.trackNumber,
          duration: song.duration,
          artworkUrl: song.artworkUrl,
          mimeType: song.mimeType,
          fileSize: song.fileSize,
          favorite: song.favorite,
          playCount: song.playCount,
          uploadedAt: song.uploadedAt.toISOString(),
          lastPlayedAt: song.lastPlayedAt?.toISOString() || null,
        })),
      },
    });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    res.status(500).json({ error: 'Failed to fetch album' });
  }
});

export default router;
