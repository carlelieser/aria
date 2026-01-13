import type { BasePlugin } from './base-plugin';
import type { Result, AsyncResult } from '@shared/types/result';
import type { Track } from '@domain/entities/track';
import type { Duration } from '@domain/value-objects/duration';
import type { PlaybackStatus, RepeatMode } from '@domain/value-objects/playback-state';

export type PlaybackCapability =
	| 'play'
	| 'pause'
	| 'seek'
	| 'volume-control'
	| 'queue-management'
	| 'gapless-playback'
	| 'crossfade'
	| 'equalizer'
	| 'speed-control'
	| 'background-play'
	| 'audio-focus';

export type PlaybackEvent =
	| { type: 'status-change'; status: PlaybackStatus; timestamp: number }
	| { type: 'track-change'; track: Track | null; timestamp: number }
	| { type: 'position-change'; position: Duration; timestamp: number }
	| { type: 'duration-change'; duration: Duration; timestamp: number }
	| { type: 'volume-change'; volume: number; timestamp: number }
	| { type: 'rate-change'; rate: number; timestamp: number }
	| { type: 'queue-change'; tracks: Track[]; currentIndex: number; timestamp: number }
	| { type: 'repeat-mode-change'; mode: RepeatMode; timestamp: number }
	| { type: 'shuffle-change'; enabled: boolean; timestamp: number }
	| { type: 'buffer-progress'; percent: number; timestamp: number }
	| { type: 'error'; error: Error; timestamp: number }
	| { type: 'ended'; timestamp: number }
	| { type: 'remote-skip-next'; timestamp: number }
	| { type: 'remote-skip-previous'; timestamp: number };

export type PlaybackEventListener = (event: PlaybackEvent) => void;

export interface QueueItem {
	readonly track: Track;

	readonly streamUrl?: string;

	readonly isActive: boolean;

	readonly position: number;
}

export interface AudioDevice {
	readonly id: string;

	readonly name: string;

	readonly type: 'speaker' | 'headphones' | 'bluetooth' | 'airplay' | 'chromecast' | 'other';

	readonly isDefault: boolean;

	readonly isActive: boolean;
}

export interface EqualizerPreset {
	readonly name: string;

	readonly gains: number[];
}

export interface PlaybackProvider extends BasePlugin {
	readonly capabilities: Set<PlaybackCapability>;

	canHandle?(url: string): boolean;

	play(
		track: Track,
		streamUrl: string,
		startPosition?: Duration,
		headers?: Record<string, string>
	): AsyncResult<void, Error>;

	pause(): AsyncResult<void, Error>;

	resume(): AsyncResult<void, Error>;

	stop(): AsyncResult<void, Error>;

	seek(position: Duration): AsyncResult<void, Error>;

	setVolume(volume: number): AsyncResult<void, Error>;

	getVolume(): number;

	setPlaybackRate?(rate: number): AsyncResult<void, Error>;

	getPlaybackRate?(): number;

	getStatus(): PlaybackStatus;

	getPosition(): Duration;

	getDuration(): Duration;

	getCurrentTrack(): Track | null;

	getQueue(): QueueItem[];

	setQueue(tracks: Track[], startIndex?: number): AsyncResult<void, Error>;

	addToQueue(tracks: Track[], atIndex?: number): Result<void, Error>;

	removeFromQueue(index: number): Result<void, Error>;

	moveInQueue?(fromIndex: number, toIndex: number): Result<void, Error>;

	clearQueue(): Result<void, Error>;

	skipToNext(): AsyncResult<void, Error>;

	skipToPrevious(): AsyncResult<void, Error>;

	skipToIndex?(index: number): AsyncResult<void, Error>;

	setRepeatMode(mode: RepeatMode): Result<void, Error>;

	getRepeatMode(): RepeatMode;

	setShuffle(enabled: boolean): Result<void, Error>;

	isShuffle(): boolean;

	setCrossfade?(durationMs: number): Result<void, Error>;

	getAudioDevices?(): AsyncResult<AudioDevice[], Error>;

	setAudioDevice?(deviceId: string): AsyncResult<void, Error>;

	getEqualizerPresets?(): EqualizerPreset[];

	setEqualizer?(preset: string | number[]): Result<void, Error>;

	addEventListener(listener: PlaybackEventListener): () => void;

	removeEventListener(listener: PlaybackEventListener): void;

	preloadTrack?(track: Track, streamUrl: string): AsyncResult<void, Error>;

	hasCapability(capability: PlaybackCapability): boolean;
}

export function isPlaybackProvider(plugin: BasePlugin): plugin is PlaybackProvider {
	return (
		plugin.manifest.category === 'playback-provider' &&
		'play' in plugin &&
		'pause' in plugin &&
		'stop' in plugin
	);
}
