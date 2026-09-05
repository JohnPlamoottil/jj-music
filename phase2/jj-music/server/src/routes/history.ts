import { Router } from 'express';
import { PlaybackHistory, Song } from '../models';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import type { Response } from 'express';
import type { ISong } from '../types';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [entries, total] = await Promise.all([
      PlaybackHistory.find({ userId: req.userId })
        .sort({ playedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('songId'),
      PlaybackHistory.countDocuments({ userId: req.userId }),
    ]);

    res.json({
      data: {
        items: entries.map(entry => {
          const song = entry.songId as unknown as ISong;
          return {
            id: entry._id.toString(),
            songId: song._id.toString(),
            song: {
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
            },
            playedAt: entry.playedAt.toISOString(),
          };
        }),
        total,
        page: pageNum,
        limit: limitNum,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { songId } = req.body;

    const song = await Song.findOne({ _id: songId, userId: req.userId });
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    song.playCount += 1;
    song.lastPlayedAt = new Date();
    await song.save();

    const entry = new PlaybackHistory({
      userId: req.userId,
      songId,
      playedAt: new Date(),
    });

    await entry.save();
    await entry.populate('songId');

    const populatedSong = entry.songId as unknown as ISong;

    res.status(201).json({
      data: {
        id: entry._id.toString(),
        songId: populatedSong._id.toString(),
        song: {
          id: populatedSong._id.toString(),
          title: populatedSong.title,
          artist: populatedSong.artist,
          album: populatedSong.album,
          genre: populatedSong.genre,
          year: populatedSong.year,
          trackNumber: populatedSong.trackNumber,
          duration: populatedSong.duration,
          artworkUrl: populatedSong.artworkUrl,
          mimeType: populatedSong.mimeType,
          fileSize: populatedSong.fileSize,
          favorite: populatedSong.favorite,
          playCount: populatedSong.playCount,
          uploadedAt: populatedSong.uploadedAt.toISOString(),
          lastPlayedAt: populatedSong.lastPlayedAt?.toISOString() || null,
        },
        playedAt: entry.playedAt.toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record history' });
  }
});

export default router;
