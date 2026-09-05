import { useState, type MouseEvent } from 'react';
import { Heart, MoreHorizontal } from 'lucide-react';
import { Artwork } from './Artwork';
import { PlayingBars } from './PlayingBars';
import { SongActions } from './SongActions';
import { toggleFavorite, useIsCurrent, usePlayer } from '../../context/PlayerContext';
import { useToast } from '../../context/ToastContext';
import { messageFor } from '../../services/apiError';
import { formatDuration } from '../../utils/format';
import type { Song } from '../../types';

interface Props {
  song: Song;
  /** Everything that should go into the queue when this row is played. */
  context: Song[];
  /** Show a track number instead of artwork (album and playlist screens). */
  number?: number;
  showAlbum?: boolean;
  onRemoveFromPlaylist?: () => void;
}

export function SongRow({ song, context, number, showAlbum = true, onRemoveFromPlaylist }: Props) {
  const { playSong } = usePlayer();
  const { isCurrent, isPlaying } = useIsCurrent(song.id);
  const { notify } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  // Optimistic heart state, reset whenever the song prop itself changes.
  const [favorite, setFavorite] = useState(song.favorite);
  const [seen, setSeen] = useState(song.favorite);
  if (song.favorite !== seen) {
    setSeen(song.favorite);
    setFavorite(song.favorite);
  }

  async function onHeart(event: MouseEvent) {
    event.stopPropagation();
    const optimistic = !favorite;
    setFavorite(optimistic);
    try {
      await toggleFavorite({ ...song, favorite });
    } catch (error) {
      setFavorite(!optimistic);
      notify(messageFor(error), 'error');
    }
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => playSong(song, context)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            playSong(song, context);
          }
        }}
        aria-label={`Play ${song.title} by ${song.artist}`}
        className={`group flex items-center gap-3 rounded-lg px-2 py-2 row-hover cursor-pointer
                    ${isCurrent ? 'bg-raised/60' : ''}`}
      >
        {number != null ? (
          <span className="tnum grid w-8 shrink-0 place-items-center text-sm text-dim">
            {isCurrent ? <PlayingBars animate={isPlaying} /> : number}
          </span>
        ) : (
          <div className="relative">
            <Artwork src={song.artworkUrl} seed={song.album} className="h-12 w-12" />
            {isCurrent && (
              <span className="absolute inset-0 grid place-items-center rounded-lg bg-black/55">
                <PlayingBars animate={isPlaying} />
              </span>
            )}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className={`truncate text-[15px] leading-tight ${isCurrent ? 'text-glow' : 'text-chalk'}`}>
            {song.title}
          </p>
          <p className="truncate text-[13px] leading-tight text-muted">
            {song.artist}
            {showAlbum && song.album ? ` · ${song.album}` : ''}
          </p>
        </div>

        <span className="tnum hidden w-14 text-right text-sm text-dim sm:block">
          {formatDuration(song.duration)}
        </span>

        <button
          onClick={onHeart}
          aria-pressed={favorite}
          aria-label={favorite ? `Remove ${song.title} from favourites` : `Add ${song.title} to favourites`}
          className="tap h-9 w-9 min-h-0 min-w-0 rounded-full text-muted transition-colors hover:text-heart"
        >
          <Heart className={`h-[18px] w-[18px] ${favorite ? 'fill-heart text-heart' : ''}`} aria-hidden />
        </button>

        <button
          onClick={(event) => {
            event.stopPropagation();
            setMenuOpen(true);
          }}
          aria-label={`More options for ${song.title}`}
          aria-haspopup="dialog"
          className="tap h-9 w-9 min-h-0 min-w-0 rounded-full text-muted transition-colors hover:text-chalk"
        >
          <MoreHorizontal className="h-[18px] w-[18px]" aria-hidden />
        </button>
      </div>

      <SongActions
        song={song}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onRemoveFromPlaylist={onRemoveFromPlaylist}
      />
    </>
  );
}
