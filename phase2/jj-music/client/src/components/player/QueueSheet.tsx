import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Artwork } from '../ui/Artwork';
import { PlayingBars } from '../ui/PlayingBars';
import { usePlayer } from '../../context/PlayerContext';
import { formatDuration, pluralize } from '../../utils/format';

/**
 * Reordering uses explicit move buttons rather than drag-and-drop: it works
 * with a keyboard, with VoiceOver, and with a thumb on a moving train.
 */
export function QueueSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { queue, currentQueueIndex, isPlaying, removeFromQueue, moveInQueue, clearQueue, playNow } =
    usePlayer();

  const upNext = queue.length - currentQueueIndex - 1;

  return (
    <Sheet open={open} onClose={onClose} title="Playing next">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted">
          {queue.length ? `${pluralize(Math.max(0, upNext), 'song')} after this one` : 'The queue is empty'}
        </p>
        {queue.length > 0 && (
          <button
            className="rounded-md text-sm text-muted hover:text-heart"
            onClick={() => {
              clearQueue();
              onClose();
            }}
          >
            Clear queue
          </button>
        )}
      </div>

      <ol className="space-y-1">
        {queue.map((song, index) => {
          const isCurrent = index === currentQueueIndex;
          return (
            <li
              key={`${song.id}-${index}`}
              className={`flex items-center gap-3 rounded-lg px-2 py-2 ${isCurrent ? 'bg-raised/70' : ''}`}
            >
              <button
                onClick={() => playNow(queue, index)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                aria-label={`Play ${song.title}`}
              >
                <div className="relative">
                  <Artwork src={song.artworkUrl} seed={song.album} className="h-10 w-10" />
                  {isCurrent && (
                    <span className="absolute inset-0 grid place-items-center rounded-lg bg-black/55">
                      <PlayingBars animate={isPlaying} />
                    </span>
                  )}
                </div>
                <span className="min-w-0">
                  <span className={`block truncate text-[15px] ${isCurrent ? 'text-glow' : ''}`}>{song.title}</span>
                  <span className="block truncate text-[13px] text-muted">
                    {song.artist} · {formatDuration(song.duration)}
                  </span>
                </span>
              </button>

              <button
                onClick={() => moveInQueue(index, index - 1)}
                disabled={index === 0}
                aria-label={`Move ${song.title} up`}
                className="tap h-9 w-9 min-h-0 min-w-0 text-muted hover:text-chalk"
              >
                <ArrowUp className="h-4 w-4" aria-hidden />
              </button>
              <button
                onClick={() => moveInQueue(index, index + 1)}
                disabled={index === queue.length - 1}
                aria-label={`Move ${song.title} down`}
                className="tap h-9 w-9 min-h-0 min-w-0 text-muted hover:text-chalk"
              >
                <ArrowDown className="h-4 w-4" aria-hidden />
              </button>
              <button
                onClick={() => removeFromQueue(index)}
                aria-label={`Remove ${song.title} from the queue`}
                className="tap h-9 w-9 min-h-0 min-w-0 text-muted hover:text-heart"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </li>
          );
        })}
      </ol>
    </Sheet>
  );
}
