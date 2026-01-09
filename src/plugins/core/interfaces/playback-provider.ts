import type { BasePlugin } from './base-plugin';
import type { Result, AsyncResult } from '@shared/types/result';
import type { Track } from '@domain/entities/track';
import type { Duration } from '@domain/value-objects/duration';
import type { PlaybackStatus, RepeatMode } from '@domain/value-objects/playback-state';

/**
 * Playback provider capabilities
 */
export type PlaybackCapability =
  | 'play'              // Can play audio
  | 'pause'             // Can pause playback
  | 'seek'              // Can seek to position
  | 'volume-control'    // Can control volume
  | 'queue-management'  // Supports queue operations
  | 'gapless-playback'  // Supports gapless playback
  | 'crossfade'         // Supports crossfading
  | 'equalizer'         // Supports EQ controls
  | 'speed-control'     // Can change playback speed
  | 'background-play'   // Can play in background
  | 'audio-focus';      // Handles audio focus

/**
 * Playback event types
 */
export type PlaybackEvent =
  | { type: 'status-change'; status: PlaybackStatus; timestamp: number }
  | { type: 'track-change'; track: Track | null; timestamp: number }
  | { type: 'position-change'; position: Duration; timestamp: number }
  | { type: 'duration-change'; duration: Duration; timestamp: number }
  | { type: 'volume-change'; volume: number; timestamp: number }
  | { type: 'rate-change'; rate: number; timestamp: number }
  | { type: 'queue-change'; tracks: Track[]; currentIndex: number; timestamp: number }
  | { type: 'repeat-mode-change'; mode: RepeatMode; timestamp: number }
  | { type: 'shuffle-change'; enabled: boolean; timestamp: number }
  | { type: 'buffer-progress'; percent: number; timestamp: number }
  | { type: 'error'; error: Error; timestamp: number }
  | { type: 'ended'; timestamp: number };

/**
 * Playback event listener callback
 */
export type PlaybackEventListener = (event: PlaybackEvent) => void;

/**
 * Queue item with metadata
 */
export interface QueueItem {
  /** The track */
  readonly track: Track;
  /** Stream URL for this track */
  readonly streamUrl?: string;
  /** Whether this track is currently active */
  readonly isActive: boolean;
  /** Queue position */
  readonly position: number;
}

/**
 * Audio output device information
 */
export interface AudioDevice {
  /** Device ID */
  readonly id: string;
  /** Device name */
  readonly name: string;
  /** Device type */
  readonly type: 'speaker' | 'headphones' | 'bluetooth' | 'airplay' | 'chromecast' | 'other';
  /** Whether this is the default device */
  readonly isDefault: boolean;
  /** Whether this device is currently active */
  readonly isActive: boolean;
}

/**
 * Equalizer preset
 */
export interface EqualizerPreset {
  /** Preset name */
  readonly name: string;
  /** Gain values for each band (in dB) */
  readonly gains: number[];
}

/**
 * Playback provider plugin interface
 * Extends BasePlugin with playback-specific operations
 */
export interface PlaybackProvider extends BasePlugin {
  /**
   * Get provider capabilities
   */
  readonly capabilities: Set<PlaybackCapability>;

  /**
   * Check if this provider can handle the given URL.
   * Used for automatic routing of URLs to the appropriate provider.
   * If not implemented, the provider is used as a fallback.
   */
  canHandle?(url: string): boolean;

  /**
   * Play a track
   * @param track - The track to play
   * @param streamUrl - The audio stream URL
   * @param startPosition - Optional starting position
   * @param headers - Optional HTTP headers for the stream request
   */
  play(track: Track, streamUrl: string, startPosition?: Duration, headers?: Record<string, string>): AsyncResult<void, Error>;

  /**
   * Pause playback
   */
  pause(): AsyncResult<void, Error>;

  /**
   * Resume playback
   */
  resume(): AsyncResult<void, Error>;

  /**
   * Stop playback and reset state
   */
  stop(): AsyncResult<void, Error>;

  /**
   * Seek to a specific position
   * @param position - Target position
   */
  seek(position: Duration): AsyncResult<void, Error>;

  /**
   * Set playback volume
   * @param volume - Volume level (0-1)
   */
  setVolume(volume: number): AsyncResult<void, Error>;

  /**
   * Get current volume
   */
  getVolume(): number;

  /**
   * Set playback rate/speed
   * @param rate - Playback rate (0.5 - 2.0)
   */
  setPlaybackRate?(rate: number): AsyncResult<void, Error>;

  /**
   * Get current playback rate
   */
  getPlaybackRate?(): number;

  /**
   * Get current playback status
   */
  getStatus(): PlaybackStatus;

  /**
   * Get current playback position
   */
  getPosition(): Duration;

  /**
   * Get current track duration
   */
  getDuration(): Duration;

  /**
   * Get currently playing track
   */
  getCurrentTrack(): Track | null;

  /**
   * Get the current queue
   */
  getQueue(): QueueItem[];

  /**
   * Set/replace the entire queue
   * @param tracks - New queue tracks
   * @param startIndex - Index to start playing from (default: 0)
   */
  setQueue(tracks: Track[], startIndex?: number): AsyncResult<void, Error>;

  /**
   * Add tracks to the queue
   * @param tracks - Tracks to add
   * @param atIndex - Optional index to insert at (default: end of queue)
   */
  addToQueue(tracks: Track[], atIndex?: number): Result<void, Error>;

  /**
   * Remove a track from the queue
   * @param index - Index of track to remove
   */
  removeFromQueue(index: number): Result<void, Error>;

  /**
   * Move a track in the queue
   * @param fromIndex - Current index
   * @param toIndex - Target index
   */
  moveInQueue?(fromIndex: number, toIndex: number): Result<void, Error>;

  /**
   * Clear the queue
   */
  clearQueue(): Result<void, Error>;

  /**
   * Skip to next track in queue
   */
  skipToNext(): AsyncResult<void, Error>;

  /**
   * Skip to previous track in queue
   */
  skipToPrevious(): AsyncResult<void, Error>;

  /**
   * Skip to a specific track in the queue
   * @param index - Queue index to skip to
   */
  skipToIndex?(index: number): AsyncResult<void, Error>;

  /**
   * Set repeat mode
   * @param mode - Repeat mode ('off', 'one', 'all')
   */
  setRepeatMode(mode: RepeatMode): Result<void, Error>;

  /**
   * Get current repeat mode
   */
  getRepeatMode(): RepeatMode;

  /**
   * Set shuffle mode
   * @param enabled - Whether shuffle is enabled
   */
  setShuffle(enabled: boolean): Result<void, Error>;

  /**
   * Get current shuffle state
   */
  isShuffle(): boolean;

  /**
   * Enable crossfade between tracks
   * @param durationMs - Crossfade duration in milliseconds
   */
  setCrossfade?(durationMs: number): Result<void, Error>;

  /**
   * Get available audio output devices
   */
  getAudioDevices?(): AsyncResult<AudioDevice[], Error>;

  /**
   * Set active audio output device
   * @param deviceId - Device ID to activate
   */
  setAudioDevice?(deviceId: string): AsyncResult<void, Error>;

  /**
   * Get equalizer presets
   */
  getEqualizerPresets?(): EqualizerPreset[];

  /**
   * Apply equalizer preset
   * @param preset - Preset name or custom gains
   */
  setEqualizer?(preset: string | number[]): Result<void, Error>;

  /**
   * Add an event listener
   * @param listener - Event listener callback
   * @returns Cleanup function to remove the listener
   */
  addEventListener(listener: PlaybackEventListener): () => void;

  /**
   * Remove an event listener
   * @param listener - Event listener to remove
   */
  removeEventListener(listener: PlaybackEventListener): void;

  /**
   * Preload a track for gapless playback
   * @param track - Track to preload
   * @param streamUrl - Stream URL for the track
   */
  preloadTrack?(track: Track, streamUrl: string): AsyncResult<void, Error>;

  /**
   * Check if a capability is supported
   */
  hasCapability(capability: PlaybackCapability): boolean;
}

/**
 * Type guard to check if a plugin is a playback provider
 */
export function isPlaybackProvider(plugin: BasePlugin): plugin is PlaybackProvider {
  return (
    plugin.manifest.category === 'playback-provider' &&
    'play' in plugin &&
    'pause' in plugin &&
    'stop' in plugin
  );
}
