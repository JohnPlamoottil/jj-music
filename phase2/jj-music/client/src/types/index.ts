/**
 * Shared API types.
 *
 * These mirror the Mongoose models the Express server will expose in Phase 2,
 * minus anything private: `storageKey`, `passwordHash` and storage credentials
 * never cross the network to the browser.
 */

export interface User {
  id: string;
  email: string;
  displayName?: string;
  createdAt: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre?: string;
  year?: number;
  trackNumber?: number;
  /** seconds */
  duration: number;
  artworkUrl: string | null;
  mimeType: string;
  /** bytes */
  fileSize: number;
  favorite: boolean;
  playCount: number;
  uploadedAt: string;
  lastPlayedAt: string | null;
}

export interface Album {
  id: string;
  name: string;
  artist: string;
  year?: number;
  artworkUrl: string | null;
  songCount: number;
  /** seconds */
  duration: number;
}

export interface Artist {
  id: string;
  name: string;
  albumCount: number;
  songCount: number;
  artworkUrl: string | null;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  artworkUrl: string | null;
  songIds: string[];
  songCount: number;
  /** seconds */
  duration: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistDetail extends Playlist {
  songs: Song[];
}

export interface HistoryEntry {
  id: string;
  songId: string;
  song: Song | null;
  playedAt: string;
}

export interface LibraryStats {
  songs: number;
  artists: number;
  albums: number;
  playlists: number;
  /** seconds */
  totalDuration: number;
}

export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export type SongSort =
  | 'title'
  | 'artist'
  | 'album'
  | 'addedAt'
  | 'recentlyPlayed'
  | 'mostPlayed';

export interface SongQuery {
  search?: string;
  sort?: SongSort;
  favorite?: boolean;
  album?: string;
  artist?: string;
  page?: number;
  limit?: number;
}

/** Metadata the client may send with an upload; the server re-reads the file. */
export interface UploadMetadata {
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: number;
  trackNumber?: number;
  duration?: number;
}

export type RepeatMode = 'off' | 'all' | 'one';
