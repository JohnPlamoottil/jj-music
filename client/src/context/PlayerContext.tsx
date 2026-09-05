import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { history, songs as songsApi, streamUrl } from '../services/api';
import { emit, on } from '../utils/events';
import type { RepeatMode, Song } from '../types';

/**
 * Centralised playback state.
 *
 * The <audio> element is created once, imperatively, and lives for the lifetime
 * of the tab. It is never rendered by React, so route changes cannot unmount or
 * recreate it and music keeps playing while you browse.
 */

interface PlayerState {
  queue: Song[];
  currentQueueIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
}

interface PlayerValue extends PlayerState {
  currentSong: Song | null;
  /** Volume control is a no-op on iOS, where the hardware buttons own it. */
  canControlVolume: boolean;
  playNow: (songs: Song[], startIndex?: number) => void;
  playSong: (song: Song, context?: Song[]) => void;
  toggle: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  skipBy: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  playNext: (song: Song) => void;
  addToQueue: (songs: Song | Song[]) => void;
  removeFromQueue: (index: number) => void;
  moveInQueue: (from: number, to: number) => void;
  clearQueue: () => void;
}

const PlayerContext = createContext<PlayerValue | null>(null);
const PREFS_KEY = 'jj-music.player-prefs';

function loadPrefs(): Pick<PlayerState, 'volume' | 'muted' | 'shuffle' | 'repeat'> {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { volume: 1, muted: false, shuffle: false, repeat: 'off', ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { volume: 1, muted: false, shuffle: false, repeat: 'off' };
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const prefs = useRef(loadPrefs()).current;
  const [state, setState] = useState<PlayerState>({
    queue: [],
    currentQueueIndex: -1,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    status: 'idle',
    error: null,
    ...prefs,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  /** Queue indices not yet played in the current shuffle pass. */
  const shuffleBag = useRef<number[]>([]);
  /** Guards against recording the same play twice. */
  const recorded = useRef<string | null>(null);
  const wantsPlay = useRef(false);

  function getAudio(): HTMLAudioElement {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.volume = prefs.volume;
      audio.muted = prefs.muted;
      audioRef.current = audio;
    }
    return audioRef.current;
  }

  const currentSong =
    state.currentQueueIndex >= 0 ? state.queue[state.currentQueueIndex] ?? null : null;

  const patch = useCallback((next: Partial<PlayerState>) => {
    setState((current) => ({ ...current, ...next }));
  }, []);

  // ---- transport ---------------------------------------------------------

  const goToIndex = useCallback((index: number, autoplay = true) => {
    wantsPlay.current = autoplay;
    setState((current) => {
      if (index < 0 || index >= current.queue.length) return { ...current, isPlaying: false };
      return { ...current, currentQueueIndex: index, currentTime: 0, error: null, status: 'loading' };
    });
  }, []);

  const pickShuffled = useCallback((queueLength: number, exclude: number): number => {
    if (queueLength <= 1) return 0;
    shuffleBag.current = shuffleBag.current.filter((i) => i < queueLength && i !== exclude);
    if (!shuffleBag.current.length) {
      const pool = Array.from({ length: queueLength }, (_, i) => i).filter((i) => i !== exclude);
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      shuffleBag.current = pool;
    }
    return shuffleBag.current.shift() ?? 0;
  }, []);

  const advance = useCallback(
    (manual: boolean) => {
      const { queue, currentQueueIndex, shuffle, repeat } = stateRef.current;
      if (!queue.length) return;
      if (repeat === 'one' && !manual) {
        const audio = getAudio();
        audio.currentTime = 0;
        void audio.play().catch(() => undefined);
        return;
      }
      if (shuffle) {
        goToIndex(pickShuffled(queue.length, currentQueueIndex));
        return;
      }
      const next = currentQueueIndex + 1;
      if (next < queue.length) {
        goToIndex(next);
      } else if (repeat === 'all') {
        goToIndex(0);
      } else {
        getAudio().pause();
        patch({ isPlaying: false, currentTime: 0 });
      }
    },
    [goToIndex, patch, pickShuffled],
  );

  // ---- audio element wiring (attached once) --------------------------------

  useEffect(() => {
    const audio = getAudio();

    const onTime = () => {
      const t = audio.currentTime;
      if (Math.abs(t - stateRef.current.currentTime) < 0.24) return;
      setState((current) => ({ ...current, currentTime: t }));

      // Count a play once it is genuinely a play: 30 seconds, or a quarter of
      // a short track. One write per listen, never a write per second.
      const song = stateRef.current.queue[stateRef.current.currentQueueIndex];
      if (song && recorded.current !== song.id) {
        const threshold = Math.min(30, Math.max(5, (audio.duration || song.duration) * 0.25));
        if (t >= threshold) {
          recorded.current = song.id;
          history
            .record(song.id)
            .then((entry) => {
              if (entry?.song) emit('song-updated', entry.song);
            })
            .catch(() => undefined);
        }
      }
    };

    const onLoaded = () =>
      setState((current) => ({
        ...current,
        duration: Number.isFinite(audio.duration) ? audio.duration : current.duration,
        status: 'ready',
      }));
    const onPlay = () => setState((current) => ({ ...current, isPlaying: true, error: null }));
    const onPause = () => setState((current) => ({ ...current, isPlaying: false }));
    const onWaiting = () => setState((current) => ({ ...current, status: 'loading' }));
    const onPlaying = () => setState((current) => ({ ...current, status: 'ready' }));
    const onEnded = () => advance(false);
      const onError = () =>
        setState((current) => {
          const failing = current.queue[current.currentQueueIndex];
          const sourcePath = (failing as Song | undefined)?.sourcePath?.toLowerCase() ?? '';
          const isProtectedItunes = sourcePath.endsWith('.m4p');
          return {
            ...current,
            isPlaying: false,
            status: 'error',
            error: isProtectedItunes
              ? 'This appears to be a protected iTunes file (.m4p) and cannot play in the browser. Use an unprotected copy (for example .m4a or .mp3).'
              : 'This song could not be played. The file may be missing from storage.',
          };
        });

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('durationchange', onLoaded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('durationchange', onLoaded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [advance]);

  // Load a new source whenever the current song changes.
  const currentSongId = currentSong?.id ?? null;
  useEffect(() => {
    if (!currentSongId || !currentSong) return;
    const audio = getAudio();
    audio.src = streamUrl(currentSong);
    audio.load();
    recorded.current = null;
    if (wantsPlay.current) {
      void audio.play().catch(() => {
        // Autoplay refused (no user gesture yet) — show a paused player rather
        // than an error; the next tap will start it.
        setState((current) => ({ ...current, isPlaying: false, status: 'ready' }));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSongId]);

  // Keep queue entries fresh when a song is edited or favourited elsewhere.
  useEffect(() => {
    const offUpdate = on('song-updated', (song) => {
      setState((current) => ({
        ...current,
        queue: current.queue.map((s) => (s.id === song.id ? { ...s, ...song } : s)),
      }));
    });
    const offRemove = on('song-removed', (songId) => {
      setState((current) => {
        const index = current.queue.findIndex((s) => s.id === songId);
        if (index === -1) return current;
        const queue = current.queue.filter((s) => s.id !== songId);
        const shift = index < current.currentQueueIndex ? 1 : 0;
        return { ...current, queue, currentQueueIndex: current.currentQueueIndex - shift };
      });
    });
    return () => {
      offUpdate();
      offRemove();
    };
  }, []);

  useEffect(() => {
    const { volume, muted, shuffle, repeat } = state;
    localStorage.setItem(PREFS_KEY, JSON.stringify({ volume, muted, shuffle, repeat }));
  }, [state.volume, state.muted, state.shuffle, state.repeat]);

  // ---- actions -------------------------------------------------------------

  const playNow = useCallback(
    (list: Song[], startIndex = 0) => {
      if (!list.length) return;
      shuffleBag.current = [];
      wantsPlay.current = true;
      setState((current) => ({
        ...current,
        queue: list,
        currentQueueIndex: current.shuffle && startIndex === 0 ? Math.floor(Math.random() * list.length) : startIndex,
        currentTime: 0,
        status: 'loading',
        error: null,
      }));
    },
    [],
  );

  const playSong = useCallback(
    (song: Song, context?: Song[]) => {
      const list = context?.length ? context : [song];
      const index = Math.max(0, list.findIndex((s) => s.id === song.id));
      shuffleBag.current = [];
      wantsPlay.current = true;
      setState((current) => ({
        ...current,
        queue: list,
        currentQueueIndex: index,
        currentTime: 0,
        status: 'loading',
        error: null,
      }));
    },
    [],
  );

  const toggle = useCallback(() => {
    const audio = getAudio();
    if (!stateRef.current.queue.length) return;
    if (audio.paused) {
      wantsPlay.current = true;
      void audio.play().catch(() =>
        setState((current) => ({
          ...current,
          status: 'error',
          error: 'Playback was blocked. Tap play again.',
        })),
      );
    } else {
      audio.pause();
    }
  }, []);

  const pause = useCallback(() => getAudio().pause(), []);

  const previous = useCallback(() => {
    const audio = getAudio();
    const { currentQueueIndex, queue, repeat } = stateRef.current;
    if (audio.currentTime > 3 || currentQueueIndex <= 0) {
      if (currentQueueIndex <= 0 && audio.currentTime <= 3 && repeat === 'all' && queue.length) {
        goToIndex(queue.length - 1);
        return;
      }
      audio.currentTime = 0;
      patch({ currentTime: 0 });
      return;
    }
    goToIndex(currentQueueIndex - 1);
  }, [goToIndex, patch]);

  const seek = useCallback(
    (seconds: number) => {
      const audio = getAudio();
      if (!Number.isFinite(seconds)) return;
      audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || seconds));
      patch({ currentTime: audio.currentTime });
    },
    [patch],
  );

  const skipBy = useCallback((seconds: number) => seek(getAudio().currentTime + seconds), [seek]);

  const setVolume = useCallback(
    (volume: number) => {
      const clamped = Math.max(0, Math.min(1, volume));
      getAudio().volume = clamped;
      getAudio().muted = clamped === 0;
      patch({ volume: clamped, muted: clamped === 0 });
    },
    [patch],
  );

  const toggleMute = useCallback(() => {
    const audio = getAudio();
    audio.muted = !audio.muted;
    patch({ muted: audio.muted });
  }, [patch]);

  const toggleShuffle = useCallback(() => {
    shuffleBag.current = [];
    setState((current) => ({ ...current, shuffle: !current.shuffle }));
  }, []);

  const cycleRepeat = useCallback(() => {
    setState((current) => ({
      ...current,
      repeat: current.repeat === 'off' ? 'all' : current.repeat === 'all' ? 'one' : 'off',
    }));
  }, []);

  const playNextInQueue = useCallback((song: Song) => {
    setState((current) => {
      const queue = current.queue.filter((s) => s.id !== song.id);
      const at = Math.max(0, current.currentQueueIndex) + 1;
      queue.splice(at, 0, song);
      return { ...current, queue };
    });
  }, []);

  const addToQueue = useCallback((incoming: Song | Song[]) => {
    const list = Array.isArray(incoming) ? incoming : [incoming];
    // Adding to an empty queue loads the first song but does not start it:
    // playback should only ever begin from a deliberate tap.
    if (stateRef.current.currentQueueIndex === -1) wantsPlay.current = false;
    setState((current) => {
      const queue = [...current.queue, ...list.filter((s) => !current.queue.some((q) => q.id === s.id))];
      const started = current.currentQueueIndex === -1 && queue.length > 0;
      return { ...current, queue, currentQueueIndex: started ? 0 : current.currentQueueIndex };
    });
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setState((current) => {
      if (index < 0 || index >= current.queue.length) return current;
      const queue = current.queue.filter((_, i) => i !== index);
      let currentQueueIndex = current.currentQueueIndex;
      if (index < currentQueueIndex) currentQueueIndex -= 1;
      else if (index === currentQueueIndex) currentQueueIndex = Math.min(currentQueueIndex, queue.length - 1);
      return { ...current, queue, currentQueueIndex };
    });
  }, []);

  const moveInQueue = useCallback((from: number, to: number) => {
    setState((current) => {
      const queue = [...current.queue];
      if (from < 0 || to < 0 || from >= queue.length || to >= queue.length) return current;
      const [moved] = queue.splice(from, 1);
      queue.splice(to, 0, moved);
      const playing = current.queue[current.currentQueueIndex];
      const currentQueueIndex = playing ? queue.findIndex((s) => s.id === playing.id) : current.currentQueueIndex;
      return { ...current, queue, currentQueueIndex };
    });
  }, []);

  const clearQueue = useCallback(() => {
    const audio = getAudio();
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    shuffleBag.current = [];
    setState((current) => ({
      ...current,
      queue: [],
      currentQueueIndex: -1,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      status: 'idle',
      error: null,
    }));
  }, []);

  const canControlVolume = useMemo(
    () => !window.matchMedia('(pointer: coarse)').matches,
    [],
  );

  const value: PlayerValue = {
    ...state,
    currentSong,
    canControlVolume,
    playNow,
    playSong,
    toggle,
    pause,
    next: () => advance(true),
    previous,
    seek,
    skipBy,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    playNext: playNextInQueue,
    addToQueue,
    removeFromQueue,
    moveInQueue,
    clearQueue,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerValue {
  const value = useContext(PlayerContext);
  if (!value) throw new Error('usePlayer must be used inside PlayerProvider');
  return value;
}

/** Convenience for song rows: is this the song currently loaded? */
export function useIsCurrent(songId: string): { isCurrent: boolean; isPlaying: boolean } {
  const { currentSong, isPlaying } = usePlayer();
  const isCurrent = currentSong?.id === songId;
  return { isCurrent, isPlaying: isCurrent && isPlaying };
}

/** Favourite toggle shared by every screen. */
export async function toggleFavorite(song: Song): Promise<Song> {
  const updated = await songsApi.setFavorite(song.id, !song.favorite);
  emit('song-updated', updated);
  return updated;
}
