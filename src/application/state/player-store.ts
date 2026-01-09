import { create } from 'zustand';
import type { Track } from '../../domain/entities/track';
import type { PlaybackStatus, RepeatMode } from '../../domain/value-objects/playback-state';
import { Duration } from '../../domain/value-objects/duration';
import {
	getNextTrackIndex,
	getPreviousTrackIndex,
	shuffleArray,
} from '../../domain/value-objects/playback-state';

interface PlayerState {
	status: PlaybackStatus;
	currentTrack: Track | null;
	position: Duration;
	duration: Duration;
	volume: number;
	isMuted: boolean;
	repeatMode: RepeatMode;
	isShuffled: boolean;
	error: string | null;

	queue: Track[];
	queueIndex: number;
	originalQueue: Track[];

	play: (track: Track) => void;
	pause: () => void;
	resume: () => void;
	stop: () => void;
	seekTo: (position: Duration) => void;
	skipToNext: () => void;
	skipToPrevious: () => void;
	setQueue: (tracks: Track[], startIndex?: number) => void;
	toggleShuffle: () => void;
	cycleRepeatMode: () => void;
	setVolume: (volume: number) => void;
	toggleMute: () => void;

	_setStatus: (status: PlaybackStatus) => void;
	_setPosition: (position: Duration) => void;
	_setDuration: (duration: Duration) => void;
	_setError: (error: string | null) => void;
	_setCurrentTrack: (track: Track | null) => void;
}

function getNextRepeatMode(current: RepeatMode): RepeatMode {
	switch (current) {
		case 'off':
			return 'one';
		case 'one':
			return 'all';
		case 'all':
			return 'off';
	}
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
	status: 'idle',
	currentTrack: null,
	position: Duration.ZERO,
	duration: Duration.ZERO,
	volume: 1,
	isMuted: false,
	repeatMode: 'off',
	isShuffled: false,
	error: null,
	queue: [],
	queueIndex: -1,
	originalQueue: [],

	play: (track: Track) => {
		set({
			currentTrack: track,
			status: 'loading',
			error: null,
			position: Duration.ZERO,
		});
	},

	pause: () => {
		const state = get();
		if (state.status === 'playing') {
			set({ status: 'paused' });
		}
	},

	resume: () => {
		const state = get();
		if (state.status === 'paused') {
			set({ status: 'playing' });
		}
	},

	stop: () => {
		set({
			status: 'idle',
			currentTrack: null,
			position: Duration.ZERO,
			duration: Duration.ZERO,
			error: null,
		});
	},

	seekTo: (position: Duration) => {
		set({ position });
	},

	skipToNext: () => {
		const state = get();
		const nextIndex = getNextTrackIndex(
			{
				tracks: state.queue,
				currentIndex: state.queueIndex,
				originalOrder: state.originalQueue,
			},
			state.repeatMode
		);

		if (nextIndex >= 0 && nextIndex < state.queue.length) {
			const nextTrack = state.queue[nextIndex];
			set({
				queueIndex: nextIndex,
				currentTrack: nextTrack,
				status: 'loading',
				position: Duration.ZERO,
				error: null,
			});
		} else if (state.repeatMode === 'one' && state.currentTrack) {
			set({
				position: Duration.ZERO,
				status: 'loading',
			});
		} else {
			set({
				status: 'idle',
				currentTrack: null,
				position: Duration.ZERO,
			});
		}
	},

	skipToPrevious: () => {
		const state = get();

		if (state.position.totalSeconds > 3) {
			set({ position: Duration.ZERO });
			return;
		}

		const prevIndex = getPreviousTrackIndex({
			tracks: state.queue,
			currentIndex: state.queueIndex,
			originalOrder: state.originalQueue,
		});

		if (prevIndex >= 0 && prevIndex < state.queue.length) {
			const prevTrack = state.queue[prevIndex];
			set({
				queueIndex: prevIndex,
				currentTrack: prevTrack,
				status: 'loading',
				position: Duration.ZERO,
				error: null,
			});
		}
	},

	setQueue: (tracks: Track[], startIndex = 0) => {
		const state = get();
		const effectiveQueue = state.isShuffled ? shuffleArray(tracks, startIndex) : tracks;

		const effectiveIndex = state.isShuffled ? startIndex : startIndex;

		set({
			queue: effectiveQueue,
			originalQueue: tracks,
			queueIndex: effectiveIndex,
			currentTrack: effectiveQueue[effectiveIndex] || null,
			status: effectiveQueue[effectiveIndex] ? 'loading' : 'idle',
			position: Duration.ZERO,
			error: null,
		});
	},

	toggleShuffle: () => {
		const state = get();
		const newShuffleState = !state.isShuffled;

		if (newShuffleState) {
			const currentTrack = state.currentTrack;
			const shuffled = shuffleArray(state.originalQueue, state.queueIndex);

			set({
				isShuffled: true,
				queue: shuffled,
				queueIndex: currentTrack ? shuffled.indexOf(currentTrack) : -1,
			});
		} else {
			const currentTrack = state.currentTrack;
			const originalIndex = currentTrack ? state.originalQueue.indexOf(currentTrack) : -1;

			set({
				isShuffled: false,
				queue: state.originalQueue,
				queueIndex: originalIndex,
			});
		}
	},

	cycleRepeatMode: () => {
		const state = get();
		set({ repeatMode: getNextRepeatMode(state.repeatMode) });
	},

	setVolume: (volume: number) => {
		const clampedVolume = Math.max(0, Math.min(1, volume));
		set({ volume: clampedVolume, isMuted: clampedVolume === 0 });
	},

	toggleMute: () => {
		const state = get();
		set({ isMuted: !state.isMuted });
	},

	_setStatus: (status: PlaybackStatus) => {
		set({ status });
	},

	_setPosition: (position: Duration) => {
		set({ position });
	},

	_setDuration: (duration: Duration) => {
		set({ duration });
	},

	_setError: (error: string | null) => {
		set({ error, status: error ? 'error' : get().status });
	},

	_setCurrentTrack: (currentTrack: Track | null) => {
		set({ currentTrack });
	},
}));

export const useCurrentTrack = () => usePlayerStore((state) => state.currentTrack);
export const usePlaybackStatus = () => usePlayerStore((state) => state.status);
export const useIsPlaying = () => usePlayerStore((state) => state.status === 'playing');
export const useIsPaused = () => usePlayerStore((state) => state.status === 'paused');
export const useQueue = () => usePlayerStore((state) => state.queue);
export const useQueueIndex = () => usePlayerStore((state) => state.queueIndex);
export const useVolume = () =>
	usePlayerStore((state) => ({
		volume: state.volume,
		isMuted: state.isMuted,
	}));
export const useRepeatMode = () => usePlayerStore((state) => state.repeatMode);
export const useIsShuffled = () => usePlayerStore((state) => state.isShuffled);
export const usePlaybackProgress = () =>
	usePlayerStore((state) => ({
		position: state.position,
		duration: state.duration,
		percentage: state.duration.isZero()
			? 0
			: (state.position.totalMilliseconds / state.duration.totalMilliseconds) * 100,
	}));
