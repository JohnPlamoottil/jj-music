import { useCallback } from 'react';
import { Users } from 'lucide-react';
import { TopBar } from '../components/layout/TopBar';
import { MediaCard } from '../components/ui/MediaCard';
import { EmptyState, ErrorState, RowSkeleton } from '../components/ui/states';
import { useApiResource } from '../hooks/useApiResource';
import { artists as artistsApi } from '../services/api';
import { pluralize } from '../utils/format';

export function Artists() {
  const load = useCallback((signal: AbortSignal) => artistsApi.list(signal), []);
  const { data, error, loading, reload } = useApiResource(load, []);

  return (
    <>
      <TopBar title="Artists" />
      {loading && <RowSkeleton rows={4} />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && !data.items.length && (
        <EmptyState
          icon={Users}
          title="No artists yet"
          body="Artists are grouped from the artist tag on your songs. Upload some music to fill this shelf."
          actionLabel="Upload music"
          actionTo="/upload"
        />
      )}
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {data?.items.map((artist) => (
          <MediaCard
            key={artist.id}
            to={`/artists/${artist.id}`}
            title={artist.name}
            subtitle={`${pluralize(artist.albumCount, 'album')} · ${pluralize(artist.songCount, 'song')}`}
            artworkUrl={artist.artworkUrl}
            seed={artist.name}
            circular
          />
        ))}
      </div>
    </>
  );
}
