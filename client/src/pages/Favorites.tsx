import { useCallback, useEffect, useState } from 'react';
import { Heart, Play, Shuffle } from 'lucide-react';
import { TopBar } from '../components/layout/TopBar';
import { SongRow } from '../components/ui/SongRow';
import { EmptyState, ErrorState, RowSkeleton } from '../components/ui/states';
import { useApiResource } from '../hooks/useApiResource';
import { useSongSync } from '../hooks/useSongCollection';
import { usePlayer } from '../context/PlayerContext';
import { songs as songsApi } from '../services/api';
import { on } from '../utils/events';
import { pluralize } from '../utils/format';
import type { Song } from '../types';

export function Favorites() {
  const { playNow, toggleShuffle, shuffle } = usePlayer();
  const [list, setList] = useState<Song[]>([]);
  const [nonce, setNonce] = useState(0);

  // A song un-hearted from the player should leave this screen straight away.
  useEffect(() => on('song-updated', () => setNonce((n) => n + 1)), []);

  const load = useCallback(
    (signal: AbortSignal) => songsApi.list({ favorite: true, sort: 'artist', limit: 500 }, signal),
    [],
  );
  const { data, error, loading, reload } = useApiResource(load, [nonce]);

  useEffect(() => {
    if (data) setList(data.items);
  }, [data]);
  useSongSync(setList);

  return (
    <>
      <TopBar title="Favourites" />

      {loading && !list.length && <RowSkeleton />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {!loading && !error && !list.length && (
        <EmptyState
          icon={Heart}
          title="No favourites yet"
          body="Tap the heart on any song and it collects here, ready to play as one list."
          actionLabel="Browse your songs"
          actionTo="/songs"
        />
      )}

      {list.length > 0 && (
        <>
          <div className="mb-4 flex items-center gap-2">
            <button className="btn-primary h-10 px-4 text-sm" onClick={() => playNow(list, 0)}>
              <Play className="h-4 w-4 fill-current" aria-hidden />
              Play
            </button>
            <button
              className="btn-quiet h-10 px-4 text-sm"
              onClick={() => {
                if (!shuffle) toggleShuffle();
                playNow(list, Math.floor(Math.random() * list.length));
              }}
            >
              <Shuffle className="h-4 w-4" aria-hidden />
              Shuffle
            </button>
            <span className="ml-auto text-sm text-dim">{pluralize(list.length, 'song')}</span>
          </div>
          <div className="space-y-0.5">
            {list.map((song) => (
              <SongRow key={song.id} song={song} context={list} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
