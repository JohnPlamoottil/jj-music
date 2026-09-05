import { useCallback } from 'react';
import { Clock } from 'lucide-react';
import { TopBar } from '../components/layout/TopBar';
import { Artwork } from '../components/ui/Artwork';
import { EmptyState, ErrorState, RowSkeleton } from '../components/ui/states';
import { useApiResource } from '../hooks/useApiResource';
import { usePlayer } from '../context/PlayerContext';
import { history } from '../services/api';
import { formatRelativeDate, pluralize } from '../utils/format';
import type { Song } from '../types';

export function RecentlyPlayed() {
  const { playSong } = usePlayer();
  const load = useCallback((signal: AbortSignal) => history.list(1, 100, signal), []);
  const { data, error, loading, reload } = useApiResource(load, []);

  const entries = (data?.items ?? []).filter((entry) => entry.song);
  const songs = entries.map((entry) => entry.song) as Song[];

  return (
    <>
      <TopBar title="Recently played" />
      {loading && <RowSkeleton />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && !entries.length && (
        <EmptyState
          icon={Clock}
          title="Nothing played yet"
          body="Once you play something, the last few hundred listens show up here with play counts."
          actionLabel="Browse your songs"
          actionTo="/songs"
        />
      )}

      <ol className="space-y-0.5">
        {entries.map((entry, index) => {
          const song = entry.song!;
          return (
            <li key={entry.id}>
              <button
                onClick={() => playSong(song, songs)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left row-hover"
              >
                <Artwork src={song.artworkUrl} seed={song.album} className="h-12 w-12" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px]">{song.title}</span>
                  <span className="block truncate text-[13px] text-muted">
                    {song.artist} · {pluralize(song.playCount, 'play')}
                  </span>
                </span>
                <span className="shrink-0 text-[13px] text-dim">{formatRelativeDate(entry.playedAt)}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </>
  );
}
