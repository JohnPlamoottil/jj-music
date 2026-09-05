import { Schema, model } from 'mongoose';
import type { IPlaybackHistory } from '../types';

const playbackHistorySchema = new Schema<IPlaybackHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    songId: { type: Schema.Types.ObjectId, ref: 'Song', required: true },
    playedAt: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: false, _id: true }
);

playbackHistorySchema.index({ userId: 1, playedAt: -1 });

export const PlaybackHistory = model<IPlaybackHistory>('PlaybackHistory', playbackHistorySchema);
