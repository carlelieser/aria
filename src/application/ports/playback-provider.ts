import type { Track } from '../../domain/entities/track';
import type { Duration } from '../../domain/value-objects/duration';
import type { PlaybackStatus } from '../../domain/value-objects/playback-state';
import type { Result } from '../../shared/types/result';

/**
 * Playback event types
 */
export type PlaybackEvent =
  | { type: 'status-changed'; status: PlaybackStatus }
  | { type: 'position-changed'; position: Duration }
  | { type: 'track-ended' }
  | { type: 'error'; error: string };

/**
 * Playback event listener
 */
export type PlaybackEventListener = (event: PlaybackEvent) => void;

/**
 * Playback provider interface
 * Abstracts the underlying audio playback implementation
 */
export interface PlaybackProvider {
  /**
   * Load and play a track from a stream URL
   */
  play(streamUrl: string): Promise<Result<void, Error>>;

  /**
   * Pause playback
   */
  pause(): Promise<Result<void, Error>>;

  /**
   * Resume playback
   */
  resume(): Promise<Result<void, Error>>;

  /**
   * Stop playback and release resources
   */
  stop(): Promise<Result<void, Error>>;

  /**
   * Seek to a specific position
   */
  seekTo(position: Duration): Promise<Result<void, Error>>;

  /**
   * Set playback volume (0-1)
   */
  setVolume(volume: number): Promise<Result<void, Error>>;

  /**
   * Set playback rate (0.5 - 2.0)
   */
  setPlaybackRate(rate: number): Promise<Result<void, Error>>;

  /**
   * Get current playback position
   */
  getPosition(): Promise<Result<Duration, Error>>;

  /**
   * Get track duration
   */
  getDuration(): Promise<Result<Duration, Error>>;

  /**
   * Subscribe to playback events
   */
  addEventListener(listener: PlaybackEventListener): void;

  /**
   * Unsubscribe from playback events
   */
  removeEventListener(listener: PlaybackEventListener): void;

  /**
   * Release all resources
   */
  dispose(): Promise<void>;
}
