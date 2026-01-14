import type { StreamOptions } from '@plugins/core/interfaces/audio-source-provider';
import type { TrackId } from '@domain/value-objects/track-id';
import type { AudioStream } from '@domain/value-objects/audio-stream';
import { createAudioStream } from '@domain/value-objects/audio-stream';
import type { StreamQuality } from '@domain/value-objects/audio-source';
import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import { getLogger } from '@shared/services/logger';
import type { ClientManager } from './client';
import { checkCache } from './cache-operations';
import { downloadToCache } from './download-operations';
import { tryHlsStream, downloadHlsToCache } from './hls-operations';
import { tryMultipleClientTypes } from './adaptive-format-operations';

const logger = getLogger('YouTubeMusic:Streaming');

export interface StreamingOperations {
	getStreamUrl(trackId: TrackId, options?: StreamOptions): Promise<Result<AudioStream, Error>>;
}

async function handleDownloadableStream(
	clientManager: ClientManager,
	videoId: string,
	quality: StreamQuality
): Promise<Result<AudioStream, Error>> {
	const client = await clientManager.createFreshClient();
	const cookies = await clientManager.getCookies();

	logger.debug('Preferring downloadable format...');

	const clientTypes = ['TV', 'ANDROID', 'IOS'] as const;
	const adaptiveResult = await tryMultipleClientTypes(client, videoId, quality, clientTypes);

	if (adaptiveResult) {
		const { stream: adaptiveStream, contentLength } = adaptiveResult;

		logger.debug(
			`Attempting to cache downloaded audio (expected: ${contentLength ?? 'unknown'} bytes)...`
		);

		const cachedFile = await downloadToCache({
			url: adaptiveStream.url,
			videoId,
			headers: adaptiveStream.headers,
			cookies,
			expectedSize: contentLength,
		});

		if (cachedFile) {
			return ok(
				createAudioStream({
					url: cachedFile,
					format: adaptiveStream.format,
					quality,
				})
			);
		}

		// If caching failed, return stream URL with cookies for download manager
		logger.debug('Caching failed, returning stream URL directly');
		const headersWithCookies = { ...adaptiveStream.headers };
		if (cookies) {
			headersWithCookies['Cookie'] = cookies;
			logger.debug('Including cookies in stream headers for download');
		}

		return ok(
			createAudioStream({
				url: adaptiveStream.url,
				format: adaptiveStream.format,
				quality: adaptiveStream.quality,
				headers: headersWithCookies,
			})
		);
	}

	// Last resort: try downloading from HLS stream
	logger.debug('Adaptive formats failed, trying HLS download...');
	const hlsUrl =
		(await tryHlsStream(client, videoId, 'IOS')) || (await tryHlsStream(client, videoId, 'TV'));

	if (hlsUrl) {
		logger.debug('Found HLS manifest, downloading segments...');
		const cachedFile = await downloadHlsToCache(hlsUrl, videoId, cookies);
		if (cachedFile) {
			return ok(
				createAudioStream({
					url: cachedFile,
					format: 'm4a',
					quality,
				})
			);
		}
		logger.debug('HLS download failed');
	}

	logger.debug('All download attempts failed');
	return err(new Error('No downloadable audio format available for this track'));
}

async function handleStreamingPlayback(
	clientManager: ClientManager,
	videoId: string,
	quality: StreamQuality
): Promise<Result<AudioStream, Error>> {
	const client = await clientManager.createFreshClient();
	const cookies = await clientManager.getCookies();

	logger.debug('Streaming playback: trying adaptive formats first...');

	const playbackClients = ['TV', 'ANDROID', 'IOS'] as const;
	const adaptiveResult = await tryMultipleClientTypes(client, videoId, quality, playbackClients);

	if (adaptiveResult) {
		const { stream: adaptiveStream, contentLength } = adaptiveResult;

		logger.debug(
			`Got adaptive stream, caching (expected: ${contentLength ?? 'unknown'} bytes)...`
		);

		const cachedFile = await downloadToCache({
			url: adaptiveStream.url,
			videoId,
			headers: adaptiveStream.headers,
			cookies,
			expectedSize: contentLength,
		});

		if (cachedFile) {
			logger.debug('Audio cached successfully for playback');
			return ok(
				createAudioStream({
					url: cachedFile,
					format: adaptiveStream.format,
					quality,
				})
			);
		}

		logger.debug('Caching failed, will try HLS fallback...');
	}

	logger.debug('Adaptive formats failed, trying HLS...');

	// Try HLS streaming
	const hlsUrl =
		(await tryHlsStream(client, videoId, 'IOS')) || (await tryHlsStream(client, videoId, 'TV'));

	if (hlsUrl) {
		// When authenticated, HLS segments require cookies but RNTP can't forward
		// headers to segment requests. Cache the audio for reliable playback.
		if (cookies) {
			logger.debug('Authenticated user: caching HLS for reliable playback...');
			const cachedFile = await downloadHlsToCache(hlsUrl, videoId, cookies, true);
			if (cachedFile) {
				logger.debug('HLS cached successfully for playback');
				return ok(
					createAudioStream({
						url: cachedFile,
						format: 'm4a',
						quality,
					})
				);
			}
			logger.debug('HLS caching failed, trying direct HLS as fallback...');
		}

		// Unauthenticated or caching failed: try direct HLS
		// Native player handles HLS natively with seeking support
		logger.debug('Using direct HLS streaming (native player support)');
		const playbackHeaders: Record<string, string> = {
			Accept: '*/*',
			Origin: 'https://www.youtube.com',
			Referer: 'https://www.youtube.com/',
			'User-Agent': 'Mozilla/5.0 (ChromiumStylePlatform) Cobalt/Version',
		};
		if (cookies) {
			playbackHeaders['Cookie'] = cookies;
		}

		return ok(
			createAudioStream({
				url: hlsUrl,
				format: 'hls',
				quality,
				headers: playbackHeaders,
			})
		);
	}

	// Nothing worked
	return err(new Error('No streaming data available - all format attempts failed'));
}

export function createStreamingOperations(clientManager: ClientManager): StreamingOperations {
	return {
		async getStreamUrl(
			trackId: TrackId,
			options?: StreamOptions
		): Promise<Result<AudioStream, Error>> {
			try {
				const videoId = trackId.sourceId;
				const quality: StreamQuality = options?.quality ?? 'high';
				const preferDownloadable = options?.preferDownloadable ?? false;

				logger.debug('Getting stream URL for video:', videoId);

				// Only use cache for downloads (preferDownloadable), not for streaming
				// Cached files from HLS downloads are fMP4 which don't support seeking
				// For streaming, we use HLS directly which supports seeking natively
				if (preferDownloadable) {
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
				}

				const cookies = await clientManager.getCookies();
				if (cookies) {
					logger.debug('Using authenticated download with cookies');
				}

				// When preferDownloadable is set (for downloads), try adaptive format first
				// HLS manifests can't be saved as files, so we need direct URLs for downloads
				if (preferDownloadable) {
					return handleDownloadableStream(clientManager, videoId, quality);
				}

				// For streaming playback, try adaptive formats first (better quality, seekable)
				// When authenticated, we cache to local file since RNTP can't forward cookies
				return handleStreamingPlayback(clientManager, videoId, quality);
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
