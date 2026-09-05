import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Song } from '../models';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';
import type { Response, NextFunction } from 'express';
import type { RequestHandler } from 'express';

const router = Router();

const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    const uploadDir = config.LOCAL_UPLOAD_DIR;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req: any, file: any, cb: any) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}-${random}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req: any, file: any, cb: any) => {
    const allowed = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/aac', 'audio/x-m4a'];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error('Invalid file type'));
      return;
    }
    cb(null, true);
  },
  limits: { fileSize: config.MAX_UPLOAD_MB * 1024 * 1024 },
});

const uploadHandler: RequestHandler = async (req: any, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError(400, 'No file provided');
    }

    const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};

    const song = new Song({
      userId: (req as AuthRequest).userId,
      title: metadata.title || req.file.originalname.replace(/\.[^.]+$/, ''),
      artist: metadata.artist || 'Unknown Artist',
      album: metadata.album || 'Uploaded Library',
      genre: metadata.genre,
      year: metadata.year,
      trackNumber: metadata.trackNumber,
      duration: metadata.duration || 0,
      artworkUrl: metadata.artworkUrl || null,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      storageKey: req.file.filename,
    });

    await song.save();

    res.status(201).json({
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
    next(err);
  }
};

router.post('/', authMiddleware, upload.single('file'), uploadHandler);

export default router;
