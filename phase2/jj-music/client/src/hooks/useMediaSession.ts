import { useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';

/**
 * Hand track metadata and transport controls to the operating system.
 *
 * Support varies: iOS Safari shows metadata and play/pause/next/previous on the
 * Lock Screen, but ignores some action handlers and only reports position state
 * in newer versions. Every handler is registered defensively — an unsupported
 * action throws on assignment, and we simply skip it rather than break
 * playback.
 */
export function useMediaSession() {
  const { currentSong, isPlaying, currentTime, duration, toggle, next, previous, seek, skipBy } =
    usePlayer();

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const session = navigator.mediaSession;
    if (!currentSong) {
      session.metadata = null;
      return;
    }
    try {
      session.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist,
        album: currentSong.album,
        artwork: currentSong.artworkUrl
          ? [
              { src: currentSong.artworkUrl, sizes: '512x512', type: 'image/jpeg' },
              { src: currentSong.artworkUrl, sizes: '256x256', type: 'image/jpeg' },
            ]
          : [{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
      });
    } catch {
      /* MediaMetadata unavailable — Lock Screen simply shows less */
    }
  }, [currentSong]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const session = navigator.mediaSession;
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => toggle()],
      ['pause', () => toggle()],
      ['previoustrack', () => previous()],
      ['nexttrack', () => next()],
      ['seekbackward', (details) => skipBy(-(details.seekOffset || 10))],
      ['seekforward', (details) => skipBy(details.seekOffset || 10)],
      ['seekto', (details) => details.seekTime != null && seek(details.seekTime)],
      ['stop', () => toggle()],
    ];
    const registered: MediaSessionAction[] = [];
    for (const [action, handler] of handlers) {
      try {
        session.setActionHandler(action, handler);
        registered.push(action);
      } catch {
        /* this browser does not support this action */
      }
    }
    return () => {
      for (const action of registered) {
        try {
          session.setActionHandler(action, null);
        } catch {
          /* ignore */
        }
      }
    };
  }, [toggle, next, previous, seek, skipBy]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) return;
    if (!duration || !Number.isFinite(duration)) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        position: Math.min(currentTime, duration),
        playbackRate: 1,
      });
    } catch {
      /* Safari throws if position exceeds duration mid-seek */
    }
  }, [currentTime, duration]);
}
