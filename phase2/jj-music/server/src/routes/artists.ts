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

    const artists = await Song.aggregate([
      { $match: { userId: req.userId! } },
      { $group: { _id: '$artist', genre: { $first: '$genre' }, artwork: { $first: '$artworkUrl' }, albumCount: { $addToSet: '$album' } } },
      { $project: { _id: 1, genre: 1, artwork: 1, albumCount: { $size: '$albumCount' } } },
      { $sort: { _id: 1 } },
      { $skip: skip },
      { $limit: limitNum },
    ]);

    const total = await Song.distinct('artist', { userId: req.userId });

    res.json({
      data: {
        items: artists.map(a => ({
          id: a._id,
          name: a._id,
          genre: a.genre,
          artworkUrl: a.artwork,
          albumCount: a.albumCount,
        })),
        total: total.length,
        page: pageNum,
        limit: limitNum,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list artists' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const artistName = decodeURIComponent(req.params.id);
    const songs = await Song.find({ userId: req.userId, artist: artistName }).sort({ album: 1, trackNumber: 1 });

    if (songs.length === 0) {
      throw new AppError(404, 'Artist not found');
    }

    const albums = [...new Set(songs.map(s => s.album))];
    const first = songs[0];

    res.json({
      data: {
        id: artistName,
        name: artistName,
        genre: first.genre,
        artworkUrl: first.artworkUrl,
        albumCount: albums.length,
        albums: albums.map(albumName => {
          const albumSongs = songs.filter(s => s.album === albumName);
          return {
            id: albumName,
            name: albumName,
            artist: artistName,
            year: albumSongs[0].year,
            genre: albumSongs[0].genre,
            artworkUrl: albumSongs[0].artworkUrl,
          };
        }),
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
    res.status(500).json({ error: 'Failed to fetch artist' });
  }
});

export default router;
