import { ApiError } from './apiError';
import itunesLibrary from './itunesLibrary.generated.json';
import type {
  Album,
  Artist,
  HistoryEntry,
  LibraryStats,
  Page,
  Playlist,
  PlaylistDetail,
  Song,
  SongSort,
  User,
} from '../types';

/**
 * A stand-in for the Express server, for Phase 1 only.
 *
 * It implements the same routes, the same query parameters and the same
 * response shapes as the real API, so every page and hook in the app is written
 * against the finished contract. Phase 3 sets VITE_USE_MOCK_API=false and this
 * file stops being loaded; Phase 4 deletes it.
 *
 * Library edits (favourites, playlists, metadata) persist in localStorage.
 * Audio you upload while in mock mode lives in memory for the session only.
 */

const STORE_KEY = 'jj-music.mock.v3';
const LATENCY = 180;

type SeedLibrary = {
  songs: Song[];
  playlists: Playlist[];
};

interface Store {
  user: User | null;
  songs: Song[];
  playlists: Playlist[];
  history: HistoryEntry[];
}

/** Object URLs for files uploaded during a mock session. Not persisted. */
const sessionAudio = new Map<string, string>();

const now = Date.now();
const daysAgo = (n: number) => new Date(now - n * 86_400_000).toISOString();

let seq = 0;
const id = (prefix: string) => `${prefix}_${(++seq).toString(36)}${Date.now().toString(36)}`;

function seedStore(): Store {
  const { songs, playlists } = itunesLibrary as SeedLibrary;

  const history: HistoryEntry[] = songs
    .filter((s) => s.lastPlayedAt)
    .sort((a, b) => (b.lastPlayedAt! > a.lastPlayedAt! ? 1 : -1))
    .map((s) => ({ id: id('hist'), songId: s.id, song: null, playedAt: s.lastPlayedAt! }));

  return {
    user: { id: 'user_seed', email: 'you@example.com', displayName: 'JJ', createdAt: daysAgo(200) },
    songs,
    playlists,
    history,
  };
}

function load(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as Store;
  } catch {
    /* fall through to a fresh seed */
  }
  const fresh = seedStore();
  save(fresh);
  return fresh;
}

function save(store: Store) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* storage full or blocked — the session still works in memory */
  }
}

let store = load();

export function resetMockLibrary() {
  store = seedStore();
  save(store);
}

const sum = (songs: Song[]) => songs.reduce((total, s) => total + s.duration, 0);

function paginate<T>(items: T[], page: number, limit: number): Page<T> {
  const start = (page - 1) * limit;
  const slice = items.slice(start, start + limit);
  return { items: slice, page, limit, total: items.length, hasMore: start + slice.length < items.length };
}

function sortSongs(songs: Song[], sort: SongSort): Song[] {
  const by = [...songs];
  const text = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });
  switch (sort) {
    case 'artist':
      return by.sort((a, b) => text(a.artist, b.artist) || text(a.album, b.album) || (a.trackNumber ?? 0) - (b.trackNumber ?? 0));
    case 'album':
      return by.sort((a, b) => text(a.album, b.album) || (a.trackNumber ?? 0) - (b.trackNumber ?? 0));
    case 'addedAt':
      return by.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    case 'recentlyPlayed':
      return by.sort((a, b) => (b.lastPlayedAt ?? '').localeCompare(a.lastPlayedAt ?? ''));
    case 'mostPlayed':
      return by.sort((a, b) => b.playCount - a.playCount || text(a.title, b.title));
    default:
      return by.sort((a, b) => text(a.title, b.title));
  }
}

function requireSong(songId: string): Song {
  const song = store.songs.find((s) => s.id === songId);
  if (!song) throw new ApiError('Song not found.', 404, 'not_found');
  return song;
}

function decorate(playlist: Playlist): Playlist {
  const songs = playlist.songIds.map((sid) => store.songs.find((s) => s.id === sid)).filter(Boolean) as Song[];
  return { ...playlist, songCount: songs.length, duration: sum(songs) };
}

function albums(): Album[] {
  const map = new Map<string, Song[]>();
  for (const song of store.songs) {
    const key = `${song.album}\u0000${song.artist}`;
    const list = map.get(key);
    if (list) list.push(song);
    else map.set(key, [song]);
  }
  return [...map.entries()]
    .map(([key, songs]) => {
      const [name, artist] = key.split('\u0000');
      return {
        id: encodeURIComponent(`${name}|${artist}`),
        name,
        artist,
        year: songs[0].year,
        artworkUrl: songs.find((s) => s.artworkUrl)?.artworkUrl ?? null,
        songCount: songs.length,
        duration: sum(songs),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function artists(): Artist[] {
  const map = new Map<string, Song[]>();
  for (const song of store.songs) {
    const list = map.get(song.artist);
    if (list) list.push(song);
    else map.set(song.artist, [song]);
  }
  return [...map.entries()]
    .map(([name, songs]) => ({
      id: encodeURIComponent(name),
      name,
      albumCount: new Set(songs.map((s) => s.album)).size,
      songCount: songs.length,
      artworkUrl: songs.find((s) => s.artworkUrl)?.artworkUrl ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function stats(): LibraryStats {
  return {
    songs: store.songs.length,
    artists: artists().length,
    albums: albums().length,
    playlists: store.playlists.length,
    totalDuration: store.songs.reduce((total, s) => total + s.duration * Math.max(1, s.playCount), 0),
  };
}

/** Object URL for a song uploaded this session, if any. */
export function mockAudioUrl(songId: string): string | null {
  return sessionAudio.get(songId) ?? null;
}

export async function mockUpload(
  file: File,
  metadata: Record<string, unknown>,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
): Promise<Song> {
  // Read the real file so progress reflects real work rather than a timer.
  await new Promise<void>((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 90));
    };
    reader.onload = () => resolve();
    reader.onerror = () => reject(new ApiError('Could not read that file.', 400, 'validation'));
    signal?.addEventListener('abort', () => reader.abort());
    reader.readAsArrayBuffer(file);
  });

  const songId = id('song');
  sessionAudio.set(songId, URL.createObjectURL(file));

  const song: Song = {
    id: songId,
    title: String(metadata.title || file.name.replace(/\.[^.]+$/, '')),
    artist: String(metadata.artist || 'Unknown artist'),
    album: String(metadata.album || 'Unknown album'),
    genre: metadata.genre ? String(metadata.genre) : undefined,
    year: metadata.year ? Number(metadata.year) : undefined,
    trackNumber: metadata.trackNumber ? Number(metadata.trackNumber) : undefined,
    duration: Number(metadata.duration) || 0,
    artworkUrl: (metadata.artworkUrl as string) ?? null,
    mimeType: file.type || 'audio/mpeg',
    fileSize: file.size,
    favorite: false,
    playCount: 0,
    uploadedAt: new Date().toISOString(),
    lastPlayedAt: null,
  };

  store.songs.unshift(song);
  save(store);
  onProgress(100);
  return song;
}

type Body = Record<string, any> | undefined;

export async function mockRequest<T>(method: string, url: string, body?: unknown): Promise<T> {
  await new Promise((r) => setTimeout(r, LATENCY));
  const parsed = new URL(url, window.location.origin);
  const path = parsed.pathname.replace(/\/+$/, '');
  const q = parsed.searchParams;
  const data = body as Body;
  const segments = path.split('/').filter(Boolean); // ['api', 'songs', ':id', ...]
  const [, resource, first, second, third] = segments;
  const key = `${method} ${resource}`;

  // --- auth ---------------------------------------------------------------
  if (resource === 'auth') {
    if (first === 'me') {
      if (!store.user) throw new ApiError('Not signed in.', 401, 'unauthorized');
      return store.user as T;
    }
    if (first === 'login' || first === 'register') {
      const email = String(data?.email ?? '').trim();
      if (!email || !data?.password) throw new ApiError('Enter your email and password.', 400, 'validation');
      store.user = { id: 'user_seed', email, displayName: email.split('@')[0], createdAt: new Date().toISOString() };
      save(store);
      return store.user as T;
    }
    if (first === 'logout') {
      store.user = null;
      save(store);
      return undefined as T;
    }
  }

  // --- songs --------------------------------------------------------------
  if (resource === 'songs') {
    if (method === 'GET' && !first) {
      const search = (q.get('search') ?? '').toLowerCase();
      let list = store.songs;
      if (search) {
        list = list.filter((s) =>
          [s.title, s.artist, s.album, s.genre ?? ''].some((field) => field.toLowerCase().includes(search)),
        );
      }
      if (q.get('favorite') === 'true') list = list.filter((s) => s.favorite);
      const album = q.get('album');
      if (album) list = list.filter((s) => s.album === album);
      const artist = q.get('artist');
      if (artist) list = list.filter((s) => s.artist === artist);
      const sorted = sortSongs(list, (q.get('sort') as SongSort) || 'title');
      return paginate(sorted, Number(q.get('page') ?? 1), Number(q.get('limit') ?? 100)) as T;
    }
    if (method === 'GET' && first && !second) return requireSong(first) as T;
    if (method === 'PUT' && first) {
      const song = requireSong(first);
      Object.assign(song, {
        title: data?.title ?? song.title,
        artist: data?.artist ?? song.artist,
        album: data?.album ?? song.album,
        genre: data?.genre ?? song.genre,
        year: data?.year ?? song.year,
        trackNumber: data?.trackNumber ?? song.trackNumber,
        artworkUrl: data?.artworkUrl !== undefined ? data.artworkUrl : song.artworkUrl,
      });
      save(store);
      return song as T;
    }
    if (method === 'DELETE' && first) {
      store.songs = store.songs.filter((s) => s.id !== first);
      store.playlists = store.playlists.map((p) => ({ ...p, songIds: p.songIds.filter((sid) => sid !== first) }));
      store.history = store.history.filter((h) => h.songId !== first);
      save(store);
      return undefined as T;
    }
    if (method === 'POST' && second === 'favorite') {
      const song = requireSong(first);
      song.favorite = data?.favorite ?? !song.favorite;
      save(store);
      return song as T;
    }
  }

  // --- derived collections -------------------------------------------------
  if (key === 'GET albums') {
    if (!first) return paginate(albums(), Number(q.get('page') ?? 1), Number(q.get('limit') ?? 100)) as T;
    const [name, artist] = decodeURIComponent(first).split('|');
    const album = albums().find((a) => a.name === name && a.artist === artist);
    if (!album) throw new ApiError('Album not found.', 404, 'not_found');
    const songs = sortSongs(
      store.songs.filter((s) => s.album === name && s.artist === artist),
      'album',
    );
    return { ...album, songs } as T;
  }

  if (key === 'GET artists') {
    if (!first) return paginate(artists(), Number(q.get('page') ?? 1), Number(q.get('limit') ?? 100)) as T;
    const name = decodeURIComponent(first);
    const artist = artists().find((a) => a.name === name);
    if (!artist) throw new ApiError('Artist not found.', 404, 'not_found');
    const songs = store.songs.filter((s) => s.artist === name);
    return {
      ...artist,
      albums: albums().filter((a) => a.artist === name),
      songs: sortSongs(songs, 'album'),
    } as T;
  }

  // --- playlists -----------------------------------------------------------
  if (resource === 'playlists') {
    if (method === 'GET' && !first) {
      return paginate(store.playlists.map(decorate), Number(q.get('page') ?? 1), Number(q.get('limit') ?? 100)) as T;
    }
    if (method === 'POST' && !first) {
      const name = String(data?.name ?? '').trim();
      if (!name) throw new ApiError('Give the playlist a name.', 400, 'validation');
      const playlist: Playlist = {
        id: id('pl'),
        name,
        description: data?.description ?? '',
        artworkUrl: null,
        songIds: [],
        songCount: 0,
        duration: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.playlists.unshift(playlist);
      save(store);
      return playlist as T;
    }
    const playlist = first ? store.playlists.find((p) => p.id === first) : undefined;
    if (first && !playlist) throw new ApiError('Playlist not found.', 404, 'not_found');

    if (method === 'GET' && playlist) {
      const songs = playlist.songIds.map((sid) => store.songs.find((s) => s.id === sid)).filter(Boolean) as Song[];
      const detail: PlaylistDetail = { ...decorate(playlist), songs };
      return detail as T;
    }
    if (method === 'PUT' && playlist && !second) {
      if (data?.name !== undefined) playlist.name = String(data.name).trim() || playlist.name;
      if (data?.description !== undefined) playlist.description = data.description;
      if (Array.isArray(data?.songIds)) playlist.songIds = data.songIds;
      playlist.updatedAt = new Date().toISOString();
      save(store);
      return decorate(playlist) as T;
    }
    if (method === 'DELETE' && playlist && !second) {
      store.playlists = store.playlists.filter((p) => p.id !== playlist.id);
      save(store);
      return undefined as T;
    }
    if (method === 'POST' && playlist && second === 'songs') {
      const incoming: string[] = data?.songIds ?? (data?.songId ? [data.songId] : []);
      for (const sid of incoming) if (!playlist.songIds.includes(sid)) playlist.songIds.push(sid);
      playlist.updatedAt = new Date().toISOString();
      save(store);
      return decorate(playlist) as T;
    }
    if (method === 'DELETE' && playlist && second === 'songs' && third) {
      playlist.songIds = playlist.songIds.filter((sid) => sid !== third);
      playlist.updatedAt = new Date().toISOString();
      save(store);
      return decorate(playlist) as T;
    }
  }

  // --- history & stats -----------------------------------------------------
  if (key === 'GET history') {
    const entries = store.history
      .slice()
      .sort((a, b) => b.playedAt.localeCompare(a.playedAt))
      .map((h) => ({ ...h, song: store.songs.find((s) => s.id === h.songId) ?? null }));
    return paginate(entries, Number(q.get('page') ?? 1), Number(q.get('limit') ?? 50)) as T;
  }
  if (key === 'POST history') {
    const song = requireSong(String(data?.songId));
    song.playCount += 1;
    song.lastPlayedAt = new Date().toISOString();
    store.history.unshift({ id: id('hist'), songId: song.id, song: null, playedAt: song.lastPlayedAt });
    store.history = store.history.slice(0, 300);
    save(store);
    return { id: store.history[0].id, songId: song.id, song, playedAt: song.lastPlayedAt } as T;
  }
  if (key === 'GET stats') return stats() as T;

  throw new ApiError(`No mock handler for ${method} ${path}`, 404, 'not_found');
}
