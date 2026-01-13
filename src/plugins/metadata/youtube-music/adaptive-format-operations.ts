import type InnertubeClient from 'youtubei.js/react-native';
import { getLogger } from '@shared/services/logger';
import type { AudioStream } from '@domain/value-objects/audio-stream';
import { createAudioStream } from '@domain/value-objects/audio-stream';
import type { StreamQuality } from '@domain/value-objects/audio-source';

const logger = getLogger('YouTubeMusic:AdaptiveFormat');

export interface AdaptiveFormatResult {
	readonly stream: AudioStream;
	readonly contentLength?: number;
}

type AudioFormatType = 'm4a' | 'mp3' | 'webm' | 'ogg' | 'flac' | 'wav';

function extractAudioFormat(mimeType: string): AudioFormatType {
	if (mimeType.includes('webm')) {
		return 'webm';
	}
	if (mimeType.includes('ogg')) {
		return 'ogg';
	}
	return 'm4a';
}

function buildStreamHeaders(): Record<string, string> {
	return {
		Accept: '*/*',
		Origin: 'https://www.youtube.com',
		Referer: 'https://www.youtube.com/',
		'User-Agent': 'Mozilla/5.0 (ChromiumStylePlatform) Cobalt/Version',
	};
}

async function extractFormatUrl(format: any, client: InnertubeClient): Promise<string | undefined> {
	if (format.url) {
		logger.debug('[Adaptive] Format has direct URL');
		return format.url;
	}

	if (format.decipher) {
		logger.debug('[Adaptive] Deciphering URL...');
		const url = await format.decipher(client.session.player);
		logger.debug('[Adaptive] Decipher complete');
		return url;
	}

	logger.warn('[Adaptive] Format has no URL and no decipher method');
	return undefined;
}

export async function tryAdaptiveFormat(
	client: InnertubeClient,
	videoId: string,
	quality: StreamQuality,
	clientType: 'TV' | 'IOS' | 'ANDROID' = 'TV'
): Promise<AdaptiveFormatResult | null> {
	try {
		logger.debug(`[Adaptive] Trying ${clientType} client for video: ${videoId}`);
		const videoInfo = await client.getInfo(videoId, { client: clientType });
		logger.debug(`[Adaptive] Got videoInfo from ${clientType}`);

		if (!videoInfo.streaming_data) {
			logger.warn(`[Adaptive] No streaming_data from ${clientType} client`);
			return null;
		}

		logger.debug('[Adaptive] streaming_data exists, choosing format...');
		const format = videoInfo.chooseFormat({ type: 'audio', quality: 'best' });

		if (!format) {
			logger.warn(`[Adaptive] No audio format found from ${clientType} client`);
			return null;
		}

		const mimeType = format.mime_type ?? 'audio/mp4';
		const audioFormat = extractAudioFormat(mimeType);
		const contentLength = format.content_length ? Number(format.content_length) : undefined;

		logger.debug(
			`[Adaptive] Found format: itag=${format.itag}, mime=${mimeType}, ` +
				`bitrate=${format.bitrate}, contentLength=${contentLength ?? 'unknown'}`
		);

		const url = await extractFormatUrl(format, client);

		if (!url) {
			logger.warn(`[Adaptive] Failed to get URL from ${clientType} client`);
			return null;
		}

		logger.debug(`[Adaptive] Got URL from ${clientType} (length: ${url.length})`);
		return {
			stream: createAudioStream({
				url,
				format: audioFormat,
				quality,
				headers: buildStreamHeaders(),
			}),
			contentLength,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.warn(`[Adaptive] ${clientType} client failed, will try next: ${message}`);
		return null;
	}
}

export async function tryMultipleClientTypes(
	client: InnertubeClient,
	videoId: string,
	quality: StreamQuality,
	clientTypes: readonly ('TV' | 'ANDROID' | 'IOS')[]
): Promise<AdaptiveFormatResult | null> {
	for (const clientType of clientTypes) {
		const result = await tryAdaptiveFormat(client, videoId, quality, clientType);
		if (result) {
			return result;
		}
	}
	return null;
}
