import type { AsyncResult } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import type { Track } from '@domain/entities/track';
import type { TrackId } from '@domain/value-objects/track-id';
import type { StreamQuality } from '@domain/value-objects/audio-source';
import type { AudioStream, AudioFormat } from '@domain/value-objects/audio-stream';
import { createAudioStream } from '@domain/value-objects/audio-stream';
import type {
	StreamOptions,
	AvailableFormat,
} from '@plugins/core/interfaces/audio-source-provider';
import type { SoundCloudClient } from './client';
import type { SoundCloudStreamsResponse } from './types';

const STREAM_URL_TTL_MS = 4 * 60 * 60 * 1000;

export interface StreamingOperations {
	getStreamUrl(track: Track, options?: StreamOptions): AsyncResult<AudioStream, Error>;

	getAvailableFormats(trackId: TrackId): AsyncResult<AvailableFormat[], Error>;

	supportsTrack(track: Track): boolean;
}

function selectBestStreamUrl(
	streams: SoundCloudStreamsResponse,
	quality: StreamQuality
): { url: string; format: AudioFormat; bitrate: number } | null {
	if (quality === 'high' && streams.hls_aac_160_url) {
		return { url: streams.hls_aac_160_url, format: 'hls', bitrate: 160 };
	}

	if (streams.hls_aac_96_url) {
		return { url: streams.hls_aac_96_url, format: 'hls', bitrate: 96 };
	}

	if (streams.hls_aac_160_url) {
		return { url: streams.hls_aac_160_url, format: 'hls', bitrate: 160 };
	}

	if (streams.http_mp3_128_url) {
		return { url: streams.http_mp3_128_url, format: 'mp3', bitrate: 128 };
	}

	if (streams.hls_mp3_128_url) {
		return { url: streams.hls_mp3_128_url, format: 'hls', bitrate: 128 };
	}

	if (streams.hls_opus_64_url) {
		return { url: streams.hls_opus_64_url, format: 'hls', bitrate: 64 };
	}

	if (streams.preview_mp3_128_url) {
		return { url: streams.preview_mp3_128_url, format: 'mp3', bitrate: 128 };
	}

	return null;
}

function mapBitrateToQuality(bitrate: number): StreamQuality {
	if (bitrate >= 160) return 'high';
	if (bitrate >= 96) return 'medium';
	return 'low';
}

export function createStreamingOperations(client: SoundCloudClient): StreamingOperations {
	return {
		supportsTrack(track: Track): boolean {
			return track.id.sourceType === 'soundcloud';
		},

		async getStreamUrl(track: Track, options?: StreamOptions): AsyncResult<AudioStream, Error> {
			if (track.id.sourceType !== 'soundcloud') {
				return err(new Error(`Unsupported source type: ${track.id.sourceType}`));
			}

			const result = await client.getTrackStreams(track.id.sourceId);

			if (!result.success) {
				return err(result.error);
			}

			const quality = options?.quality ?? 'high';
			const selected = selectBestStreamUrl(result.data, quality);

			if (!selected) {
				return err(new Error('No playable stream URL available'));
			}

			const stream = createAudioStream({
				url: selected.url,
				format: selected.format,
				quality: mapBitrateToQuality(selected.bitrate),
				bitrate: selected.bitrate,
				expiresAt: Date.now() + STREAM_URL_TTL_MS,
			});

			return ok(stream);
		},

		async getAvailableFormats(trackId: TrackId): AsyncResult<AvailableFormat[], Error> {
			if (trackId.sourceType !== 'soundcloud') {
				return err(new Error(`Unsupported source type: ${trackId.sourceType}`));
			}

			const result = await client.getTrackStreams(trackId.sourceId);

			if (!result.success) {
				return err(result.error);
			}

			const formats: AvailableFormat[] = [];
			const streams = result.data;

			if (streams.hls_aac_160_url) {
				formats.push({
					format: 'hls',
					quality: 'high',
					bitrate: 160,
					label: 'AAC 160kbps (HLS)',
				});
			}
			if (streams.hls_aac_96_url) {
				formats.push({
					format: 'hls',
					quality: 'medium',
					bitrate: 96,
					label: 'AAC 96kbps (HLS)',
					isDefault: true,
				});
			}
			if (streams.http_mp3_128_url) {
				formats.push({
					format: 'mp3',
					quality: 'medium',
					bitrate: 128,
					label: 'MP3 128kbps',
				});
			}

			return ok(formats);
		},
	};
}
