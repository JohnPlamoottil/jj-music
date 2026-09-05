import { request, buildPath, USE_MOCK_API } from './http';
import { ApiError } from './apiError';
import { mockAudioUrl, mockUpload } from './mockApi';
import { demoToneUrl } from './demoAudio';
import type {
  Album,
  Artist,
  HistoryEntry,
  LibraryStats,
  Page,
  Playlist,
  PlaylistDetail,
  Song,
  SongQuery,
  UploadMetadata,
  User,
} from '../types';

export interface AlbumDetail extends Album {
  songs: Song[];
}
export interface ArtistDetail extends Artist {
  albums: Album[];
  songs: Song[];
}

export const auth = {
  me: () => request<User>('/api/auth/me'),
  login: (email: string, password: string) =>
    request<User>('/api/auth/login', { method: 'POST', body: { email, password } }),
  register: (email: string, password: string) =>
    request<User>('/api/auth/register', { method: 'POST', body: { email, password } }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
};

export const songs = {
  list: (query: SongQuery = {}, signal?: AbortSignal) =>
    request<Page<Song>>('/api/songs', { query: { ...query }, signal }),
  get: (id: string) => request<Song>(`/api/songs/${id}`),
  update: (id: string, patch: Partial<Song>) =>
    request<Song>(`/api/songs/${id}`, { method: 'PUT', body: patch }),
  remove: (id: string) => request<void>(`/api/songs/${id}`, { method: 'DELETE' }),
  setFavorite: (id: string, favorite: boolean) =>
    request<Song>(`/api/songs/${id}/favorite`, { method: 'POST', body: { favorite } }),
};

export const albums = {
  list: (signal?: AbortSignal) => request<Page<Album>>('/api/albums', { signal }),
  get: (id: string, signal?: AbortSignal) => request<AlbumDetail>(`/api/albums/${encodeURIComponent(id)}`, { signal }),
};

export const artists = {
  list: (signal?: AbortSignal) => request<Page<Artist>>('/api/artists', { signal }),
  get: (id: string, signal?: AbortSignal) => request<ArtistDetail>(`/api/artists/${encodeURIComponent(id)}`, { signal }),
};

export const playlists = {
  list: (signal?: AbortSignal) => request<Page<Playlist>>('/api/playlists', { signal }),
  get: (id: string, signal?: AbortSignal) => request<PlaylistDetail>(`/api/playlists/${id}`, { signal }),
  create: (name: string, description?: string) =>
    request<Playlist>('/api/playlists', { method: 'POST', body: { name, description } }),
  update: (id: string, patch: { name?: string; description?: string; songIds?: string[] }) =>
    request<Playlist>(`/api/playlists/${id}`, { method: 'PUT', body: patch }),
  remove: (id: string) => request<void>(`/api/playlists/${id}`, { method: 'DELETE' }),
  addSongs: (id: string, songIds: string[]) =>
    request<Playlist>(`/api/playlists/${id}/songs`, { method: 'POST', body: { songIds } }),
  removeSong: (id: string, songId: string) =>
    request<Playlist>(`/api/playlists/${id}/songs/${songId}`, { method: 'DELETE' }),
  reorder: (id: string, songIds: string[]) =>
    request<Playlist>(`/api/playlists/${id}`, { method: 'PUT', body: { songIds } }),
};

export const history = {
  list: (page = 1, limit = 50, signal?: AbortSignal) =>
    request<Page<HistoryEntry>>('/api/history', { query: { page, limit }, signal }),
  record: (songId: string) =>
    request<HistoryEntry>('/api/history', { method: 'POST', body: { songId } }),
};

export const library = {
  stats: (signal?: AbortSignal) => request<LibraryStats>('/api/stats', { signal }),
};

/**
 * The <audio> src for a song.
 *
 * In production this is an authenticated endpoint on our own origin: the
 * browser sends the session cookie, the server checks ownership and streams the
 * bytes with HTTP range support (Phase 5). Storage keys and signed URLs are
 * never handed to the client.
 */
export function streamUrl(song: Song): string {
  if (USE_MOCK_API) {
    return mockAudioUrl(song.id) ?? demoToneUrl(song.id, song.duration);
  }
  return buildPath(`/api/songs/${song.id}/stream`);
}

export interface UploadHandle {
  promise: Promise<Song>;
  cancel: () => void;
}

/**
 * Real multipart upload with progress. XHR rather than fetch because fetch
 * still has no upload progress event in Safari.
 */
export function uploadSong(
  file: File,
  metadata: UploadMetadata & { artworkFile?: File | null },
  onProgress: (percent: number) => void,
): UploadHandle {
  if (USE_MOCK_API) {
    const controller = new AbortController();
    return {
      promise: mockUpload(file, metadata as Record<string, unknown>, onProgress, controller.signal),
      cancel: () => controller.abort(),
    };
  }

  const form = new FormData();
  form.append('audio', file, file.name);
  if (metadata.artworkFile) form.append('artwork', metadata.artworkFile);
  for (const [key, value] of Object.entries(metadata)) {
    if (key === 'artworkFile' || value === undefined || value === null || value === '') continue;
    form.append(key, String(value));
  }

  const xhr = new XMLHttpRequest();
  const promise = new Promise<Song>((resolve, reject) => {
    xhr.open('POST', '/api/upload');
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      let payload: any = null;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON error page */
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve((payload?.data ?? payload) as Song);
      } else if (xhr.status === 413) {
        reject(new ApiError('That file is larger than the upload limit.', 413, 'too_large'));
      } else if (xhr.status === 401) {
        reject(new ApiError('Your session ended. Sign in and try again.', 401, 'unauthorized'));
      } else {
        reject(new ApiError(payload?.message ?? 'Upload failed.', xhr.status, 'server'));
      }
    };
    xhr.onerror = () => reject(new ApiError('Lost connection during upload.', 0, 'network'));
    xhr.onabort = () => reject(new ApiError('Upload cancelled.', 0, 'validation'));
    xhr.send(form);
  });

  return { promise, cancel: () => xhr.abort() };
}
