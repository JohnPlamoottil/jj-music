import { Schema, model, Types } from 'mongoose';
import type { IPlaylist } from '../types';

const playlistSchema = new Schema<IPlaylist>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    description: String,
    artworkUrl: String,
    songIds: [{ type: Schema.Types.ObjectId, ref: 'Song' }],
  },
  { timestamps: true }
);

playlistSchema.index({ userId: 1 });

export const Playlist = model<IPlaylist>('Playlist', playlistSchema);
