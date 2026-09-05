import { useToast } from '../../context/ToastContext';

/** Transient messages, above the player, clear of the home indicator. */
export function Toasts() {
  const { toasts, dismiss } = useToast();
  if (!toasts.length) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4"
      style={{ bottom: 'calc(var(--player-bottom) + var(--mini-player-h) + 1rem)' }}
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <button
          key={toast.id}
          onClick={() => dismiss(toast.id)}
          className={`pointer-events-auto max-w-md rounded-full border px-4 py-2.5 text-sm shadow-lift
                      animate-fadeIn backdrop-blur-xl
                      ${toast.tone === 'error'
                        ? 'border-heart/40 bg-heart/15 text-chalk'
                        : 'border-line bg-panel/95 text-chalk'}`}
        >
          {toast.message}
        </button>
      ))}
    </div>
  );
}
