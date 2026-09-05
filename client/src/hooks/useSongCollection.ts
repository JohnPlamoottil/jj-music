import { useEffect } from 'react';
import { on } from '../utils/events';
import type { Song } from '../types';

/**
 * Keeps a locally held list of songs in step with edits made elsewhere (the
 * player's heart button, the metadata editor, a delete) without refetching.
 */
export function useSongSync(
  setSongs: (updater: (current: Song[]) => Song[]) => void,
  onRemoved?: (songId: string) => void,
) {
  useEffect(() => {
    const offUpdate = on('song-updated', (song) => {
      setSongs((current) => current.map((s) => (s.id === song.id ? { ...s, ...song } : s)));
    });
    const offRemove = on('song-removed', (songId) => {
      setSongs((current) => current.filter((s) => s.id !== songId));
      onRemoved?.(songId);
    });
    return () => {
      offUpdate();
      offRemove();
    };
  }, [setSongs, onRemoved]);
}
