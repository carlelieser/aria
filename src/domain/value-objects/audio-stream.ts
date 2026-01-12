import type { StreamQuality } from './audio-source';

export type AudioFormat = 'mp3' | 'aac' | 'opus' | 'flac' | 'webm' | 'ogg' | 'm4a' | 'wav' | 'hls';

export interface AudioStream {
	readonly url: string;

	readonly format: AudioFormat;

	readonly quality: StreamQuality;

	readonly bitrate?: number;

	readonly sampleRate?: number;

	readonly channels?: number;

	readonly contentLength?: number;

	readonly expiresAt?: number;

	readonly headers?: Record<string, string>;
}

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

export function isStreamExpired(stream: AudioStream): boolean {
	if (!stream.expiresAt) return false;
	return Date.now() >= stream.expiresAt;
}

export function isStreamExpiringSoon(stream: AudioStream, bufferMs: number = 30000): boolean {
	if (!stream.expiresAt) return false;
	return Date.now() + bufferMs >= stream.expiresAt;
}

export function getStreamTimeRemaining(stream: AudioStream): number {
	if (!stream.expiresAt) return Infinity;
	return Math.max(0, stream.expiresAt - Date.now());
}

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

	return 'mp3';
}

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
		hls: 'HLS',
	};
	return labels[format] || format.toUpperCase();
}

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
