import {
  ChevronDown,
  Heart,
  ListMusic,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useState } from 'react';
import { Artwork } from '../ui/Artwork';
import { Slider } from '../ui/Slider';
import { SeekBar } from './SeekBar';
import { PlayPauseButton, RepeatButton, ShuffleButton } from './TransportButtons';
import { QueueSheet } from './QueueSheet';
import { toggleFavorite, usePlayer } from '../../context/PlayerContext';
import { useToast } from '../../context/ToastContext';
import { messageFor } from '../../services/apiError';
import { gradientFor } from '../../utils/artwork';

/** The full-screen Now Playing view. Artwork leads; everything else is quiet. */
export function NowPlaying({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    currentSong,
    volume,
    muted,
    setVolume,
    toggleMute,
    canControlVolume,
    error,
    status,
    next,
    previous,
  } = usePlayer();
  const { notify } = useToast();
  const [queueOpen, setQueueOpen] = useState(false);

  if (!open || !currentSong) return null;

  async function onHeart() {
    try {
      await toggleFavorite(currentSong!);
    } catch (err) {
      notify(messageFor(err), 'error');
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-ink animate-sheetUp"
      role="dialog"
      aria-modal="true"
      aria-label="Now playing"
    >
      {/* Ambient wash pulled from the artwork colour */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] opacity-60 blur-3xl"
        style={{ backgroundImage: gradientFor(currentSong.album) }}
        aria-hidden
      />

      <div
        className="relative flex items-center justify-between px-5 pb-2"
        style={{ paddingTop: 'calc(var(--sa-top) + 0.75rem)' }}
      >
        <button onClick={onClose} aria-label="Close now playing" className="tap -ml-3 text-chalk">
          <ChevronDown className="h-6 w-6" aria-hidden />
        </button>
        <p className="truncate px-4 text-center text-[13px] text-muted">{currentSong.album}</p>
        <button
          onClick={() => setQueueOpen(true)}
          aria-label="Show the queue"
          className="tap -mr-3 text-chalk"
        >
          <ListMusic className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="relative flex flex-1 flex-col justify-center gap-8 px-6 pb-[max(1.5rem,var(--sa-bottom))] sm:px-10">
        <div className="mx-auto w-full max-w-[min(78vw,420px)]">
          <Artwork
            src={currentSong.artworkUrl}
            seed={currentSong.album}
            alt={`${currentSong.album} artwork`}
            rounded="rounded-[1.5rem]"
            className="aspect-square w-full shadow-lift"
          />
        </div>

        <div className="mx-auto w-full max-w-lg">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[26px] leading-tight">{currentSong.title}</h2>
              <p className="truncate text-[17px] text-muted">{currentSong.artist}</p>
              <p className="truncate text-[13px] text-dim">{currentSong.album}</p>
            </div>
            <button
              onClick={onHeart}
              aria-pressed={currentSong.favorite}
              aria-label={currentSong.favorite ? 'Remove from favourites' : 'Add to favourites'}
              className="tap text-muted hover:text-heart"
            >
              <Heart className={`h-6 w-6 ${currentSong.favorite ? 'fill-heart text-heart' : ''}`} aria-hidden />
            </button>
          </div>

          <div className="mt-6">
            <SeekBar size="md" />
          </div>

          {error && (
            <p className="mt-3 text-center text-[13px] text-glow" role="alert">
              {error}
            </p>
          )}
          {!error && status === 'loading' && (
            <p className="mt-3 text-center text-[13px] text-dim">Buffering</p>
          )}

          <div className="mt-7 flex items-center justify-between gap-2">
            <ShuffleButton />
            <button onClick={previous} aria-label="Previous song" className="tap text-chalk">
              <SkipBack className="h-7 w-7 fill-current" aria-hidden />
            </button>
            <PlayPauseButton size="lg" />
            <button onClick={next} aria-label="Next song" className="tap text-chalk">
              <SkipForward className="h-7 w-7 fill-current" aria-hidden />
            </button>
            <RepeatButton />
          </div>

          {canControlVolume && (
            <div className="mt-8 flex items-center gap-3">
              <button onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} className="tap h-9 w-9 min-h-0 min-w-0 text-muted">
                {muted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" aria-hidden />
                ) : volume < 0.5 ? (
                  <Volume1 className="h-4 w-4" aria-hidden />
                ) : (
                  <Volume2 className="h-4 w-4" aria-hidden />
                )}
              </button>
              <Slider label="Volume" value={muted ? 0 : volume} max={1} onChange={setVolume} />
            </div>
          )}
        </div>
      </div>

      <QueueSheet open={queueOpen} onClose={() => setQueueOpen(false)} />
    </div>
  );
}
