import type { Track } from '../entities/track';
import { Duration } from './duration';

/**
 * Playback status
 */
export type PlaybackStatus =
  | 'idle'      // No track loaded
  | 'loading'   // Track is being loaded
  | 'playing'   // Track is playing
  | 'paused'    // Track is paused
  | 'buffering' // Waiting for data
  | 'error';    // Playback error occurred

/**
 * Repeat mode
 */
export type RepeatMode = 'off' | 'one' | 'all';

/**
 * Playback state value object
 */
export interface PlaybackState {
  /** Current playback status */
  readonly status: PlaybackStatus;
  /** Currently playing track */
  readonly currentTrack: Track | null;
  /** Current playback position */
  readonly position: Duration;
  /** Total track duration */
  readonly duration: Duration;
  /** Volume level (0-1) */
  readonly volume: number;
  /** Whether audio is muted */
  readonly isMuted: boolean;
  /** Repeat mode */
  readonly repeatMode: RepeatMode;
  /** Whether shuffle is enabled */
  readonly isShuffled: boolean;
  /** Playback rate (0.5 - 2.0) */
  readonly playbackRate: number;
  /** Error message if status is 'error' */
  readonly error?: string;
}

/**
 * Queue state
 */
export interface QueueState {
  /** Tracks in the queue */
  readonly tracks: Track[];
  /** Current track index in the queue (-1 if empty) */
  readonly currentIndex: number;
  /** Original queue order (before shuffle) */
  readonly originalOrder: Track[];
}

/**
 * Combined player state
 */
export interface PlayerState extends PlaybackState {
  /** Queue state */
  readonly queue: QueueState;
}

/**
 * Initial/default playback state
 */
export const initialPlaybackState: PlaybackState = Object.freeze({
  status: 'idle',
  currentTrack: null,
  position: Duration.ZERO,
  duration: Duration.ZERO,
  volume: 1,
  isMuted: false,
  repeatMode: 'off',
  isShuffled: false,
  playbackRate: 1,
});

/**
 * Initial/default queue state
 */
export const initialQueueState: QueueState = Object.freeze({
  tracks: [],
  currentIndex: -1,
  originalOrder: [],
});

/**
 * Initial/default player state
 */
export const initialPlayerState: PlayerState = Object.freeze({
  ...initialPlaybackState,
  queue: initialQueueState,
});

/**
 * Check if playback is active (playing or paused with a track)
 */
export function isPlaybackActive(state: PlaybackState): boolean {
  return state.currentTrack !== null && state.status !== 'idle';
}

/**
 * Check if currently playing
 */
export function isPlaying(state: PlaybackState): boolean {
  return state.status === 'playing';
}

/**
 * Check if currently paused
 */
export function isPaused(state: PlaybackState): boolean {
  return state.status === 'paused';
}

/**
 * Check if currently loading
 */
export function isLoading(state: PlaybackState): boolean {
  return state.status === 'loading' || state.status === 'buffering';
}

/**
 * Get progress as a percentage (0-100)
 */
export function getProgressPercent(state: PlaybackState): number {
  if (state.duration.isZero()) {
    return 0;
  }
  return (state.position.totalMilliseconds / state.duration.totalMilliseconds) * 100;
}

/**
 * Get remaining duration
 */
export function getRemainingDuration(state: PlaybackState): Duration {
  return state.duration.subtract(state.position);
}

/**
 * Check if there's a next track in the queue
 */
export function hasNextTrack(queue: QueueState, repeatMode: RepeatMode): boolean {
  if (queue.tracks.length === 0) return false;
  if (repeatMode === 'all') return true;
  return queue.currentIndex < queue.tracks.length - 1;
}

/**
 * Check if there's a previous track in the queue
 */
export function hasPreviousTrack(queue: QueueState): boolean {
  return queue.currentIndex > 0;
}

/**
 * Get the next track index
 */
export function getNextTrackIndex(queue: QueueState, repeatMode: RepeatMode): number {
  if (queue.tracks.length === 0) return -1;

  const nextIndex = queue.currentIndex + 1;

  if (nextIndex < queue.tracks.length) {
    return nextIndex;
  }

  if (repeatMode === 'all') {
    return 0;
  }

  return -1;
}

/**
 * Get the previous track index
 */
export function getPreviousTrackIndex(queue: QueueState): number {
  if (queue.currentIndex <= 0) return 0;
  return queue.currentIndex - 1;
}

/**
 * Shuffle an array (Fisher-Yates algorithm)
 */
export function shuffleArray<T>(array: T[], keepCurrentAtIndex?: number): T[] {
  const result = [...array];

  // If we need to keep the current track at a specific index
  let keptItem: T | undefined;
  if (keepCurrentAtIndex !== undefined && keepCurrentAtIndex >= 0) {
    keptItem = result.splice(keepCurrentAtIndex, 1)[0];
  }

  // Fisher-Yates shuffle
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  // Put the kept item back at the original index
  if (keptItem !== undefined && keepCurrentAtIndex !== undefined) {
    result.splice(keepCurrentAtIndex, 0, keptItem);
  }

  return result;
}
