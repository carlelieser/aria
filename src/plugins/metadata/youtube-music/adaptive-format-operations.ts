import type InnertubeClient from 'youtubei.js/react-native';
import { Misc } from 'youtubei.js/react-native';
import { getLogger } from '@shared/services/logger';
import type { AudioStream } from '@domain/value-objects/audio-stream';
import { createAudioStream } from '@domain/value-objects/audio-stream';
import type { StreamQuality } from '@domain/value-objects/audio-source';

const logger = getLogger('YouTubeMusic:AdaptiveFormat');

export interface AdaptiveFormatResult {
	readonly stream: AudioStream;
	readonly contentLength?: number;
}

export interface MultiClientResult {
	readonly result: AdaptiveFormatResult | null;
	readonly loginRequired: boolean;
}

export type InnertubeClientType = 'TV' | 'ANDROID' | 'IOS';

// Must match the User-Agent that youtubei.js sends for each client type
// during getInfo(). YouTube's CDN validates that stream requests use the
// same UA as the API call that generated the signed URL.
const CLIENT_USER_AGENTS: Readonly<Record<InnertubeClientType, string>> = {
	TV: 'Mozilla/5.0 (ChromiumStylePlatform) Cobalt/Version',
	ANDROID:
		'com.google.android.youtube/19.35.36(Linux; U; Android 13; en_US; SM-S908E Build/TP1A.220624.014) gzip',
	IOS: 'com.google.ios.youtube/20.11.6 (iPhone10,4; U; CPU iOS 16_7_7 like Mac OS X)',
};

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

function buildStreamHeaders(
	clientType: InnertubeClientType,
	cookies?: string
): Record<string, string> {
	const headers: Record<string, string> = {
		Accept: '*/*',
		Origin: 'https://www.youtube.com',
		Referer: 'https://www.youtube.com/',
		'User-Agent': CLIENT_USER_AGENTS[clientType],
	};

	if (cookies) {
		headers['Cookie'] = cookies;
	}

	return headers;
}

async function extractFormatUrl(
	format: Misc.Format,
	client: InnertubeClient
): Promise<string | undefined> {
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
	clientType: InnertubeClientType = 'TV',
	cookies?: string
): Promise<{ result: AdaptiveFormatResult | null; loginRequired: boolean }> {
	try {
		logger.debug(`[Adaptive] Trying ${clientType} client for video: ${videoId}`);
		const videoInfo = await client.getInfo(videoId, { client: clientType });
		const playabilityStatus = videoInfo.playability_status?.status;
		const playabilityReason = videoInfo.playability_status?.reason;

		logger.debug(
			`[Adaptive] ${clientType} - status: ${playabilityStatus}, ` +
				`reason: ${playabilityReason ?? 'none'}, ` +
				`streaming_data: ${!!videoInfo.streaming_data}`
		);

		if (playabilityStatus === 'LOGIN_REQUIRED') {
			logger.warn(`[Adaptive] ${clientType} returned LOGIN_REQUIRED: ${playabilityReason}`);
			return { result: null, loginRequired: true };
		}

		if (!videoInfo.streaming_data) {
			logger.warn(`[Adaptive] No streaming_data from ${clientType} client`);
			return { result: null, loginRequired: false };
		}

		logger.debug('[Adaptive] streaming_data exists, choosing format...');
		const format = videoInfo.chooseFormat({ type: 'audio', quality: 'best' });

		if (!format) {
			logger.warn(`[Adaptive] No audio format found from ${clientType} client`);
			return { result: null, loginRequired: false };
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
			return { result: null, loginRequired: false };
		}

		logger.debug(`[Adaptive] Got URL from ${clientType} (length: ${url.length})`);
		return {
			result: {
				stream: createAudioStream({
					url,
					format: audioFormat,
					quality,
					headers: buildStreamHeaders(clientType, cookies),
				}),
				contentLength,
			},
			loginRequired: false,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.warn(`[Adaptive] ${clientType} client failed, will try next: ${message}`);
		return { result: null, loginRequired: false };
	}
}

export async function tryMultipleClientTypes(
	client: InnertubeClient,
	videoId: string,
	quality: StreamQuality,
	clientTypes: readonly InnertubeClientType[],
	cookies?: string
): Promise<MultiClientResult> {
	let anyLoginRequired = false;

	for (const clientType of clientTypes) {
		const { result, loginRequired } = await tryAdaptiveFormat(
			client,
			videoId,
			quality,
			clientType,
			cookies
		);

		if (loginRequired) {
			anyLoginRequired = true;
		}

		if (result) {
			return { result, loginRequired: false };
		}
	}

	return { result: null, loginRequired: anyLoginRequired };
}
