import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Hide the header when the content provides its own. */
  bare?: boolean;
}

/**
 * One dialog primitive for the whole app: a bottom sheet on phones, a centred
 * panel on wide screens. Escape closes, the backdrop closes, focus moves in.
 */
export function Sheet({ open, onClose, title, children, bare = false }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>('button, input, [href]')?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div
        className="absolute inset-0 bg-black/70 animate-fadeIn"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full sm:max-w-md max-h-[85vh] overflow-y-auto surface
                   rounded-t-xl2 sm:rounded-xl2 shadow-lift animate-sheetUp sm:animate-fadeIn
                   pb-[max(1rem,var(--sa-bottom))] sm:pb-4"
      >
        {!bare && (
          <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-panel/95 px-5 py-4 backdrop-blur">
            <h2 className="text-lg">{title}</h2>
            <button className="tap -mr-2 text-muted hover:text-chalk" onClick={onClose} aria-label="Close">
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        )}
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
