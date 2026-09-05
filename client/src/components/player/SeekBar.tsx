import { useEffect, useState } from 'react';
import { Slider } from '../ui/Slider';
import { usePlayer } from '../../context/PlayerContext';
import { formatDuration } from '../../utils/format';

/** Progress bar that follows playback until you grab it, then follows you. */
export function SeekBar({ showTimes = true, size = 'sm' }: { showTimes?: boolean; size?: 'sm' | 'md' }) {
  const { currentTime, duration, seek, currentSong } = usePlayer();
  const [scrub, setScrub] = useState<number | null>(null);
  const total = duration || currentSong?.duration || 0;
  const value = scrub ?? currentTime;

  useEffect(() => setScrub(null), [currentSong?.id]);

  return (
    <div className="w-full">
      <Slider
        label="Seek"
        size={size}
        value={Math.min(value, total)}
        max={total}
        disabled={!currentSong}
        onChange={setScrub}
        onCommit={(next) => {
          seek(next);
          setScrub(null);
        }}
      />
      {showTimes && (
        <div className="mt-1.5 flex justify-between text-[11px] tnum text-dim">
          <span>{formatDuration(value)}</span>
          <span>-{formatDuration(Math.max(0, total - value))}</span>
        </div>
      )}
    </div>
  );
}
