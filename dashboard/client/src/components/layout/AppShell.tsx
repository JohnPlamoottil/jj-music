import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { MiniPlayer } from '../player/MiniPlayer';
import { Toasts } from '../ui/Toasts';
import { usePlayer } from '../../context/PlayerContext';
import { useMediaSession } from '../../hooks/useMediaSession';
import { useKeyboardControls } from '../../hooks/useKeyboardControls';

/**
 * The frame every page renders inside. The player and the audio element live
 * here, above the router outlet, so navigation never interrupts playback.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { currentSong } = usePlayer();
  useMediaSession();
  useKeyboardControls();

  // Space for the tab bar, the mini player and the iPhone home indicator.
  const bottomPad = currentSong
    ? 'calc(var(--bottom-nav-h) + var(--mini-player-h) + var(--sa-bottom) + 1rem)'
    : 'calc(var(--bottom-nav-h) + var(--sa-bottom) + 1rem)';

  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main
          id="main"
          className="flex-1 overflow-y-auto"
          style={{
            paddingBottom: bottomPad,
            paddingLeft: 'var(--page-x)',
            paddingRight: 'max(var(--gutter), var(--sa-right))',
          }}
        >
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
      <MiniPlayer />
      <BottomNav />
      <Toasts />
    </div>
  );
}
