import { Schema, model, Types } from 'mongoose';
import type { ISong } from '../types';

const songSchema = new Schema<ISong>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    artist: { type: String, required: true, index: true },
    album: { type: String, required: true, index: true },
    genre: String,
    year: Number,
    trackNumber: Number,
    duration: { type: Number, required: true },
    artworkUrl: String,
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    favorite: { type: Boolean, default: false, index: true },
    playCount: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: () => new Date() },
    lastPlayedAt: Date,
    storageKey: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

songSchema.index({ userId: 1, album: 1 });
songSchema.index({ userId: 1, artist: 1 });
songSchema.index({ userId: 1, favorite: 1 });

export const Song = model<ISong>('Song', songSchema);
