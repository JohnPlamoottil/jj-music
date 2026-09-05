import { Router } from 'express';
import { Song, PlaybackHistory } from '../models';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import type { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

const router = Router();
const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { q, sort = 'title', page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    let query: any = { userId: req.userId };

    if (q) {
      const searchRegex = new RegExp(String(q), 'i');
      query = {
        ...query,
        $or: [{ title: searchRegex }, { artist: searchRegex }, { album: searchRegex }],
      };
    }

    const sortMap: Record<string, any> = {
      title: { title: 1 },
      artist: { artist: 1, album: 1, trackNumber: 1 },
      album: { album: 1, trackNumber: 1 },
      recent: { uploadedAt: -1 },
      played: { lastPlayedAt: -1, uploadedAt: -1 },
      favorite: { favorite: -1, title: 1 },
    };

    const sortObj = sortMap[String(sort)] || { title: 1 };

    const [items, total] = await Promise.all([
      Song.find(query).sort(sortObj).skip(skip).limit(limitNum),
      Song.countDocuments(query),
    ]);

    res.json({
      data: {
        items: items.map(song => ({
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
        total,
        page: pageNum,
        limit: limitNum,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list songs' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const song = await Song.findOne({ _id: req.params.id, userId: req.userId });
    if (!song) {
      throw new AppError(404, 'Song not found');
    }

    res.json({
      data: {
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
    });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    res.status(500).json({ error: 'Failed to fetch song' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, artist, album, genre, year, trackNumber, artworkUrl } = req.body;

    const song = await Song.findOne({ _id: req.params.id, userId: req.userId });
    if (!song) {
      throw new AppError(404, 'Song not found');
    }

    if (title) song.title = title;
    if (artist) song.artist = artist;
    if (album) song.album = album;
    if (genre) song.genre = genre;
    if (year) song.year = year;
    if (trackNumber) song.trackNumber = trackNumber;
    if (artworkUrl !== undefined) song.artworkUrl = artworkUrl || undefined;

    await song.save();

    res.json({
      data: {
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
    });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    res.status(500).json({ error: 'Failed to update song' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const song = await Song.findOne({ _id: req.params.id, userId: req.userId });
    if (!song) {
      throw new AppError(404, 'Song not found');
    }

    await Song.deleteOne({ _id: song._id });
    res.json({ data: null });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    res.status(500).json({ error: 'Failed to delete song' });
  }
});

router.post('/:id/favorite', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { favorite } = req.body;

    const song = await Song.findOne({ _id: req.params.id, userId: req.userId });
    if (!song) {
      throw new AppError(404, 'Song not found');
    }

    song.favorite = Boolean(favorite);
    await song.save();

    res.json({
      data: {
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
    });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    res.status(500).json({ error: 'Failed to update favorite' });
  }
});

export default router;

// Stream audio file with range support
router.get('/:id/stream', authMiddleware, async (req: AuthRequest, res: Response, next) => {
  try {
    const song = await Song.findOne({ _id: req.params.id, userId: req.userId });
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    const filePath = path.join(config.LOCAL_UPLOAD_DIR, song.storageKey);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Audio file not found' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': song.mimeType || 'audio/mpeg',
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': song.mimeType || 'audio/mpeg',
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err: any) {
    next(err);
  }
});

export default router;
