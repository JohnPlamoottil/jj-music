import type { Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

export interface ISong extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  artist: string;
  album: string;
  genre?: string;
  year?: number;
  trackNumber?: number;
  duration: number;
  artworkUrl?: string;
  mimeType: string;
  fileSize: number;
  favorite: boolean;
  playCount: number;
  uploadedAt: Date;
  lastPlayedAt?: Date;
  storageKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPlaylist extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  description?: string;
  artworkUrl?: string;
  songIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IPlaybackHistory extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  songId: Types.ObjectId;
  playedAt: Date;
  createdAt: Date;
}

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}
