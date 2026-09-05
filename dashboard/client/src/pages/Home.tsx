import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Music4, Play } from 'lucide-react';
import { TopBar } from '../components/layout/TopBar';
import { Artwork } from '../components/ui/Artwork';
import { MediaCard, Shelf, ShelfItem } from '../components/ui/MediaCard';
import { SectionHeader } from '../components/ui/SectionHeader';
import { EmptyState, ErrorState, RowSkeleton } from '../components/ui/states';
import { useApiResource } from '../hooks/useApiResource';
import { usePlayer } from '../context/PlayerContext';
import { history, library, playlists as playlistsApi, songs as songsApi } from '../services/api';
import { on } from '../utils/events';
import { formatListeningTime, pluralize } from '../utils/format';
import type { HistoryEntry, LibraryStats, Playlist, Song } from '../types';

interface HomeData {
  stats: LibraryStats;
  recentlyAdded: Song[];
  favorites: Song[];
  playlists: Playlist[];
  recent: HistoryEntry[];
}

export function Home() {
  const { playSong } = usePlayer();
  const [nonce, setNonce] = useState(0);

  useEffect(() => on('library-changed', () => setNonce((n) => n + 1)), []);

  const load = useCallback(async (signal: AbortSignal): Promise<HomeData> => {
    const [stats, added, favorites, lists, recent] = await Promise.all([
      library.stats(signal),
      songsApi.list({ sort: 'addedAt', limit: 12 }, signal),
      songsApi.list({ favorite: true, limit: 12 }, signal),
      playlistsApi.list(signal),
      history.list(1, 12, signal),
    ]);
    return {
      stats,
      recentlyAdded: added.items,
      favorites: favorites.items,
      playlists: lists.items,
      recent: recent.items,
    };
  }, []);

  const { data, error, loading, reload } = useApiResource(load, [nonce]);

  if (loading && !data) {
    return (
      <>
        <TopBar title="Home" />
        <RowSkeleton rows={4} />
      </>
    );
  }
  if (error && !data) {
    return (
      <>
        <TopBar title="Home" />
        <ErrorState message={error} onRetry={reload} />
      </>
    );
  }
  if (!data) return null;

  const { stats, recentlyAdded, favorites, playlists, recent } = data;
  const resume = recent.find((entry) => entry.song)?.song ?? recentlyAdded[0] ?? null;

  if (!stats.songs) {
    return (
      <>
        <TopBar title="Home" />
        <EmptyState
          icon={Music4}
          title="Your library is empty"
          body="Upload the music you own and it will appear here, ready to play on any device you sign in from."
          actionLabel="Upload music"
          actionTo="/upload"
        />
      </>
    );
  }

  const recentSongs = recent.map((entry) => entry.song).filter(Boolean) as Song[];

  return (
    <>
      <TopBar title="Home" />

      {resume && (
        <section className="mb-10" aria-label="Pick up where you left off">
          <div className="relative overflow-hidden rounded-xl2 border border-line bg-panel">
            <div className="flex flex-col gap-5 p-4 sm:flex-row sm:items-center sm:gap-7 sm:p-6">
              <Artwork
                src={resume.artworkUrl}
                seed={resume.album}
                className="h-40 w-40 shadow-lift sm:h-44 sm:w-44"
                rounded="rounded-xl2"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-glow">Pick up where you left off</p>
                <h2 className="mt-1 truncate text-3xl sm:text-4xl">{resume.title}</h2>
                <p className="mt-1 truncate text-muted">
                  {resume.artist} · {resume.album}
                </p>
                <p className="mt-4 text-[13px] text-dim">
                  {pluralize(stats.songs, 'song')} · {pluralize(stats.albums, 'album')} ·{' '}
                  {pluralize(stats.artists, 'artist')} · {pluralize(stats.playlists, 'playlist')} ·{' '}
                  about {formatListeningTime(stats.totalDuration)} played
                </p>
                <div className="mt-5 flex gap-2">
                  <button
                    className="btn-primary"
                    onClick={() => playSong(resume, recentSongs.length ? recentSongs : [resume])}
                  >
                    <Play className="h-4 w-4 fill-current" aria-hidden />
                    Play
                  </button>
                  <Link to="/songs" className="btn-quiet">
                    Browse everything
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {recentSongs.length > 0 && (
        <section className="mb-10">
          <SectionHeader title="Recently played" to="/recent" />
          <Shelf>
            {recentSongs.slice(0, 10).map((song, index) => (
              <ShelfItem key={`${song.id}-${index}`}>
                <MediaCard
                  to={`/albums/${encodeURIComponent(`${song.album}|${song.artist}`)}`}
                  title={song.title}
                  subtitle={song.artist}
                  artworkUrl={song.artworkUrl}
                  seed={song.album}
                  onPlay={() => playSong(song, recentSongs)}
                />
              </ShelfItem>
            ))}
          </Shelf>
        </section>
      )}

      {recentlyAdded.length > 0 && (
        <section className="mb-10">
          <SectionHeader title="Recently added" to="/songs" />
          <Shelf>
            {recentlyAdded.map((song) => (
              <ShelfItem key={song.id}>
                <MediaCard
                  to={`/albums/${encodeURIComponent(`${song.album}|${song.artist}`)}`}
                  title={song.title}
                  subtitle={song.artist}
                  artworkUrl={song.artworkUrl}
                  seed={song.album}
                  onPlay={() => playSong(song, recentlyAdded)}
                />
              </ShelfItem>
            ))}
          </Shelf>
        </section>
      )}

      {favorites.length > 0 && (
        <section className="mb-10">
          <SectionHeader title="Favourites" to="/favorites" />
          <Shelf>
            {favorites.map((song) => (
              <ShelfItem key={song.id}>
                <MediaCard
                  to={`/artists/${encodeURIComponent(song.artist)}`}
                  title={song.title}
                  subtitle={song.artist}
                  artworkUrl={song.artworkUrl}
                  seed={song.album}
                  onPlay={() => playSong(song, favorites)}
                />
              </ShelfItem>
            ))}
          </Shelf>
        </section>
      )}

      {playlists.length > 0 && (
        <section className="mb-10">
          <SectionHeader title="Playlists" to="/playlists" />
          <Shelf>
            {playlists.map((playlist) => (
              <ShelfItem key={playlist.id}>
                <MediaCard
                  to={`/playlists/${playlist.id}`}
                  title={playlist.name}
                  subtitle={pluralize(playlist.songCount, 'song')}
                  artworkUrl={playlist.artworkUrl}
                  seed={playlist.name}
                />
              </ShelfItem>
            ))}
          </Shelf>
        </section>
      )}
    </>
  );
}
