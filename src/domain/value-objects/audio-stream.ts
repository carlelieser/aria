/**
 * Audio Stream Value Object
 *
 * Normalized audio stream information returned by AudioSourceProvider.
 * Provides a consistent interface for audio playback regardless of source.
 */

import type { StreamQuality } from './audio-source';

/**
 * Supported audio formats
 */
export type AudioFormat =
  | 'mp3'
  | 'aac'
  | 'opus'
  | 'flac'
  | 'webm'
  | 'ogg'
  | 'm4a'
  | 'wav';

/**
 * Normalized audio stream information
 * Returned by AudioSourceProvider.getStreamUrl()
 */
export interface AudioStream {
  /** The playback URL */
  readonly url: string;

  /** Audio format/codec */
  readonly format: AudioFormat;

  /** Stream quality level */
  readonly quality: StreamQuality;

  /** Bitrate in kbps (if known) */
  readonly bitrate?: number;

  /** Sample rate in Hz (e.g., 44100, 48000) */
  readonly sampleRate?: number;

  /** Number of audio channels (1=mono, 2=stereo) */
  readonly channels?: number;

  /** Content length in bytes (if known) */
  readonly contentLength?: number;

  /** URL expiration timestamp (ms since epoch) */
  readonly expiresAt?: number;

  /** Additional HTTP headers required for playback */
  readonly headers?: Record<string, string>;
}

/**
 * Parameters for creating an AudioStream
 */
export interface CreateAudioStreamParams {
  url: string;
  format: AudioFormat;
  quality: StreamQuality;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  contentLength?: number;
  expiresAt?: number;
  headers?: Record<string, string>;
}

/**
 * Create an immutable AudioStream object
 */
export function createAudioStream(params: CreateAudioStreamParams): AudioStream {
  return Object.freeze({
    url: params.url,
    format: params.format,
    quality: params.quality,
    bitrate: params.bitrate,
    sampleRate: params.sampleRate,
    channels: params.channels,
    contentLength: params.contentLength,
    expiresAt: params.expiresAt,
    headers: params.headers ? Object.freeze({ ...params.headers }) : undefined,
  });
}

/**
 * Check if an audio stream URL has expired
 */
export function isStreamExpired(stream: AudioStream): boolean {
  if (!stream.expiresAt) return false;
  return Date.now() >= stream.expiresAt;
}

/**
 * Check if a stream is about to expire (within buffer window)
 * @param stream - The audio stream to check
 * @param bufferMs - Buffer time in milliseconds (default: 30 seconds)
 */
export function isStreamExpiringSoon(
  stream: AudioStream,
  bufferMs: number = 30000
): boolean {
  if (!stream.expiresAt) return false;
  return Date.now() + bufferMs >= stream.expiresAt;
}

/**
 * Get remaining time until stream expires
 * @returns Remaining time in milliseconds, or Infinity if no expiration
 */
export function getStreamTimeRemaining(stream: AudioStream): number {
  if (!stream.expiresAt) return Infinity;
  return Math.max(0, stream.expiresAt - Date.now());
}

/**
 * Parse audio format from MIME type string
 */
export function parseAudioFormat(mimeType: string): AudioFormat {
  const mime = mimeType.toLowerCase();

  if (mime.includes('opus')) return 'opus';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('flac')) return 'flac';
  if (mime.includes('mp4') || mime.includes('m4a')) return 'm4a';
  if (mime.includes('aac')) return 'aac';
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('mp3') || mime.includes('mpeg')) return 'mp3';

  // Default fallback
  return 'mp3';
}

/**
 * Get human-readable format label
 */
export function getFormatLabel(format: AudioFormat): string {
  const labels: Record<AudioFormat, string> = {
    mp3: 'MP3',
    aac: 'AAC',
    opus: 'Opus',
    flac: 'FLAC',
    webm: 'WebM',
    ogg: 'Ogg Vorbis',
    m4a: 'M4A',
    wav: 'WAV',
  };
  return labels[format] || format.toUpperCase();
}

/**
 * Get human-readable stream description
 */
export function getStreamDescription(stream: AudioStream): string {
  const parts: string[] = [getFormatLabel(stream.format)];

  if (stream.bitrate) {
    parts.push(`${stream.bitrate}kbps`);
  }

  if (stream.sampleRate) {
    parts.push(`${stream.sampleRate / 1000}kHz`);
  }

  return parts.join(' / ');
}
