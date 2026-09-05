import { useState, type MouseEvent } from 'react';
import { ChevronUp, Heart, ListMusic, Volume1, Volume2, VolumeX } from 'lucide-react';
import { Artwork } from '../ui/Artwork';
import { Slider } from '../ui/Slider';
import { SeekBar } from './SeekBar';
import { PlayPauseButton, RepeatButton, ShuffleButton, SkipButtons } from './TransportButtons';
import { NowPlaying } from './NowPlaying';
import { QueueSheet } from './QueueSheet';
import { toggleFavorite, usePlayer } from '../../context/PlayerContext';
import { useToast } from '../../context/ToastContext';
import { messageFor } from '../../services/apiError';

/**
 * The bar that is always there. On a phone it is a single tappable strip above
 * the tab bar; on a wide screen it becomes the full transport.
 */
export function MiniPlayer() {
  const { currentSong, isPlaying, volume, muted, setVolume, toggleMute, canControlVolume, error } =
    usePlayer();
  const { notify } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);

  if (!currentSong) return null;

  async function onHeart(event: MouseEvent) {
    event.stopPropagation();
    try {
      await toggleFavorite(currentSong!);
    } catch (err) {
      notify(messageFor(err), 'error');
    }
  }

  return (
    <>
      <div
        className="fixed inset-x-0 z-30 border-t border-line bg-panel/95 backdrop-blur-xl"
        style={{ bottom: 'var(--player-bottom)' }}
        data-testid="mini-player"
      >
        {/* Phone: one strip, tap anywhere to open Now Playing */}
        <div className="lg:hidden">
          <div className="h-[2px] w-full bg-line">
            <ProgressHairline />
          </div>
          <div
            role="button"
            tabIndex={0}
            onClick={() => setExpanded(true)}
            onKeyDown={(event) => event.key === 'Enter' && setExpanded(true)}
            aria-label={`Now playing: ${currentSong.title}. Open full screen player`}
            className="flex items-center gap-3 px-3"
            style={{ height: 'var(--mini-player-h)' }}
          >
            <Artwork src={currentSong.artworkUrl} seed={currentSong.album} className="h-11 w-11" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] leading-tight">{currentSong.title}</p>
              <p className="truncate text-[12px] leading-tight text-muted">
                {error ? <span className="text-glow">{error}</span> : currentSong.artist}
              </p>
            </div>
            <button onClick={onHeart} aria-label="Favourite" className="tap h-10 w-10 min-h-0 min-w-0 text-muted">
              <Heart className={`h-5 w-5 ${currentSong.favorite ? 'fill-heart text-heart' : ''}`} aria-hidden />
            </button>
            <div onClick={(event) => event.stopPropagation()} className="flex items-center gap-1">
              <PlayPauseButton size="sm" />
            </div>
            <ChevronUp className="h-4 w-4 text-dim" aria-hidden />
          </div>
        </div>

        {/* Desktop: artwork and title, transport in the middle, volume at the end */}
        <div className="hidden h-[88px] items-center gap-6 px-6 lg:flex">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button onClick={() => setExpanded(true)} aria-label="Open full screen player" className="shrink-0">
              <Artwork src={currentSong.artworkUrl} seed={currentSong.album} className="h-14 w-14" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-[15px] leading-tight">{currentSong.title}</p>
              <p className="truncate text-[13px] leading-tight text-muted">{currentSong.artist}</p>
            </div>
            <button onClick={onHeart} aria-label="Favourite" className="tap h-10 w-10 min-h-0 min-w-0 text-muted hover:text-heart">
              <Heart className={`h-[18px] w-[18px] ${currentSong.favorite ? 'fill-heart text-heart' : ''}`} aria-hidden />
            </button>
          </div>

          <div className="flex w-[42%] max-w-xl flex-col items-center gap-1">
            <div className="flex items-center gap-5">
              <ShuffleButton />
              <SkipButtons />
              <PlayPauseButton />
              <RepeatButton />
            </div>
            <SeekBar />
          </div>

          <div className="flex flex-1 items-center justify-end gap-3">
            <button
              onClick={() => setQueueOpen(true)}
              aria-label="Show the queue"
              className="tap text-muted hover:text-chalk"
            >
              <ListMusic className="h-[18px] w-[18px]" aria-hidden />
            </button>
            {canControlVolume && (
              <div className="flex w-36 items-center gap-2">
                <button onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} className="text-muted">
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
      </div>

      <NowPlaying open={expanded} onClose={() => setExpanded(false)} />
      <QueueSheet open={queueOpen} onClose={() => setQueueOpen(false)} />
      <span className="sr-only" role="status" aria-live="polite">
        {isPlaying ? `Playing ${currentSong.title} by ${currentSong.artist}` : 'Paused'}
      </span>
    </>
  );
}

function ProgressHairline() {
  const { currentTime, duration, currentSong } = usePlayer();
  const total = duration || currentSong?.duration || 0;
  const percent = total ? Math.min(100, (currentTime / total) * 100) : 0;
  return <div className="h-full bg-glow transition-[width] duration-200 ease-linear" style={{ width: `${percent}%` }} />;
}
