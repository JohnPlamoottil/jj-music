import { useCallback } from 'react';
import { Disc3 } from 'lucide-react';
import { TopBar } from '../components/layout/TopBar';
import { MediaCard } from '../components/ui/MediaCard';
import { EmptyState, ErrorState, RowSkeleton } from '../components/ui/states';
import { useApiResource } from '../hooks/useApiResource';
import { albums as albumsApi, songs as songsApi } from '../services/api';
import { usePlayer } from '../context/PlayerContext';
import { pluralize } from '../utils/format';

export function Albums() {
  const { playNow } = usePlayer();
  const load = useCallback((signal: AbortSignal) => albumsApi.list(signal), []);
  const { data, error, loading, reload } = useApiResource(load, []);

  async function playAlbum(name: string, artist: string) {
    const page = await songsApi.list({ album: name, artist, sort: 'album', limit: 200 });
    if (page.items.length) playNow(page.items, 0);
  }

  return (
    <>
      <TopBar title="Albums" />
      {loading && <RowSkeleton rows={4} />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && !data.items.length && (
        <EmptyState
          icon={Disc3}
          title="No albums yet"
          body="Albums build themselves from the album tag on your uploads. Upload a few songs and they will group here."
          actionLabel="Upload music"
          actionTo="/upload"
        />
      )}
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {data?.items.map((album) => (
          <MediaCard
            key={album.id}
            to={`/albums/${album.id}`}
            title={album.name}
            subtitle={`${album.artist} · ${pluralize(album.songCount, 'song')}`}
            artworkUrl={album.artworkUrl}
            seed={album.name}
            onPlay={() => playAlbum(album.name, album.artist)}
          />
        ))}
      </div>
    </>
  );
}
