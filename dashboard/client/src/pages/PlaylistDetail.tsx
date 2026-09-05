import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Pencil, Play, Shuffle, Trash2 } from 'lucide-react';
import { TopBar } from '../components/layout/TopBar';
import { Artwork } from '../components/ui/Artwork';
import { SongRow } from '../components/ui/SongRow';
import { Sheet } from '../components/ui/Sheet';
import { EmptyState, ErrorState, RowSkeleton } from '../components/ui/states';
import { useApiResource } from '../hooks/useApiResource';
import { usePlayer } from '../context/PlayerContext';
import { useToast } from '../context/ToastContext';
import { playlists as playlistsApi } from '../services/api';
import { messageFor } from '../services/apiError';
import { emit } from '../utils/events';
import { formatDuration, pluralize } from '../utils/format';
import type { Song } from '../types';

export function PlaylistDetail() {
  const { playlistId = '' } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { playNow, toggleShuffle, shuffle } = usePlayer();

  const [songs, setSongs] = useState<Song[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback((signal: AbortSignal) => playlistsApi.get(playlistId, signal), [playlistId]);
  const { data, error, loading, reload } = useApiResource(load, [playlistId]);

  useEffect(() => {
    if (!data) return;
    setSongs(data.songs);
    setName(data.name);
    setDescription(data.description ?? '');
  }, [data]);

  async function persistOrder(next: Song[]) {
    setSongs(next);
    try {
      await playlistsApi.reorder(playlistId, next.map((song) => song.id));
    } catch (err) {
      notify(messageFor(err), 'error');
      reload();
    }
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= songs.length) return;
    const next = [...songs];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    void persistOrder(next);
  }

  async function removeSong(songId: string) {
    setSongs((current) => current.filter((song) => song.id !== songId));
    try {
      await playlistsApi.removeSong(playlistId, songId);
      emit('playlists-changed', undefined);
    } catch (err) {
      notify(messageFor(err), 'error');
      reload();
    }
  }

  async function saveDetails() {
    try {
      await playlistsApi.update(playlistId, { name: name.trim(), description });
      emit('playlists-changed', undefined);
      setEditing(false);
      notify('Playlist updated');
      reload();
    } catch (err) {
      notify(messageFor(err), 'error');
    }
  }

  async function deletePlaylist() {
    try {
      await playlistsApi.remove(playlistId);
      emit('playlists-changed', undefined);
      notify('Playlist deleted');
      navigate('/playlists');
    } catch (err) {
      notify(messageFor(err), 'error');
    }
  }

  if (loading) {
    return (
      <>
        <TopBar title="Playlist" showBack />
        <RowSkeleton />
      </>
    );
  }
  if (error || !data) {
    return (
      <>
        <TopBar title="Playlist" showBack />
        <ErrorState message={error ?? 'Playlist not found.'} onRetry={reload} />
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
          alt=""
          className="h-44 w-44 shadow-lift"
          rounded="rounded-xl2"
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-3xl sm:text-5xl">{data.name}</h2>
          {data.description && <p className="mt-2 text-muted">{data.description}</p>}
          <p className="mt-1 text-[13px] text-dim">
            {pluralize(songs.length, 'song')} · {formatDuration(data.duration)}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
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
            <button className="btn-quiet" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" aria-hidden />
              Rename
            </button>
            <button className="btn-quiet text-heart" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" aria-hidden />
              Delete
            </button>
          </div>
        </div>
      </header>

      {!songs.length && (
        <EmptyState
          icon={Play}
          title="This playlist is empty"
          body="Open any song's options and choose Add to playlist to build it up."
          actionLabel="Browse your songs"
          actionTo="/songs"
        />
      )}

      <ol className="space-y-0.5">
        {songs.map((song, index) => (
          <li key={`${song.id}-${index}`} className="flex items-center gap-1">
            <div className="min-w-0 flex-1">
              <SongRow
                song={song}
                context={songs}
                number={index + 1}
                onRemoveFromPlaylist={() => removeSong(song.id)}
              />
            </div>
            <div className="hidden shrink-0 sm:flex">
              <button
                onClick={() => move(index, index - 1)}
                disabled={index === 0}
                aria-label={`Move ${song.title} up`}
                className="tap h-9 w-9 min-h-0 min-w-0 text-dim hover:text-chalk"
              >
                <ArrowUp className="h-4 w-4" aria-hidden />
              </button>
              <button
                onClick={() => move(index, index + 1)}
                disabled={index === songs.length - 1}
                aria-label={`Move ${song.title} down`}
                className="tap h-9 w-9 min-h-0 min-w-0 text-dim hover:text-chalk"
              >
                <ArrowDown className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </li>
        ))}
      </ol>

      <Sheet open={editing} onClose={() => setEditing(false)} title="Playlist details">
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-lg border border-line bg-ink px-3 py-2.5 text-[15px] focus:border-glow"
          />
        </label>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm text-muted">Description</span>
          <textarea
            value={description}
            rows={3}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full resize-none rounded-lg border border-line bg-ink px-3 py-2.5 text-[15px] focus:border-glow"
          />
        </label>
        <div className="mt-4 flex gap-2">
          <button className="btn-primary flex-1" onClick={saveDetails}>
            Save changes
          </button>
          <button className="btn-quiet" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </Sheet>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete playlist">
        <p className="text-sm text-muted">
          Delete {data.name}? The songs stay in your library — only the playlist is removed.
        </p>
        <div className="mt-4 flex gap-2">
          <button className="btn h-11 flex-1 bg-heart px-5 text-ink" onClick={deletePlaylist}>
            Delete playlist
          </button>
          <button className="btn-quiet" onClick={() => setConfirmDelete(false)}>
            Keep it
          </button>
        </div>
      </Sheet>
    </>
  );
}
