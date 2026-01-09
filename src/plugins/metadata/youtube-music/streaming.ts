import type Innertube from 'youtubei.js/react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { StreamOptions } from '@plugins/core/interfaces/audio-source-provider';
import type { TrackId } from '@domain/value-objects/track-id';
import type { AudioStream } from '@domain/value-objects/audio-stream';
import { createAudioStream } from '@domain/value-objects/audio-stream';
import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import { getLogger } from '@shared/services/logger';
import type { ClientManager } from './client';

const logger = getLogger('YouTubeMusic:Streaming');

const CACHE_DIR = 'audio/';

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

async function downloadToCache(url: string, videoId: string): Promise<string | null> {
	const cacheDir = FileSystem.cacheDirectory + CACHE_DIR;
	const cachedFilePath = cacheDir + `${videoId}.m4a`;

	await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true }).catch(() => {});

	const downloadResult = await FileSystem.downloadAsync(url, cachedFilePath, {
		headers: {
			Accept: '*/*',
			Origin: 'https://www.youtube.com',
			Referer: 'https://www.youtube.com/',
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

async function tryAdaptiveFormat(
	client: Innertube,
	videoId: string,
	quality: string
): Promise<AudioStream | null> {
	try {
		const videoInfo = await client.getInfo(videoId, { client: 'TV' });
		const format = videoInfo.chooseFormat({ type: 'audio', quality: 'best' });

		if (format) {
			const url = await format.decipher(client.session.player);
			if (url) {
				logger.debug(`Got adaptive format: ${format.mime_type}, bitrate: ${format.bitrate}`);
				return createAudioStream({
					url,
					format: 'm4a',
					quality: quality as 'low' | 'medium' | 'high',
					headers: {
						Accept: '*/*',
						Origin: 'https://www.youtube.com',
						Referer: 'https://www.youtube.com/',
						'User-Agent': 'Mozilla/5.0 (ChromiumStylePlatform) Cobalt/Version',
					},
				});
			}
		}
	} catch (error) {
		logger.debug('Adaptive format extraction failed');
	}
	return null;
}

export interface StreamingOperations {
	getStreamUrl(trackId: TrackId, options?: StreamOptions): Promise<Result<AudioStream, Error>>;
}

export function createStreamingOperations(clientManager: ClientManager): StreamingOperations {
	return {
		async getStreamUrl(
			trackId: TrackId,
			options?: StreamOptions
		): Promise<Result<AudioStream, Error>> {
			try {
				const videoId = trackId.sourceId;
				const quality = options?.quality ?? 'high';
				const preferDownloadable = options?.preferDownloadable ?? false;

				logger.debug('Getting stream URL for video:', videoId);

				const cachedPath = await checkCache(videoId);
				if (cachedPath) {
					return ok(
						createAudioStream({
							url: cachedPath,
							format: 'm4a',
							quality,
						})
					);
				}

				const client = await clientManager.createFreshClient();

				// When preferDownloadable is set (for downloads), try adaptive format first
				// HLS manifests can't be saved as files, so we need direct URLs for downloads
				if (preferDownloadable) {
					logger.debug('Preferring downloadable format...');
					const adaptiveStream = await tryAdaptiveFormat(client, videoId, quality);
					if (adaptiveStream) {
						return ok(adaptiveStream);
					}
					logger.debug('Adaptive format failed for download, returning error');
					return err(new Error('No downloadable audio format available for this track'));
				}

				// For streaming playback, prefer HLS as it handles adaptive bitrate better
				logger.debug('Trying IOS client for HLS stream...');
				const iosHls = await tryHlsStream(client, videoId, 'IOS');
				if (iosHls) {
					logger.debug('Found HLS manifest from IOS client');
					return ok(
						createAudioStream({
							url: iosHls,
							format: 'aac',
							quality,
						})
					);
				}

				logger.debug('Trying TV client...');
				const tvHls = await tryHlsStream(client, videoId, 'TV');
				if (tvHls) {
					logger.debug('Found HLS manifest from TV client');
					return ok(
						createAudioStream({
							url: tvHls,
							format: 'aac',
							quality,
						})
					);
				}

				// Fallback: try adaptive format and cache it
				const adaptiveStream = await tryAdaptiveFormat(client, videoId, quality);
				if (adaptiveStream) {
					const cachedFile = await downloadToCache(adaptiveStream.url, videoId);
					if (cachedFile) {
						return ok(
							createAudioStream({
								url: cachedFile,
								format: 'm4a',
								quality,
							})
						);
					}
				}

				return err(
					new Error('No streaming data available - HLS and adaptive formats failed')
				);
			} catch (error) {
				logger.error('getStreamUrl error', error instanceof Error ? error : undefined);
				return err(
					error instanceof Error
						? error
						: new Error(`Failed to get stream URL: ${String(error)}`)
				);
			}
		},
	};
}
