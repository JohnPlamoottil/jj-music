import { AlertCircle, Loader2, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Loading({ label = 'Loading your library' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-16 text-muted" role="status" aria-live="polite">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function RowSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg p-2">
          <div className="h-12 w-12 rounded-lg bg-raised animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-raised animate-pulse" />
            <div className="h-3 w-1/5 rounded bg-raised/70 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="surface rounded-xl2 p-6 flex items-start gap-4" role="alert">
      <AlertCircle className="h-5 w-5 text-glow shrink-0 mt-0.5" aria-hidden />
      <div className="space-y-3">
        <p className="text-sm text-chalk">{message}</p>
        {onRetry && (
          <button className="btn-quiet h-9 px-4 text-sm" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

interface EmptyProps {
  icon: LucideIcon;
  title: string;
  body: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
}

/** An empty screen is an invitation to act, so it always offers the next step. */
export function EmptyState({ icon: Icon, title, body, actionLabel, actionTo, onAction }: EmptyProps) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6">
      <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-line bg-panel">
        <Icon className="h-6 w-6 text-glow" aria-hidden />
      </div>
      <h2 className="text-xl">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{body}</p>
      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn-primary mt-6">
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionTo && (
        <button className="btn-primary mt-6" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
