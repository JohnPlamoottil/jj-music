import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Play, Shuffle } from 'lucide-react';
import { TopBar } from '../components/layout/TopBar';
import { Artwork } from '../components/ui/Artwork';
import { SongRow } from '../components/ui/SongRow';
import { ErrorState, RowSkeleton } from '../components/ui/states';
import { useApiResource } from '../hooks/useApiResource';
import { useSongSync } from '../hooks/useSongCollection';
import { usePlayer } from '../context/PlayerContext';
import { albums as albumsApi } from '../services/api';
import { formatDuration, pluralize } from '../utils/format';
import type { Song } from '../types';

export function AlbumDetail() {
  const { albumId = '' } = useParams();
  const { playNow, toggleShuffle, shuffle } = usePlayer();
  const [songs, setSongs] = useState<Song[]>([]);

  const load = useCallback((signal: AbortSignal) => albumsApi.get(albumId, signal), [albumId]);
  const { data, error, loading, reload } = useApiResource(load, [albumId]);

  useEffect(() => {
    if (data) setSongs(data.songs);
  }, [data]);
  useSongSync(setSongs);

  if (loading) {
    return (
      <>
        <TopBar title="Album" showBack />
        <RowSkeleton />
      </>
    );
  }
  if (error || !data) {
    return (
      <>
        <TopBar title="Album" showBack />
        <ErrorState message={error ?? 'Album not found.'} onRetry={reload} />
      </>
    );
  }

  return (
    <>
      <TopBar title={data.name} showBack />

      <header className="mb-8 flex flex-col items-center gap-5 text-center sm:flex-row sm:items-end sm:text-left">
        <Artwork
          src={data.artworkUrl}
          seed={data.name}
          alt={`${data.name} artwork`}
          className="h-48 w-48 shadow-lift sm:h-56 sm:w-56"
          rounded="rounded-xl2"
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-3xl sm:text-5xl">{data.name}</h2>
          <Link to={`/artists/${encodeURIComponent(data.artist)}`} className="mt-2 inline-block text-lg text-muted hover:text-glow">
            {data.artist}
          </Link>
          <p className="mt-1 text-[13px] text-dim">
            {data.year ? `${data.year} · ` : ''}
            {pluralize(data.songCount, 'song')} · {formatDuration(data.duration)}
          </p>
          <div className="mt-5 flex justify-center gap-2 sm:justify-start">
            <button className="btn-primary" onClick={() => playNow(songs, 0)} disabled={!songs.length}>
              <Play className="h-4 w-4 fill-current" aria-hidden />
              Play
            </button>
            <button
              className="btn-quiet"
              disabled={!songs.length}
              onClick={() => {
                if (!shuffle) toggleShuffle();
                playNow(songs, Math.floor(Math.random() * songs.length));
              }}
            >
              <Shuffle className="h-4 w-4" aria-hidden />
              Shuffle
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-0.5">
        {songs.map((song, index) => (
          <SongRow
            key={song.id}
            song={song}
            context={songs}
            number={song.trackNumber ?? index + 1}
            showAlbum={false}
          />
        ))}
      </div>
    </>
  );
}
