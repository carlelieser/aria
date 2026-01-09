/**
 * Audio Source Provider Interface
 *
 * Provides audio stream resolution for tracks.
 * Separate from MetadataProvider to allow specialized audio-only plugins
 * (e.g., local file provider, caching proxy) and metadata-only plugins
 * (e.g., MusicBrainz for enrichment).
 */

import type { BasePlugin } from './base-plugin';
import type { AsyncResult } from '@shared/types/result';
import type { Track } from '@domain/entities/track';
import type { TrackId } from '@domain/value-objects/track-id';
import type { StreamQuality } from '@domain/value-objects/audio-source';
import type { AudioStream, AudioFormat } from '@domain/value-objects/audio-stream';

/**
 * Audio source provider capabilities
 */
export type AudioSourceCapability =
  | 'get-stream-url' // Can resolve stream URLs
  | 'get-formats' // Can list available formats
  | 'quality-selection' // Supports quality selection
  | 'format-selection' // Supports format selection
  | 'range-requests' // Supports HTTP range requests (seeking)
  | 'adaptive-streaming' // Supports adaptive bitrate streaming
  | 'offline-playback' // Supports offline/cached playback
  | 'drm'; // Requires DRM handling

/**
 * Available audio format information
 * Returned by getAvailableFormats()
 */
export interface AvailableFormat {
  /** Audio format */
  readonly format: AudioFormat;

  /** Quality level */
  readonly quality: StreamQuality;

  /** Bitrate in kbps */
  readonly bitrate?: number;

  /** Sample rate in Hz */
  readonly sampleRate?: number;

  /** Human-readable label (e.g., "High Quality (256kbps)") */
  readonly label?: string;

  /** Whether this is the recommended/default format */
  readonly isDefault?: boolean;
}

/**
 * Options for stream URL resolution
 */
export interface StreamOptions {
  /** Preferred quality level */
  readonly quality?: StreamQuality;

  /** Preferred audio format */
  readonly format?: AudioFormat;

  /** Prefer audio-only streams (no video component) */
  readonly audioOnly?: boolean;

  /** Maximum bitrate in kbps (for bandwidth constraints) */
  readonly maxBitrate?: number;
}

/**
 * Audio source provider plugin interface
 *
 * Implementations should:
 * - Return consistent AudioStream objects regardless of underlying source
 * - Handle URL expiration and refresh internally when possible
 * - Support the supportsTrack() check for provider selection
 *
 * @example
 * ```ts
 * // YouTube Music provider implementing audio source
 * class YouTubeMusicAudioSource implements AudioSourceProvider {
 *   supportsTrack(track: Track): boolean {
 *     return track.source.type === 'streaming' &&
 *            track.source.sourcePlugin === 'youtube-music';
 *   }
 *
 *   async getStreamUrl(trackId: TrackId, options?: StreamOptions) {
 *     const stream = await this.fetchStream(trackId, options);
 *     return ok(createAudioStream({
 *       url: stream.url,
 *       format: 'opus',
 *       quality: options?.quality || 'high',
 *       bitrate: stream.bitrate,
 *       expiresAt: Date.now() + 6 * 60 * 60 * 1000,
 *     }));
 *   }
 * }
 * ```
 */
export interface AudioSourceProvider extends BasePlugin {
  /**
   * Set of supported capabilities
   */
  readonly audioCapabilities: Set<AudioSourceCapability>;

  /**
   * Check if this provider can serve audio for a given track
   *
   * Used by the playback service to select the appropriate provider.
   * Should check the track's source type and plugin ID.
   *
   * @param track - The track to check
   * @returns true if this provider can provide audio for the track
   */
  supportsTrack(track: Track): boolean;

  /**
   * Get the stream URL for a track
   *
   * Returns normalized AudioStream data that can be used by any audio player.
   * The URL may be temporary and have an expiration time.
   *
   * @param trackId - The track identifier
   * @param options - Stream resolution options (quality, format preferences)
   * @returns AudioStream with playback URL and metadata
   */
  getStreamUrl(
    trackId: TrackId,
    options?: StreamOptions
  ): AsyncResult<AudioStream, Error>;

  /**
   * Get available audio formats for a track
   *
   * Returns all available quality/format combinations.
   * Useful for quality selection UI or adaptive streaming.
   *
   * @param trackId - The track identifier
   * @returns Array of available formats sorted by quality (highest first)
   */
  getAvailableFormats?(trackId: TrackId): AsyncResult<AvailableFormat[], Error>;

  /**
   * Preload stream information for an upcoming track
   *
   * Useful for gapless playback preparation.
   * Implementation should cache the stream URL for quick access.
   *
   * @param trackId - The track to preload
   */
  preloadStream?(trackId: TrackId): AsyncResult<void, Error>;

  /**
   * Check if a specific capability is supported
   *
   * @param capability - The capability to check
   * @returns true if the capability is supported
   */
  hasAudioCapability(capability: AudioSourceCapability): boolean;
}

/**
 * Type guard to check if a plugin is an audio source provider
 */
export function isAudioSourceProvider(
  plugin: BasePlugin
): plugin is AudioSourceProvider {
  return (
    plugin.manifest.category === 'audio-source-provider' &&
    'getStreamUrl' in plugin &&
    'supportsTrack' in plugin &&
    'audioCapabilities' in plugin
  );
}

/**
 * Type guard to check if a plugin implements AudioSourceProvider
 * (regardless of primary category)
 *
 * Useful for plugins like YouTube Music that implement both
 * MetadataProvider and AudioSourceProvider
 */
export function hasAudioSourceCapability(
  plugin: BasePlugin
): plugin is BasePlugin & AudioSourceProvider {
  return (
    'getStreamUrl' in plugin &&
    'supportsTrack' in plugin &&
    'audioCapabilities' in plugin
  );
}
