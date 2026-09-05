import { useState } from 'react';
import { gradientFor, initialsFor } from '../../utils/artwork';

interface Props {
  src?: string | null;
  /** Album or playlist name — decides the fallback colour. */
  seed: string;
  alt?: string;
  className?: string;
  rounded?: string;
}

/** Artwork with a deterministic coloured fallback, never a grey box. */
export function Artwork({ src, seed, alt = '', className = '', rounded = 'rounded-lg' }: Props) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;

  return (
    <div
      className={`relative overflow-hidden ${rounded} ${className} bg-raised shrink-0`}
      style={showImage ? undefined : { backgroundImage: gradientFor(seed) }}
      aria-hidden={alt ? undefined : true}
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full select-none" aria-hidden>
          <text
            x="50"
            y="50"
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-chalk/40 font-display"
            fontSize="34"
            fontWeight="500"
          >
            {initialsFor(seed)}
          </text>
        </svg>
      )}
    </div>
  );
}
