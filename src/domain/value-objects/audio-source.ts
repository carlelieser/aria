import type { SourceType } from './track-id';

export type AudioFileType = 'mp3' | 'flac' | 'aac' | 'm4a' | 'wav' | 'ogg' | 'opus' | 'webm';

export type StreamQuality = 'low' | 'medium' | 'high' | 'lossless';

export interface LocalAudioSource {
	readonly type: 'local';

	readonly filePath: string;

	readonly fileType?: AudioFileType;

	readonly fileSize?: number;
}

export interface StreamingAudioSource {
	readonly type: 'streaming';

	readonly sourcePlugin: SourceType;

	readonly sourceId: string;

	readonly streamUrl?: string;

	readonly quality?: StreamQuality;

	readonly isExpired?: boolean;

	readonly expiresAt?: number;
}

export interface DownloadedAudioSource {
	readonly type: 'downloaded';

	readonly filePath: string;

	readonly fileSize: number;

	readonly fileType: AudioFileType;

	readonly downloadedAt: number;

	readonly originalSource: StreamingAudioSource;
}

export type AudioSource = LocalAudioSource | StreamingAudioSource | DownloadedAudioSource;

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

export function isLocalSource(source: AudioSource): source is LocalAudioSource {
	return source.type === 'local';
}

export function isStreamingSource(source: AudioSource): source is StreamingAudioSource {
	return source.type === 'streaming';
}

export function isDownloadedSource(source: AudioSource): source is DownloadedAudioSource {
	return source.type === 'downloaded';
}

export function createDownloadedSource(
	filePath: string,
	fileSize: number,
	fileType: AudioFileType,
	originalSource: StreamingAudioSource
): DownloadedAudioSource {
	return Object.freeze({
		type: 'downloaded',
		filePath,
		fileSize,
		fileType,
		downloadedAt: Date.now(),
		originalSource,
	});
}

export function canDownload(source: AudioSource): boolean {
	return source.type === 'streaming';
}

export function isLocallyAvailable(source: AudioSource): boolean {
	return source.type === 'local' || source.type === 'downloaded';
}

export function getPlaybackUri(source: AudioSource): string | null {
	if (isLocalSource(source)) {
		return source.filePath;
	}

	if (isDownloadedSource(source)) {
		return source.filePath;
	}

	if (source.streamUrl && !source.isExpired) {
		if (source.expiresAt && Date.now() > source.expiresAt) {
			return null;
		}
		return source.streamUrl;
	}

	return null;
}

export function needsStreamUrlRefresh(source: AudioSource): boolean {
	if (isLocalSource(source) || isDownloadedSource(source)) {
		return false;
	}

	if (!source.streamUrl || source.isExpired) {
		return true;
	}

	if (source.expiresAt) {
		const bufferMs = 30 * 1000;
		return Date.now() + bufferMs > source.expiresAt;
	}

	return false;
}

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

export const QualityBitrates: Record<StreamQuality, number> = {
	low: 64,
	medium: 128,
	high: 256,
	lossless: 1411,
};

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
