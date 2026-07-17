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

// ANDROID_VR first: it is the only client whose stream URLs are exempt from
// YouTube's PO-token enforcement (mid-2026) — other clients' URLs only serve
// the first ~1MiB. IOS still returns direct URLs (capped) as a last resort;
// TV and ANDROID have moved to SABR-only streaming and return no URLs at all.
const ADAPTIVE_CLIENT_TYPES: readonly InnertubeClientType[] = ['ANDROID_VR', 'IOS'];
const PLAYBACK_CLIENT_TYPES: readonly InnertubeClientType[] = ['ANDROID_VR', 'IOS'];

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
	const adaptiveResult = await tryAdaptiveFormats(
		clientManager,
		videoId,
		quality,
		cookies,
		ADAPTIVE_CLIENT_TYPES
	);

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
	cookies: string | undefined,
	clientTypes: readonly InnertubeClientType[]
): Promise<AdaptiveFormatResult | null> {
	let client = await clientManager.getClient();
	logger.debug('Trying adaptive formats...');
	let { result, loginRequired } = await tryMultipleClientTypes(
		client,
		videoId,
		quality,
		clientTypes,
		cookies
	);
	if (loginRequired && !result) {
		result = await retryWithFreshClient(clientManager, videoId, quality, clientTypes);
	}
	return result ?? null;
}

async function retryWithFreshClient(
	clientManager: ClientManager,
	videoId: string,
	quality: StreamQuality,
	clientTypes: readonly InnertubeClientType[]
): Promise<AdaptiveFormatResult | null> {
	logger.warn('Cookies are bot-flagged -- retrying with unauthenticated client');
	await clientManager.refreshAuth();
	const client = await clientManager.createFreshClient({ skipAuth: true });
	const { result } = await tryMultipleClientTypes(client, videoId, quality, clientTypes);
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
	// YouTube stopped serving HLS manifests for most VOD content (mid-2026)
	// and googlevideo now rejects open-ended or >1MiB ranged requests, which
	// breaks both direct progressive streaming and full-file downloads. A
	// DASH manifest makes the player fetch small indexed ranges instead,
	// which still pass; HLS remains as a last resort for videos exposing it.
	const adaptiveResult = await tryAdaptiveFormats(
		clientManager,
		videoId,
		quality,
		cookies,
		PLAYBACK_CLIENT_TYPES
	);
	if (adaptiveResult?.dashStream) return ok(adaptiveResult.dashStream);

	if (adaptiveResult) {
		const cached = await cacheAdaptiveStream(adaptiveResult, videoId, quality, cookies);
		if (cached) return cached;
	}

	const hlsResult = await tryHlsPlayback(clientManager, videoId, quality, cookies);
	if (hlsResult) return hlsResult;

	return err(new Error('No streaming data available - all format attempts failed'));
}

async function tryHlsPlayback(
	clientManager: ClientManager,
	videoId: string,
	quality: StreamQuality,
	cookies: string | undefined
): Promise<Result<AudioStream, Error> | null> {
	const client = await clientManager.getClient();
	const hlsUrl = await resolveHlsUrl(client, videoId);
	if (!hlsUrl) return null;

	logger.debug('Rewriting HLS manifest with remote segment URLs');
	const localManifest = await rewriteHlsManifest(hlsUrl, videoId, cookies);
	if (!localManifest) return null;

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
