import { useState } from 'react';
import { ListEnd, ListPlus, ListX, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { Sheet } from './Sheet';
import { Artwork } from './Artwork';
import { EditSongDialog } from './EditSongDialog';
import { AddToPlaylistDialog } from './AddToPlaylistDialog';
import { usePlayer } from '../../context/PlayerContext';
import { useToast } from '../../context/ToastContext';
import { songs as songsApi } from '../../services/api';
import { messageFor } from '../../services/apiError';
import { emit } from '../../utils/events';
import type { Song } from '../../types';

interface Props {
  song: Song;
  open: boolean;
  onClose: () => void;
  onRemoveFromPlaylist?: () => void;
}

export function SongActions({ song, open, onClose, onRemoveFromPlaylist }: Props) {
  const { playSong, playNext, addToQueue } = usePlayer();
  const { notify } = useToast();
  const [editing, setEditing] = useState(false);
  const [choosingPlaylist, setChoosingPlaylist] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function run(action: () => void, message: string) {
    action();
    notify(message);
    onClose();
  }

  async function removeSong() {
    try {
      await songsApi.remove(song.id);
      emit('song-removed', song.id);
      emit('library-changed', undefined);
      notify(`Removed ${song.title} from your library`);
      onClose();
    } catch (error) {
      notify(messageFor(error), 'error');
    }
  }

  return (
    <>
      <Sheet open={open && !editing && !choosingPlaylist} onClose={onClose} title={song.title} bare>
        <div className="mb-4 flex items-center gap-3 border-b border-line pb-4">
          <Artwork src={song.artworkUrl} seed={song.album} className="h-14 w-14" />
          <div className="min-w-0">
            <p className="truncate">{song.title}</p>
            <p className="truncate text-sm text-muted">
              {song.artist} · {song.album}
            </p>
          </div>
        </div>

        <ul className="space-y-1">
          <ActionItem icon={Play} label="Play now" onClick={() => run(() => playSong(song), `Playing ${song.title}`)} />
          <ActionItem
            icon={ListEnd}
            label="Play next"
            onClick={() => run(() => playNext(song), `${song.title} plays next`)}
          />
          <ActionItem
            icon={ListPlus}
            label="Add to queue"
            onClick={() => run(() => addToQueue(song), `Added ${song.title} to the queue`)}
          />
          <ActionItem icon={Plus} label="Add to playlist" onClick={() => setChoosingPlaylist(true)} />
          <ActionItem icon={Pencil} label="Edit details" onClick={() => setEditing(true)} />
          {onRemoveFromPlaylist && (
            <ActionItem
              icon={ListX}
              label="Remove from this playlist"
              onClick={() => {
                onRemoveFromPlaylist();
                onClose();
              }}
            />
          )}
          <li>
            {confirmDelete ? (
              <div className="rounded-lg border border-line p-3">
                <p className="text-sm">
                  Delete {song.title} from your library? The audio file is removed from storage too.
                </p>
                <div className="mt-3 flex gap-2">
                  <button className="btn h-9 flex-1 bg-heart px-4 text-sm text-ink" onClick={removeSong}>
                    Delete song
                  </button>
                  <button className="btn-quiet h-9 flex-1 px-4 text-sm" onClick={() => setConfirmDelete(false)}>
                    Keep it
                  </button>
                </div>
              </div>
            ) : (
              <ActionItem icon={Trash2} label="Delete from library" danger onClick={() => setConfirmDelete(true)} />
            )}
          </li>
        </ul>
      </Sheet>

      <EditSongDialog song={song} open={editing} onClose={() => { setEditing(false); onClose(); }} />
      <AddToPlaylistDialog
        song={song}
        open={choosingPlaylist}
        onClose={() => { setChoosingPlaylist(false); onClose(); }}
      />
    </>
  );
}

function ActionItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Play;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-[15px] row-hover
                    ${danger ? 'text-heart' : 'text-chalk'}`}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
        {label}
      </button>
    </li>
  );
}
