import type { Song } from '../types';

/**
 * A tiny pub/sub for cross-screen updates. Favouriting a song from the player
 * has to be reflected in the library list behind it without either component
 * knowing the other exists, and without pulling in a state library.
 */
type Events = {
  'song-updated': Song;
  'song-removed': string;
  'library-changed': void;
  'playlists-changed': void;
};

type Handler<K extends keyof Events> = (payload: Events[K]) => void;

const listeners = new Map<keyof Events, Set<Handler<never>>>();

export function on<K extends keyof Events>(event: K, handler: Handler<K>): () => void {
  const set = listeners.get(event) ?? new Set();
  set.add(handler as Handler<never>);
  listeners.set(event, set);
  return () => set.delete(handler as Handler<never>);
}

export function emit<K extends keyof Events>(event: K, payload: Events[K]): void {
  listeners.get(event)?.forEach((handler) => (handler as Handler<K>)(payload));
}
