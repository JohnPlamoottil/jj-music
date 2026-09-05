import { Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';

export function PlayPauseButton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const { isPlaying, toggle, queue, status } = usePlayer();
  const dimensions =
    size === 'lg' ? 'h-[68px] w-[68px]' : size === 'md' ? 'h-11 w-11' : 'h-10 w-10';
  const icon = size === 'lg' ? 'h-7 w-7' : 'h-5 w-5';

  return (
    <button
      onClick={toggle}
      disabled={!queue.length}
      aria-label={isPlaying ? 'Pause' : 'Play'}
      className={`grid ${dimensions} place-items-center rounded-full bg-chalk text-ink
                  transition-transform duration-150 ease-soft active:scale-95
                  ${status === 'loading' ? 'opacity-70' : ''}`}
    >
      {isPlaying ? (
        <Pause className={`${icon} fill-current`} aria-hidden />
      ) : (
        <Play className={`${icon} translate-x-[2px] fill-current`} aria-hidden />
      )}
    </button>
  );
}

export function SkipButtons({ large = false }: { large?: boolean }) {
  const { next, previous, queue } = usePlayer();
  const icon = large ? 'h-7 w-7' : 'h-5 w-5';
  return (
    <>
      <button onClick={previous} disabled={!queue.length} aria-label="Previous song" className="tap text-chalk">
        <SkipBack className={`${icon} fill-current`} aria-hidden />
      </button>
      <button onClick={next} disabled={!queue.length} aria-label="Next song" className="tap text-chalk">
        <SkipForward className={`${icon} fill-current`} aria-hidden />
      </button>
    </>
  );
}

export function ShuffleButton() {
  const { shuffle, toggleShuffle } = usePlayer();
  return (
    <button
      onClick={toggleShuffle}
      aria-pressed={shuffle}
      aria-label="Shuffle"
      className={`tap ${shuffle ? 'text-glow' : 'text-muted hover:text-chalk'}`}
    >
      <Shuffle className="h-[18px] w-[18px]" aria-hidden />
    </button>
  );
}

export function RepeatButton() {
  const { repeat, cycleRepeat } = usePlayer();
  const label = repeat === 'one' ? 'Repeat one song' : repeat === 'all' ? 'Repeat queue' : 'Repeat off';
  return (
    <button
      onClick={cycleRepeat}
      aria-label={label}
      title={label}
      className={`tap ${repeat === 'off' ? 'text-muted hover:text-chalk' : 'text-glow'}`}
    >
      {repeat === 'one' ? (
        <Repeat1 className="h-[18px] w-[18px]" aria-hidden />
      ) : (
        <Repeat className="h-[18px] w-[18px]" aria-hidden />
      )}
    </button>
  );
}
