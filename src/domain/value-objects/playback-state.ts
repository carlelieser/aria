import type { Track } from '../entities/track';
import { Duration } from './duration';

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'buffering' | 'error';

export type RepeatMode = 'off' | 'one' | 'all';

export interface PlaybackState {
	readonly status: PlaybackStatus;

	readonly currentTrack: Track | null;

	readonly position: Duration;

	readonly duration: Duration;

	readonly volume: number;

	readonly isMuted: boolean;

	readonly repeatMode: RepeatMode;

	readonly isShuffled: boolean;

	readonly playbackRate: number;

	readonly error?: string;
}

export interface QueueState {
	readonly tracks: Track[];

	readonly currentIndex: number;

	readonly originalOrder: Track[];
}

export interface PlayerState extends PlaybackState {
	readonly queue: QueueState;
}

export const initialPlaybackState: PlaybackState = Object.freeze({
	status: 'idle',
	currentTrack: null,
	position: Duration.ZERO,
	duration: Duration.ZERO,
	volume: 1,
	isMuted: false,
	repeatMode: 'off',
	isShuffled: false,
	playbackRate: 1,
});

export const initialQueueState: QueueState = Object.freeze({
	tracks: [],
	currentIndex: -1,
	originalOrder: [],
});

export const initialPlayerState: PlayerState = Object.freeze({
	...initialPlaybackState,
	queue: initialQueueState,
});

export function isPlaybackActive(state: PlaybackState): boolean {
	return state.currentTrack !== null && state.status !== 'idle';
}

export function isPlaying(state: PlaybackState): boolean {
	return state.status === 'playing';
}

export function isPaused(state: PlaybackState): boolean {
	return state.status === 'paused';
}

export function isLoading(state: PlaybackState): boolean {
	return state.status === 'loading' || state.status === 'buffering';
}

export function getProgressPercent(state: PlaybackState): number {
	if (state.duration.isZero()) {
		return 0;
	}
	return (state.position.totalMilliseconds / state.duration.totalMilliseconds) * 100;
}

export function getRemainingDuration(state: PlaybackState): Duration {
	return state.duration.subtract(state.position);
}

export function hasNextTrack(queue: QueueState, repeatMode: RepeatMode): boolean {
	if (queue.tracks.length === 0) return false;
	if (repeatMode === 'all') return true;
	return queue.currentIndex < queue.tracks.length - 1;
}

export function hasPreviousTrack(queue: QueueState): boolean {
	return queue.currentIndex > 0;
}

export function getNextTrackIndex(queue: QueueState, repeatMode: RepeatMode): number {
	if (queue.tracks.length === 0) return -1;

	const nextIndex = queue.currentIndex + 1;

	if (nextIndex < queue.tracks.length) {
		return nextIndex;
	}

	if (repeatMode === 'all') {
		return 0;
	}

	return -1;
}

export function getPreviousTrackIndex(queue: QueueState): number {
	if (queue.currentIndex <= 0) return 0;
	return queue.currentIndex - 1;
}

export function shuffleArray<T>(array: T[], keepCurrentAtIndex?: number): T[] {
	const result = [...array];

	let keptItem: T | undefined;
	if (keepCurrentAtIndex !== undefined && keepCurrentAtIndex >= 0) {
		keptItem = result.splice(keepCurrentAtIndex, 1)[0];
	}

	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}

	if (keptItem !== undefined && keepCurrentAtIndex !== undefined) {
		result.splice(keepCurrentAtIndex, 0, keptItem);
	}

	return result;
}
