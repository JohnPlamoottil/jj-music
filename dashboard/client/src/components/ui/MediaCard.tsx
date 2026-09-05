import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Play } from 'lucide-react';
import { Artwork } from './Artwork';

interface Props {
  to: string;
  title: string;
  subtitle?: string;
  artworkUrl?: string | null;
  seed: string;
  circular?: boolean;
  onPlay?: () => void;
}

export function MediaCard({ to, title, subtitle, artworkUrl, seed, circular, onPlay }: Props) {
  return (
    <div className="group relative">
      <Link to={to} className="block rounded-xl2 p-2 transition-colors duration-200 ease-soft hover:bg-panel">
        <div className="relative">
          <Artwork
            src={artworkUrl}
            seed={seed}
            className="aspect-square w-full"
            rounded={circular ? 'rounded-full' : 'rounded-xl2'}
          />
          {onPlay && (
            <button
              onClick={(event) => {
                event.preventDefault();
                onPlay();
              }}
              aria-label={`Play ${title}`}
              className="absolute bottom-2 right-2 grid h-11 w-11 place-items-center rounded-full
                         bg-glow text-ink opacity-0 shadow-lift transition-opacity duration-200
                         group-hover:opacity-100 focus-visible:opacity-100 sm:bottom-3 sm:right-3"
            >
              <Play className="h-5 w-5 translate-x-[1px] fill-current" aria-hidden />
            </button>
          )}
        </div>
        <p className={`mt-3 truncate text-[15px] ${circular ? 'text-center' : ''}`}>{title}</p>
        {subtitle && (
          <p className={`truncate text-[13px] text-muted ${circular ? 'text-center' : ''}`}>{subtitle}</p>
        )}
      </Link>
    </div>
  );
}

/** Horizontal, snap-scrolling shelf used on the home screen. */
export function Shelf({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0
                    [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {children}
    </div>
  );
}

export function ShelfItem({ children }: { children: ReactNode }) {
  return <div className="w-[44vw] max-w-[190px] shrink-0 snap-start sm:w-[190px]">{children}</div>;
}
