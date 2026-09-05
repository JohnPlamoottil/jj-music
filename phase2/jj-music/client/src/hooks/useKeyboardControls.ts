import { useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';

const TYPING = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/** Desktop transport shortcuts. Never fires while typing in a field. */
export function useKeyboardControls() {
  const { toggle, next, previous, skipBy, setVolume, volume } = usePlayer();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (TYPING.has(target.tagName) || target.isContentEditable)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      switch (event.key) {
        case ' ':
          event.preventDefault();
          toggle();
          break;
        case 'ArrowRight':
          if (event.shiftKey) next();
          else skipBy(10);
          break;
        case 'ArrowLeft':
          if (event.shiftKey) previous();
          else skipBy(-10);
          break;
        case 'ArrowUp':
          event.preventDefault();
          setVolume(volume + 0.05);
          break;
        case 'ArrowDown':
          event.preventDefault();
          setVolume(volume - 0.05);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle, next, previous, skipBy, setVolume, volume]);
}
