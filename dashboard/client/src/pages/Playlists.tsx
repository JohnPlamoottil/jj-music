import { useCallback, useEffect, useState } from 'react';
import { ListMusic, Plus } from 'lucide-react';
import { TopBar } from '../components/layout/TopBar';
import { MediaCard } from '../components/ui/MediaCard';
import { Sheet } from '../components/ui/Sheet';
import { EmptyState, ErrorState, RowSkeleton } from '../components/ui/states';
import { useApiResource } from '../hooks/useApiResource';
import { useToast } from '../context/ToastContext';
import { playlists as playlistsApi } from '../services/api';
import { messageFor } from '../services/apiError';
import { on } from '../utils/events';
import { pluralize } from '../utils/format';

export function Playlists() {
  const { notify } = useToast();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [nonce, setNonce] = useState(0);

  useEffect(() => on('playlists-changed', () => setNonce((n) => n + 1)), []);

  const load = useCallback((signal: AbortSignal) => playlistsApi.list(signal), []);
  const { data, error, loading, reload } = useApiResource(load, [nonce]);

  async function create() {
    if (!name.trim()) return;
    try {
      await playlistsApi.create(name.trim());
      setName('');
      setCreating(false);
      notify('Playlist created');
      reload();
    } catch (err) {
      notify(messageFor(err), 'error');
    }
  }

  return (
    <>
      <TopBar title="Playlists" />

      <div className="mb-5">
        <button className="btn-quiet h-10 px-4 text-sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" aria-hidden />
          New playlist
        </button>
      </div>

      {loading && <RowSkeleton rows={3} />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && !data.items.length && (
        <EmptyState
          icon={ListMusic}
          title="No playlists yet"
          body="Group songs however you like — a drive, a mood, a record you keep coming back to."
          actionLabel="Create your first playlist"
          onAction={() => setCreating(true)}
        />
      )}

      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {data?.items.map((playlist) => (
          <MediaCard
            key={playlist.id}
            to={`/playlists/${playlist.id}`}
            title={playlist.name}
            subtitle={pluralize(playlist.songCount, 'song')}
            artworkUrl={playlist.artworkUrl}
            seed={playlist.name}
          />
        ))}
      </div>

      <Sheet open={creating} onClose={() => setCreating(false)} title="New playlist">
        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && create()}
          placeholder="Playlist name"
          aria-label="Playlist name"
          className="w-full rounded-lg border border-line bg-ink px-3 py-2.5 text-[15px] placeholder:text-dim focus:border-glow"
        />
        <div className="mt-4 flex gap-2">
          <button className="btn-primary flex-1" onClick={create}>
            Create playlist
          </button>
          <button className="btn-quiet" onClick={() => setCreating(false)}>
            Cancel
          </button>
        </div>
      </Sheet>
    </>
  );
}
