import { Router } from 'express';
import { Playlist, Song } from '../models';
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

    const [playlists, total] = await Promise.all([
      Playlist.find({ userId: req.userId }).sort({ name: 1 }).skip(skip).limit(limitNum),
      Playlist.countDocuments({ userId: req.userId }),
    ]);

    res.json({
      data: {
        items: playlists.map(pl => ({
          id: pl._id.toString(),
          name: pl.name,
          description: pl.description || '',
          artworkUrl: pl.artworkUrl,
          songCount: pl.songIds.length,
          duration: 0,
          createdAt: pl.createdAt.toISOString(),
          updatedAt: pl.updatedAt.toISOString(),
        })),
        total,
        page: pageNum,
        limit: limitNum,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list playlists' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const playlist = await Playlist.findOne({ _id: req.params.id, userId: req.userId });
    if (!playlist) {
      throw new AppError(404, 'Playlist not found');
    }

    const songs = await Song.find({ _id: { $in: playlist.songIds } });
    const songMap = Object.fromEntries(songs.map(s => [s._id.toString(), s]));
    const orderedSongs = playlist.songIds.map(id => songMap[id.toString()]).filter(Boolean);

    res.json({
      data: {
        id: playlist._id.toString(),
        name: playlist.name,
        description: playlist.description || '',
        artworkUrl: playlist.artworkUrl,
        songCount: playlist.songIds.length,
        duration: 0,
        createdAt: playlist.createdAt.toISOString(),
        updatedAt: playlist.updatedAt.toISOString(),
        songs: orderedSongs.map(song => ({
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
    res.status(500).json({ error: 'Failed to fetch playlist' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      throw new AppError(400, 'Name required');
    }

    const playlist = new Playlist({
      userId: req.userId,
      name,
      description: description || '',
      songIds: [],
    });

    await playlist.save();

    res.status(201).json({
      data: {
        id: playlist._id.toString(),
        name: playlist.name,
        description: playlist.description || '',
        artworkUrl: playlist.artworkUrl,
        songCount: 0,
        duration: 0,
        createdAt: playlist.createdAt.toISOString(),
        updatedAt: playlist.updatedAt.toISOString(),
      },
    });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, songIds } = req.body;
    const playlist = await Playlist.findOne({ _id: req.params.id, userId: req.userId });
    if (!playlist) {
      throw new AppError(404, 'Playlist not found');
    }

    if (name) playlist.name = name;
    if (description !== undefined) playlist.description = description;
    if (songIds) playlist.songIds = songIds.map((id: string) => id);

    await playlist.save();

    const songs = await Song.find({ _id: { $in: playlist.songIds } });
    const songMap = Object.fromEntries(songs.map(s => [s._id.toString(), s]));
    const orderedSongs = playlist.songIds.map(id => songMap[id.toString()]).filter(Boolean);

    res.json({
      data: {
        id: playlist._id.toString(),
        name: playlist.name,
        description: playlist.description || '',
        artworkUrl: playlist.artworkUrl,
        songCount: playlist.songIds.length,
        duration: 0,
        createdAt: playlist.createdAt.toISOString(),
        updatedAt: playlist.updatedAt.toISOString(),
        songs: orderedSongs.map(song => ({
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
    res.status(500).json({ error: 'Failed to update playlist' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const playlist = await Playlist.findOne({ _id: req.params.id, userId: req.userId });
    if (!playlist) {
      throw new AppError(404, 'Playlist not found');
    }

    await Playlist.deleteOne({ _id: playlist._id });
    res.json({ data: null });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

router.post('/:id/songs', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { songIds } = req.body;
    if (!Array.isArray(songIds)) {
      throw new AppError(400, 'songIds must be an array');
    }

    const playlist = await Playlist.findOne({ _id: req.params.id, userId: req.userId });
    if (!playlist) {
      throw new AppError(404, 'Playlist not found');
    }

    const newIds = songIds.filter((id: string) => !playlist.songIds.some(existingId => existingId.toString() === id));
    playlist.songIds.push(...newIds);
    await playlist.save();

    const songs = await Song.find({ _id: { $in: playlist.songIds } });
    const songMap = Object.fromEntries(songs.map(s => [s._id.toString(), s]));
    const orderedSongs = playlist.songIds.map(id => songMap[id.toString()]).filter(Boolean);

    res.json({
      data: {
        id: playlist._id.toString(),
        name: playlist.name,
        description: playlist.description || '',
        artworkUrl: playlist.artworkUrl,
        songCount: playlist.songIds.length,
        duration: 0,
        createdAt: playlist.createdAt.toISOString(),
        updatedAt: playlist.updatedAt.toISOString(),
        songs: orderedSongs.map(song => ({
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
    res.status(500).json({ error: 'Failed to add songs to playlist' });
  }
});

router.delete('/:id/songs/:songId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const playlist = await Playlist.findOne({ _id: req.params.id, userId: req.userId });
    if (!playlist) {
      throw new AppError(404, 'Playlist not found');
    }

    playlist.songIds = playlist.songIds.filter(id => id.toString() !== req.params.songId);
    await playlist.save();

    const songs = await Song.find({ _id: { $in: playlist.songIds } });
    const songMap = Object.fromEntries(songs.map(s => [s._id.toString(), s]));
    const orderedSongs = playlist.songIds.map(id => songMap[id.toString()]).filter(Boolean);

    res.json({
      data: {
        id: playlist._id.toString(),
        name: playlist.name,
        description: playlist.description || '',
        artworkUrl: playlist.artworkUrl,
        songCount: playlist.songIds.length,
        duration: 0,
        createdAt: playlist.createdAt.toISOString(),
        updatedAt: playlist.updatedAt.toISOString(),
        songs: orderedSongs.map(song => ({
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
    res.status(500).json({ error: 'Failed to remove song from playlist' });
  }
});

export default router;
