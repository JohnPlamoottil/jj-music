import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Shuffle } from 'lucide-react';
import { TopBar } from '../components/layout/TopBar';
import { Artwork } from '../components/ui/Artwork';
import { MediaCard } from '../components/ui/MediaCard';
import { SectionHeader } from '../components/ui/SectionHeader';
import { SongRow } from '../components/ui/SongRow';
import { ErrorState, RowSkeleton } from '../components/ui/states';
import { useApiResource } from '../hooks/useApiResource';
import { useSongSync } from '../hooks/useSongCollection';
import { usePlayer } from '../context/PlayerContext';
import { artists as artistsApi } from '../services/api';
import { pluralize } from '../utils/format';
import type { Song } from '../types';

export function ArtistDetail() {
  const { artistId = '' } = useParams();
  const { playNow, toggleShuffle, shuffle } = usePlayer();
  const [songs, setSongs] = useState<Song[]>([]);

  const load = useCallback((signal: AbortSignal) => artistsApi.get(artistId, signal), [artistId]);
  const { data, error, loading, reload } = useApiResource(load, [artistId]);

  useEffect(() => {
    if (data) setSongs(data.songs);
  }, [data]);
  useSongSync(setSongs);

  if (loading) {
    return (
      <>
        <TopBar title="Artist" showBack />
        <RowSkeleton />
      </>
    );
  }
  if (error || !data) {
    return (
      <>
        <TopBar title="Artist" showBack />
        <ErrorState message={error ?? 'Artist not found.'} onRetry={reload} />
      </>
    );
  }

  return (
    <>
      <TopBar title={data.name} showBack />

      <header className="mb-9 flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
        <Artwork
          src={data.artworkUrl}
          seed={data.name}
          alt=""
          className="h-36 w-36 shadow-lift"
          rounded="rounded-full"
        />
        <div>
          <h2 className="text-3xl sm:text-5xl">{data.name}</h2>
          <p className="mt-1 text-[13px] text-dim">
            {pluralize(data.albumCount, 'album')} · {pluralize(data.songCount, 'song')}
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

      {data.albums.length > 0 && (
        <section className="mb-10">
          <SectionHeader title="Albums" />
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-5">
            {data.albums.map((album) => (
              <MediaCard
                key={album.id}
                to={`/albums/${album.id}`}
                title={album.name}
                subtitle={album.year ? String(album.year) : pluralize(album.songCount, 'song')}
                artworkUrl={album.artworkUrl}
                seed={album.name}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeader title="Songs" />
        <div className="space-y-0.5">
          {songs.map((song) => (
            <SongRow key={song.id} song={song} context={songs} />
          ))}
        </div>
      </section>
    </>
  );
}
