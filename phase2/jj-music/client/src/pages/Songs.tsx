import { useCallback, useEffect, useMemo, useState } from 'react';
import { Music4, Play, Search, Shuffle, Trash2, X } from 'lucide-react';
import { TopBar } from '../components/layout/TopBar';
import { SongRow } from '../components/ui/SongRow';
import { EmptyState, ErrorState, RowSkeleton } from '../components/ui/states';
import { useApiResource } from '../hooks/useApiResource';
import { useSongSync } from '../hooks/useSongCollection';
import { usePlayer } from '../context/PlayerContext';
import { songs as songsApi } from '../services/api';
import { pluralize } from '../utils/format';
import type { Song, SongSort } from '../types';

const SORTS: { value: SongSort; label: string }[] = [
  { value: 'title', label: 'Title' },
  { value: 'artist', label: 'Artist' },
  { value: 'album', label: 'Album' },
  { value: 'addedAt', label: 'Date added' },
  { value: 'recentlyPlayed', label: 'Recently played' },
  { value: 'mostPlayed', label: 'Most played' },
];

export function Songs() {
  const { playNow, toggleShuffle, shuffle } = usePlayer();

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sort, setSort] = useState<SongSort>('title');
  const [list, setList] = useState<Song[]>([]);
  const [deletingAll, setDeletingAll] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(
    (signal: AbortSignal) =>
      songsApi.list(
        {
          search: debounced || undefined,
          sort,
          limit: 500,
        },
        signal,
      ),
    [debounced, sort],
  );

  const { data, error, loading, reload } = useApiResource(load, [
    debounced,
    sort,
  ]);

  useEffect(() => {
    if (data) setList(data.items);
  }, [data]);

  useSongSync(setList);

  const total = useMemo(() => data?.total ?? 0, [data]);

  const handleDeleteAll = async () => {
    const confirmed = window.confirm(
      `Delete all ${total} songs from your library?\n\n` +
        `This removes the song records from your library.\n` +
        `Your S3 MP3 and artwork files will NOT be deleted.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingAll(true);

      const result = await songsApi.removeAll();

      setList([]);
      await reload();

      window.alert(
        `Deleted ${result.deletedCount} songs from your library.`,
      );
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : 'Failed to delete all songs.',
      );
    } finally {
      setDeletingAll(false);
    }
  };

  return (
    <>
      <TopBar title="Songs" />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim"
            aria-hidden
          />

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search titles, artists, albums, genres"
            aria-label="Search your library"
            className="h-11 w-full rounded-full border border-line bg-panel pl-10 pr-10 text-[15px]
                       placeholder:text-dim focus:border-glow"
          />

          {search && (
            <button
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 tap h-9 w-9 min-h-0 min-w-0 text-dim hover:text-chalk"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-muted">
          <span className="sr-only sm:not-sr-only">Sort by</span>

          <select
            value={sort}
            onChange={(event) =>
              setSort(event.target.value as SongSort)
            }
            className="h-11 rounded-full border border-line bg-panel px-4 text-[15px] text-chalk focus:border-glow"
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {list.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            className="btn-primary h-10 px-4 text-sm"
            onClick={() => playNow(list, 0)}
          >
            <Play className="h-4 w-4 fill-current" aria-hidden />
            Play all
          </button>

          <button
            className="btn-quiet h-10 px-4 text-sm"
            onClick={() => {
              if (!shuffle) toggleShuffle();
              playNow(
                list,
                Math.floor(Math.random() * list.length),
              );
            }}
          >
            <Shuffle className="h-4 w-4" aria-hidden />
            Shuffle
          </button>

          <button
            type="button"
            disabled={deletingAll}
            onClick={handleDeleteAll}
            className="h-10 rounded-full border border-red-500/40 px-4 text-sm font-medium text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="mr-2 inline h-4 w-4" aria-hidden />
            {deletingAll ? 'Deleting...' : 'Delete All'}
          </button>

          <span className="ml-auto text-sm text-dim">
            {pluralize(total, 'song')}
          </span>
        </div>
      )}

      {loading && !list.length && <RowSkeleton />}

      {error && (
        <ErrorState
          message={error}
          onRetry={reload}
        />
      )}

      {!loading && !error && !list.length && debounced && (
        <EmptyState
          icon={Search}
          title="Nothing matched that search"
          body={`No song, artist, album or genre in your library matches "${debounced}". Try a shorter search.`}
        />
      )}

      {!loading && !error && !list.length && !debounced && (
        <EmptyState
          icon={Music4}
          title="No songs yet"
          body="Everything you upload lands here, sortable by title, artist, album or how often you play it."
          actionLabel="Upload music"
          actionTo="/upload"
        />
      )}

      <div className="space-y-0.5">
        {list.map((song) => (
          <SongRow
            key={song.id}
            song={song}
            context={list}
          />
        ))}
      </div>
    </>
  );
}