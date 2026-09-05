import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  to?: string;
  linkLabel?: string;
  children?: ReactNode;
}

export function SectionHeader({ title, to, linkLabel = 'See all', children }: Props) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="text-xl sm:text-2xl">{title}</h2>
      {children}
      {to && (
        <Link
          to={to}
          className="shrink-0 rounded-md text-sm text-muted transition-colors hover:text-glow"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
