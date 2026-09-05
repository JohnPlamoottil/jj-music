import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Sheet } from './Sheet';
import { Artwork } from './Artwork';
import { useToast } from '../../context/ToastContext';
import { playlists as playlistsApi } from '../../services/api';
import { messageFor } from '../../services/apiError';
import { emit } from '../../utils/events';
import { pluralize } from '../../utils/format';
import type { Playlist, Song } from '../../types';

export function AddToPlaylistDialog({
  song,
  open,
  onClose,
}: {
  song: Song;
  open: boolean;
  onClose: () => void;
}) {
  const { notify } = useToast();
  const [items, setItems] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    playlistsApi
      .list()
      .then((page) => setItems(page.items))
      .catch((error) => notify(messageFor(error), 'error'))
      .finally(() => setLoading(false));
  }, [open, notify]);

  async function addTo(playlist: Playlist) {
    try {
      await playlistsApi.addSongs(playlist.id, [song.id]);
      emit('playlists-changed', undefined);
      notify(`Added to ${playlist.name}`);
      onClose();
    } catch (error) {
      notify(messageFor(error), 'error');
    }
  }

  async function createAndAdd() {
    if (!name.trim()) return;
    try {
      const playlist = await playlistsApi.create(name.trim());
      await playlistsApi.addSongs(playlist.id, [song.id]);
      emit('playlists-changed', undefined);
      notify(`Created ${playlist.name}`);
      setName('');
      setCreating(false);
      onClose();
    } catch (error) {
      notify(messageFor(error), 'error');
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add to playlist">
      {creating ? (
        <div className="space-y-3">
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && createAndAdd()}
            placeholder="Playlist name"
            className="w-full rounded-lg border border-line bg-ink px-3 py-2.5 text-[15px] placeholder:text-dim focus:border-glow"
          />
          <div className="flex gap-2">
            <button className="btn-primary flex-1" onClick={createAndAdd}>
              Create and add
            </button>
            <button className="btn-quiet" onClick={() => setCreating(false)}>
              Back
            </button>
          </div>
        </div>
      ) : (
        <ul className="space-y-1">
          <li>
            <button
              onClick={() => setCreating(true)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left row-hover"
            >
              <span className="grid h-12 w-12 place-items-center rounded-lg border border-line bg-ink">
                <Plus className="h-5 w-5 text-glow" aria-hidden />
              </span>
              New playlist
            </button>
          </li>
          {loading && <li className="px-2 py-3 text-sm text-muted">Loading playlists</li>}
          {items.map((playlist) => (
            <li key={playlist.id}>
              <button
                onClick={() => addTo(playlist)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left row-hover"
              >
                <Artwork src={playlist.artworkUrl} seed={playlist.name} className="h-12 w-12" />
                <span className="min-w-0">
                  <span className="block truncate">{playlist.name}</span>
                  <span className="block text-sm text-muted">{pluralize(playlist.songCount, 'song')}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
