import type { BasePlugin } from './base-plugin';
import type { AsyncResult } from '@shared/types/result';
import type { Track } from '@domain/entities/track';
import type { TrackId } from '@domain/value-objects/track-id';
import type { StreamQuality } from '@domain/value-objects/audio-source';
import type { AudioStream, AudioFormat } from '@domain/value-objects/audio-stream';

export type AudioSourceCapability =
	| 'get-stream-url'
	| 'get-formats'
	| 'quality-selection'
	| 'format-selection'
	| 'range-requests'
	| 'adaptive-streaming'
	| 'offline-playback'
	| 'drm';

export interface AvailableFormat {
	readonly format: AudioFormat;

	readonly quality: StreamQuality;

	readonly bitrate?: number;

	readonly sampleRate?: number;

	readonly label?: string;

	readonly isDefault?: boolean;
}

export interface StreamOptions {
	readonly quality?: StreamQuality;

	readonly format?: AudioFormat;

	readonly audioOnly?: boolean;

	readonly maxBitrate?: number;

	/** When true, prefer direct downloadable URLs over streaming protocols like HLS */
	readonly preferDownloadable?: boolean;
}

export interface AudioSourceProvider extends BasePlugin {
	readonly audioCapabilities: Set<AudioSourceCapability>;

	supportsTrack(track: Track): boolean;

	getStreamUrl(trackId: TrackId, options?: StreamOptions): AsyncResult<AudioStream, Error>;

	getAvailableFormats?(trackId: TrackId): AsyncResult<AvailableFormat[], Error>;

	preloadStream?(trackId: TrackId): AsyncResult<void, Error>;

	hasAudioCapability(capability: AudioSourceCapability): boolean;
}

export function isAudioSourceProvider(plugin: BasePlugin): plugin is AudioSourceProvider {
	return (
		plugin.manifest.category === 'audio-source-provider' &&
		'getStreamUrl' in plugin &&
		'supportsTrack' in plugin &&
		'audioCapabilities' in plugin
	);
}

export function hasAudioSourceCapability(
	plugin: BasePlugin
): plugin is BasePlugin & AudioSourceProvider {
	return 'getStreamUrl' in plugin && 'supportsTrack' in plugin && 'audioCapabilities' in plugin;
}
