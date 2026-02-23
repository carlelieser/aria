import type { StreamOptions } from '@plugins/core/interfaces/audio-source-provider';
import type { TrackId } from '@domain/value-objects/track-id';
import type { AudioFormat, AudioStream } from '@domain/value-objects/audio-stream';
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
import type { InnertubeClientType } from './adaptive-format-operations';

const logger = getLogger('YouTubeMusic:Streaming');

const ADAPTIVE_CLIENT_TYPES: readonly InnertubeClientType[] = ['TV', 'ANDROID', 'IOS'];

export interface StreamingOperations {
	getStreamUrl(trackId: TrackId, options?: StreamOptions): Promise<Result<AudioStream, Error>>;
}

async function handleDownloadableStream(
	clientManager: ClientManager,
	videoId: string,
	quality: StreamQuality,
	cookies: string | undefined,
	onProgress?: (progress: number) => void
): Promise<Result<AudioStream, Error>> {
	let client = await clientManager.getClient();

	logger.debug('Preferring downloadable format...');

	let { result: adaptiveResult, loginRequired } = await tryMultipleClientTypes(
		client,
		videoId,
		quality,
		ADAPTIVE_CLIENT_TYPES,
		cookies
	);

	if (loginRequired && !adaptiveResult) {
		logger.warn('Cookies are bot-flagged — retrying with unauthenticated client');
		await clientManager.refreshAuth();
		client = await clientManager.createFreshClient({ skipAuth: true });

		({ result: adaptiveResult } = await tryMultipleClientTypes(
			client,
			videoId,
			quality,
			ADAPTIVE_CLIENT_TYPES
		));
	}

	if (adaptiveResult) {
		const { stream: adaptiveStream, contentLength } = adaptiveResult;

		logger.debug(
			`Attempting to cache downloaded audio (expected: ${contentLength ?? 'unknown'} bytes)...`
		);

		const cachedFile = await downloadToCache({
			url: adaptiveStream.url,
			videoId,
			format: adaptiveStream.format,
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

		logger.debug('Adaptive caching failed, will try HLS fallback...');
	}

	// Fallback: try downloading from HLS stream
	logger.debug('Adaptive formats failed, trying HLS download...');
	const hlsUrl =
		(await tryHlsStream(client, videoId, 'IOS')) || (await tryHlsStream(client, videoId, 'TV'));

	if (hlsUrl) {
		logger.debug('Found HLS manifest, downloading segments...');
		const hlsResult = await downloadHlsToCache(hlsUrl, videoId, cookies, onProgress);
		if (hlsResult) {
			return ok(
				createAudioStream({
					url: hlsResult.path,
					format: hlsResult.format as AudioFormat,
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
	quality: StreamQuality,
	cookies: string | undefined
): Promise<Result<AudioStream, Error>> {
	const client = await clientManager.getClient();

	// Try HLS streaming — works for both authenticated and unauthenticated users.
	// dash-player handles HLS natively with seeking support.
	const hlsUrl =
		(await tryHlsStream(client, videoId, 'IOS')) || (await tryHlsStream(client, videoId, 'TV'));

	if (hlsUrl) {
		logger.debug('Using direct HLS streaming');

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
				const { onProgress } = options ?? {};

				logger.debug('Getting stream URL for video:', videoId);

				// Check file cache for both streaming and download paths.
				// Background caching from previous plays means the file is
				// already on-disk and can be served instantly.
				const cached = await checkCache(videoId);
				if (cached) {
					logger.debug(`Using cached audio file for playback (format: ${cached.format})`);
					return ok(
						createAudioStream({
							url: cached.path,
							format: cached.format as AudioFormat,
							quality,
						})
					);
				}

				const cookies = await clientManager.getCookies();
				if (cookies) {
					logger.debug('Using authenticated download with cookies');
				}

				// When preferDownloadable is set (for downloads), try adaptive format first
				// HLS manifests can't be saved as files, so we need direct URLs for downloads
				if (preferDownloadable) {
					return handleDownloadableStream(
						clientManager,
						videoId,
						quality,
						cookies,
						onProgress
					);
				}

				return handleStreamingPlayback(clientManager, videoId, quality, cookies);
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
