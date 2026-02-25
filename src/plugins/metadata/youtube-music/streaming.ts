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
import { tryHlsStream, downloadHlsToCache, rewriteHlsManifest } from './hls-operations';
import { tryMultipleClientTypes } from './adaptive-format-operations';
import type { AdaptiveFormatResult, InnertubeClientType } from './adaptive-format-operations';

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
	const adaptiveResult = await tryAdaptiveFormats(clientManager, videoId, quality, cookies);

	if (adaptiveResult) {
		const cached = await cacheAdaptiveStream(adaptiveResult, videoId, quality, cookies);
		if (cached) return cached;
	}

	const hlsResult = await tryHlsDownloadFallback(
		clientManager,
		videoId,
		quality,
		cookies,
		onProgress
	);
	if (hlsResult) return hlsResult;

	logger.debug('All download attempts failed');
	return err(new Error('No downloadable audio format available for this track'));
}

async function tryAdaptiveFormats(
	clientManager: ClientManager,
	videoId: string,
	quality: StreamQuality,
	cookies: string | undefined
): Promise<AdaptiveFormatResult | null> {
	let client = await clientManager.getClient();
	logger.debug('Preferring downloadable format...');
	let { result, loginRequired } = await tryMultipleClientTypes(
		client,
		videoId,
		quality,
		ADAPTIVE_CLIENT_TYPES,
		cookies
	);
	if (loginRequired && !result) {
		result = await retryWithFreshClient(clientManager, videoId, quality);
	}
	return result ?? null;
}

async function retryWithFreshClient(
	clientManager: ClientManager,
	videoId: string,
	quality: StreamQuality
): Promise<AdaptiveFormatResult | null> {
	logger.warn('Cookies are bot-flagged -- retrying with unauthenticated client');
	await clientManager.refreshAuth();
	const client = await clientManager.createFreshClient({ skipAuth: true });
	const { result } = await tryMultipleClientTypes(
		client,
		videoId,
		quality,
		ADAPTIVE_CLIENT_TYPES
	);
	return result;
}

async function cacheAdaptiveStream(
	{ stream: adaptiveStream, contentLength }: AdaptiveFormatResult,
	videoId: string,
	quality: StreamQuality,
	cookies: string | undefined
): Promise<Result<AudioStream, Error> | null> {
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
	if (!cachedFile) {
		logger.debug('Adaptive caching failed, will try HLS fallback...');
		return null;
	}
	return ok(createAudioStream({ url: cachedFile, format: adaptiveStream.format, quality }));
}

async function tryHlsDownloadFallback(
	clientManager: ClientManager,
	videoId: string,
	quality: StreamQuality,
	cookies: string | undefined,
	onProgress?: (progress: number) => void
): Promise<Result<AudioStream, Error> | null> {
	logger.debug('Adaptive formats failed, trying HLS download...');
	const client = await clientManager.getClient();
	const hlsUrl = await resolveHlsUrl(client, videoId);
	if (!hlsUrl) return null;

	logger.debug('Found HLS manifest, downloading segments...');
	const hlsResult = await downloadHlsToCache(hlsUrl, videoId, cookies, onProgress);
	if (!hlsResult) {
		logger.debug('HLS download failed');
		return null;
	}

	return ok(
		createAudioStream({ url: hlsResult.path, format: hlsResult.format as AudioFormat, quality })
	);
}

async function resolveHlsUrl(
	client: Awaited<ReturnType<ClientManager['getClient']>>,
	videoId: string
): Promise<string | null> {
	return (
		(await tryHlsStream(client, videoId, 'IOS')) ||
		(await tryHlsStream(client, videoId, 'TV')) ||
		null
	);
}

async function handleStreamingPlayback(
	clientManager: ClientManager,
	videoId: string,
	quality: StreamQuality,
	cookies: string | undefined
): Promise<Result<AudioStream, Error>> {
	const client = await clientManager.getClient();
	const hlsUrl = await resolveHlsUrl(client, videoId);

	if (!hlsUrl) {
		return err(new Error('No streaming data available - all format attempts failed'));
	}

	logger.debug('Rewriting HLS manifest with remote segment URLs');
	const localManifest = await rewriteHlsManifest(hlsUrl, videoId, cookies);

	if (!localManifest) {
		return err(new Error('No streaming data available - failed to rewrite HLS manifest'));
	}

	return ok(createAudioStream({ url: localManifest, format: 'hls', quality }));
}


export function createStreamingOperations(clientManager: ClientManager): StreamingOperations {
	return {
		async getStreamUrl(
			trackId: TrackId,
			options?: StreamOptions
		): Promise<Result<AudioStream, Error>> {
			try {
				return await resolveStreamUrl(clientManager, trackId, options);
			} catch (error) {
				logger.error('getStreamUrl error', error instanceof Error ? error : undefined);
				const wrapped =
					error instanceof Error
						? error
						: new Error(`Failed to get stream URL: ${String(error)}`);
				return err(wrapped);
			}
		},
	};
}

async function resolveStreamUrl(
	clientManager: ClientManager,
	trackId: TrackId,
	options?: StreamOptions
): Promise<Result<AudioStream, Error>> {
	const videoId = trackId.sourceId;
	const quality: StreamQuality = options?.quality ?? 'high';
	logger.debug('Getting stream URL for video:', videoId);

	const cachedResult = await tryCachedStream(videoId, quality);
	if (cachedResult) return cachedResult;

	const cookies = await clientManager.getCookies();
	if (cookies) logger.debug('Using authenticated download with cookies');
	// HLS manifests cannot be saved as files, so downloads need direct URLs
	if (options?.preferDownloadable) {
		return handleDownloadableStream(
			clientManager,
			videoId,
			quality,
			cookies,
			options.onProgress
		);
	}
	return handleStreamingPlayback(clientManager, videoId, quality, cookies);
}

async function tryCachedStream(
	videoId: string,
	quality: StreamQuality
): Promise<Result<AudioStream, Error> | null> {
	const cached = await checkCache(videoId);
	if (!cached) return null;

	logger.debug(`Using cached audio file for playback (format: ${cached.format})`);
	return ok(
		createAudioStream({ url: cached.path, format: cached.format as AudioFormat, quality })
	);
}
