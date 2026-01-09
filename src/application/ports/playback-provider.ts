import type { Track } from '../../domain/entities/track';
import type { Duration } from '../../domain/value-objects/duration';
import type { PlaybackStatus } from '../../domain/value-objects/playback-state';
import type { Result } from '../../shared/types/result';

export type PlaybackEvent =
	| { type: 'status-changed'; status: PlaybackStatus }
	| { type: 'position-changed'; position: Duration }
	| { type: 'track-ended' }
	| { type: 'error'; error: string };

export type PlaybackEventListener = (event: PlaybackEvent) => void;

export interface PlaybackProvider {
	play(streamUrl: string): Promise<Result<void, Error>>;

	pause(): Promise<Result<void, Error>>;

	resume(): Promise<Result<void, Error>>;

	stop(): Promise<Result<void, Error>>;

	seekTo(position: Duration): Promise<Result<void, Error>>;

	setVolume(volume: number): Promise<Result<void, Error>>;

	setPlaybackRate(rate: number): Promise<Result<void, Error>>;

	getPosition(): Promise<Result<Duration, Error>>;

	getDuration(): Promise<Result<Duration, Error>>;

	addEventListener(listener: PlaybackEventListener): void;

	removeEventListener(listener: PlaybackEventListener): void;

	dispose(): Promise<void>;
}
