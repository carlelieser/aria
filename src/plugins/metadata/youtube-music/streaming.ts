/**
 * YouTube Music audio stream resolution
 */

import Innertube from 'youtubei.js/react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { StreamOptions } from '../../core/interfaces/audio-source-provider';
import type { TrackId } from '../../../domain/value-objects/track-id';
import type { AudioStream } from '../../../domain/value-objects/audio-stream';
import { createAudioStream } from '../../../domain/value-objects/audio-stream';
import type { Result } from '../../../shared/types/result';
import { ok, err } from '../../../shared/types/result';
import { getLogger } from '../../../shared/services/logger';
import type { YouTubeMusicConfig } from './config';

const logger = getLogger('YouTubeMusic:Streaming');

const CACHE_DIR = 'audio/';

/**
 * Check for cached audio file
 */
async function checkCache(videoId: string): Promise<string | null> {
  const cacheDir = FileSystem.cacheDirectory + CACHE_DIR;
  const cachedFilePath = cacheDir + `${videoId}.m4a`;
  const fileInfo = await FileSystem.getInfoAsync(cachedFilePath);

  if (fileInfo.exists && 'size' in fileInfo && (fileInfo.size as number) > 10000) {
    logger.debug(`Using cached file: ${cachedFilePath}`);
    return cachedFilePath;
  }

  if (fileInfo.exists) {
    await FileSystem.deleteAsync(cachedFilePath, { idempotent: true });
  }

  return null;
}

/**
 * Try to get HLS stream from a specific client type
 */
async function tryHlsStream(
  client: Innertube,
  videoId: string,
  clientType: 'IOS' | 'TV'
): Promise<string | null> {
  try {
    const videoInfo = await client.getInfo(videoId, { client: clientType });
    return videoInfo.streaming_data?.hls_manifest_url ?? null;
  } catch {
    return null;
  }
}

/**
 * Download audio to cache
 */
async function downloadToCache(url: string, videoId: string): Promise<string | null> {
  const cacheDir = FileSystem.cacheDirectory + CACHE_DIR;
  const cachedFilePath = cacheDir + `${videoId}.m4a`;

  await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true }).catch(() => {});

  const downloadResult = await FileSystem.downloadAsync(url, cachedFilePath, {
    headers: {
      'Accept': '*/*',
      'Origin': 'https://www.youtube.com',
      'Referer': 'https://www.youtube.com/',
      'User-Agent': 'Mozilla/5.0 (ChromiumStylePlatform) Cobalt/Version',
    },
  });

  if (downloadResult.status === 200) {
    logger.debug(`Audio cached to: ${cachedFilePath}`);
    return cachedFilePath;
  }

  logger.warn(`Download failed with status: ${downloadResult.status}`);
  return null;
}

/**
 * Streaming operations interface
 */
export interface StreamingOperations {
  getStreamUrl(trackId: TrackId, options?: StreamOptions): Promise<Result<AudioStream, Error>>;
}

/**
 * Create streaming operations
 */
export function createStreamingOperations(config: YouTubeMusicConfig): StreamingOperations {
  return {
    async getStreamUrl(
      trackId: TrackId,
      options?: StreamOptions
    ): Promise<Result<AudioStream, Error>> {
      try {
        const videoId = trackId.sourceId;
        logger.debug('Getting stream URL for video:', videoId);

        // Check cache first
        const cachedPath = await checkCache(videoId);
        if (cachedPath) {
          return ok(createAudioStream({
            url: cachedPath,
            format: 'm4a',
            quality: options?.quality ?? 'high',
          }));
        }

        // Create fresh client for each request
        const client = await Innertube.create({
          lang: config.lang,
          location: config.location,
        });

        // Try IOS client for HLS
        logger.debug('Trying IOS client for HLS stream...');
        const iosHls = await tryHlsStream(client, videoId, 'IOS');
        if (iosHls) {
          logger.debug('Found HLS manifest from IOS client');
          return ok(createAudioStream({
            url: iosHls,
            format: 'aac',
            quality: options?.quality ?? 'high',
          }));
        }

        // Try TV client for HLS
        logger.debug('Trying TV client...');
        const tvHls = await tryHlsStream(client, videoId, 'TV');
        if (tvHls) {
          logger.debug('Found HLS manifest from TV client');
          return ok(createAudioStream({
            url: tvHls,
            format: 'aac',
            quality: options?.quality ?? 'high',
          }));
        }

        // Try adaptive format with download
        try {
          const videoInfo = await client.getInfo(videoId, { client: 'TV' });
          const format = videoInfo.chooseFormat({ type: 'audio', quality: 'best' });

          if (format) {
            const url = await format.decipher(client.session.player);
            if (url) {
              logger.debug(`Got format: ${format.mime_type}, bitrate: ${format.bitrate}`);

              const cachedFile = await downloadToCache(url, videoId);
              if (cachedFile) {
                return ok(createAudioStream({
                  url: cachedFile,
                  format: 'm4a',
                  quality: options?.quality ?? 'high',
                }));
              }
            }
          }
        } catch (tvError) {
          logger.debug('TV client adaptive format failed');
        }

        return err(new Error('No streaming data available - HLS and adaptive formats failed'));
      } catch (error) {
        logger.error('getStreamUrl error', error instanceof Error ? error : undefined);
        return err(
          error instanceof Error ? error : new Error(`Failed to get stream URL: ${String(error)}`)
        );
      }
    },
  };
}
