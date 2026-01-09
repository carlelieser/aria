import type { SourceType } from './track-id';

/**
 * Audio file formats
 */
export type AudioFileType = 'mp3' | 'flac' | 'aac' | 'm4a' | 'wav' | 'ogg' | 'opus' | 'webm';

/**
 * Streaming quality levels
 */
export type StreamQuality = 'low' | 'medium' | 'high' | 'lossless';

/**
 * Audio source for local files
 */
export interface LocalAudioSource {
  readonly type: 'local';
  /** File path or URI on the device */
  readonly filePath: string;
  /** Audio file type */
  readonly fileType?: AudioFileType;
  /** File size in bytes */
  readonly fileSize?: number;
}

/**
 * Audio source for streaming services
 */
export interface StreamingAudioSource {
  readonly type: 'streaming';
  /** Plugin ID that provides this stream */
  readonly sourcePlugin: SourceType;
  /** ID within the source system */
  readonly sourceId: string;
  /** Pre-resolved stream URL (may be temporary) */
  readonly streamUrl?: string;
  /** Preferred quality */
  readonly quality?: StreamQuality;
  /** Whether the stream URL has expired */
  readonly isExpired?: boolean;
  /** Expiration timestamp (if known) */
  readonly expiresAt?: number;
}

/**
 * Combined audio source type
 */
export type AudioSource = LocalAudioSource | StreamingAudioSource;

/**
 * Create a local audio source
 */
export function createLocalSource(
  filePath: string,
  fileType?: AudioFileType,
  fileSize?: number
): LocalAudioSource {
  return Object.freeze({
    type: 'local',
    filePath,
    fileType,
    fileSize,
  });
}

/**
 * Create a streaming audio source
 */
export function createStreamingSource(
  sourcePlugin: SourceType,
  sourceId: string,
  options?: {
    streamUrl?: string;
    quality?: StreamQuality;
    expiresAt?: number;
  }
): StreamingAudioSource {
  return Object.freeze({
    type: 'streaming',
    sourcePlugin,
    sourceId,
    streamUrl: options?.streamUrl,
    quality: options?.quality,
    isExpired: false,
    expiresAt: options?.expiresAt,
  });
}

/**
 * Check if a source is local
 */
export function isLocalSource(source: AudioSource): source is LocalAudioSource {
  return source.type === 'local';
}

/**
 * Check if a source is streaming
 */
export function isStreamingSource(source: AudioSource): source is StreamingAudioSource {
  return source.type === 'streaming';
}

/**
 * Get the playback URI for a source
 * For local sources, returns the file path.
 * For streaming sources, returns the stream URL if available, otherwise null.
 */
export function getPlaybackUri(source: AudioSource): string | null {
  if (isLocalSource(source)) {
    return source.filePath;
  }

  if (source.streamUrl && !source.isExpired) {
    // Check if the URL has expired
    if (source.expiresAt && Date.now() > source.expiresAt) {
      return null;
    }
    return source.streamUrl;
  }

  return null;
}

/**
 * Check if a streaming source needs URL refresh
 */
export function needsStreamUrlRefresh(source: AudioSource): boolean {
  if (isLocalSource(source)) {
    return false;
  }

  if (!source.streamUrl || source.isExpired) {
    return true;
  }

  // If we have an expiration time, check if we're within a buffer window
  if (source.expiresAt) {
    const bufferMs = 30 * 1000; // 30 second buffer
    return Date.now() + bufferMs > source.expiresAt;
  }

  return false;
}

/**
 * Update a streaming source with a new URL
 */
export function updateStreamUrl(
  source: StreamingAudioSource,
  streamUrl: string,
  expiresAt?: number
): StreamingAudioSource {
  return Object.freeze({
    ...source,
    streamUrl,
    isExpired: false,
    expiresAt,
  });
}

/**
 * Quality bitrate mappings (approximate)
 */
export const QualityBitrates: Record<StreamQuality, number> = {
  low: 64,
  medium: 128,
  high: 256,
  lossless: 1411, // CD quality
};

/**
 * Get human-readable quality label
 */
export function getQualityLabel(quality: StreamQuality): string {
  switch (quality) {
    case 'low':
      return 'Low (64 kbps)';
    case 'medium':
      return 'Normal (128 kbps)';
    case 'high':
      return 'High (256 kbps)';
    case 'lossless':
      return 'Lossless';
    default:
      return quality;
  }
}
