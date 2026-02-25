import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
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
	insertIntoQueue: (track: Track, index: number) => void;
	appendToQueue: (track: Track) => void;
	removeFromQueue: (index: number) => void;
	moveInQueue: (fromIndex: number, toIndex: number) => void;
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
			duration: Duration.ZERO,
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
				duration: Duration.ZERO,
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
				duration: Duration.ZERO,
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
				duration: Duration.ZERO,
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
		});
	},

	insertIntoQueue: (track: Track, index: number) => {
		const state = get();
		const clampedIndex = Math.max(0, Math.min(state.queue.length, index));
		const newQueue = [
			...state.queue.slice(0, clampedIndex),
			track,
			...state.queue.slice(clampedIndex),
		];

		const newOriginalQueue = [...state.originalQueue, track];
		const adjustedQueueIndex =
			clampedIndex <= state.queueIndex ? state.queueIndex + 1 : state.queueIndex;

		set({
			queue: newQueue,
			originalQueue: newOriginalQueue,
			queueIndex: adjustedQueueIndex,
		});
	},

	appendToQueue: (track: Track) => {
		const state = get();
		set({
			queue: [...state.queue, track],
			originalQueue: [...state.originalQueue, track],
		});
	},

	removeFromQueue: (index: number) => {
		const state = get();
		if (index < 0 || index >= state.queue.length) return;

		const newQueue = state.queue.filter((_, i) => i !== index);

		if (index === state.queueIndex) {
			// Removing the currently playing track — advance or stop
			const nextIndex = Math.min(index, newQueue.length - 1);
			set({
				queue: newQueue,
				queueIndex: nextIndex,
				currentTrack: newQueue[nextIndex] ?? null,
				status: newQueue.length === 0 ? 'idle' : state.status,
			});
		} else {
			set({
				queue: newQueue,
				queueIndex: index < state.queueIndex ? state.queueIndex - 1 : state.queueIndex,
			});
		}
	},

	moveInQueue: (fromIndex: number, toIndex: number) => {
		const state = get();
		if (
			fromIndex === toIndex ||
			fromIndex < 0 ||
			fromIndex >= state.queue.length ||
			toIndex < 0 ||
			toIndex >= state.queue.length
		)
			return;

		const newQueue = [...state.queue];
		const [moved] = newQueue.splice(fromIndex, 1);
		newQueue.splice(toIndex, 0, moved);

		let newQueueIndex = state.queueIndex;
		if (fromIndex === state.queueIndex) {
			newQueueIndex = toIndex;
		} else if (fromIndex < state.queueIndex && toIndex >= state.queueIndex) {
			newQueueIndex--;
		} else if (fromIndex > state.queueIndex && toIndex <= state.queueIndex) {
			newQueueIndex++;
		}

		set({ queue: newQueue, queueIndex: newQueueIndex });
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
export const useHasActiveTrack = () => usePlayerStore((state) => state.currentTrack !== null);
export const usePlaybackStatus = () => usePlayerStore((state) => state.status);
export const useIsPlaying = () => usePlayerStore((state) => state.status === 'playing');
export const useIsPaused = () => usePlayerStore((state) => state.status === 'paused');
export const useIsLoading = () => usePlayerStore((state) => state.status === 'loading');
export const useIsBuffering = () => usePlayerStore((state) => state.status === 'buffering');
export const usePlayerError = () => usePlayerStore((state) => state.error);
export const useQueue = () => usePlayerStore((state) => state.queue);
export const useQueueIndex = () => usePlayerStore((state) => state.queueIndex);
export const useVolume = () =>
	usePlayerStore(
		useShallow((state) => ({
			volume: state.volume,
			isMuted: state.isMuted,
		}))
	);
export const useRepeatMode = () => usePlayerStore((state) => state.repeatMode);
export const useIsShuffled = () => usePlayerStore((state) => state.isShuffled);
export const usePlaybackProgress = () =>
	usePlayerStore(
		useShallow((state) => ({
			position: state.position,
			duration: state.duration,
			percentage: state.duration.isZero()
				? 0
				: (state.position.totalMilliseconds / state.duration.totalMilliseconds) * 100,
		}))
	);
export const useActiveTrackFormattedPosition = (trackId: string) =>
	usePlayerStore((state) => {
		const isActive = state.currentTrack?.id.value === trackId;
		return isActive ? state.position.format() : null;
	});

interface TrackPlaybackInfo {
	readonly isActiveTrack: boolean;
	readonly isCurrentlyPlaying: boolean;
	readonly formattedPosition: string | null;
}

const INACTIVE_TRACK_INFO: TrackPlaybackInfo = {
	isActiveTrack: false,
	isCurrentlyPlaying: false,
	formattedPosition: null,
};

/**
 * Combined selector for TrackListItem that returns a stable reference
 * for non-active tracks, preventing unnecessary re-renders.
 */
export const useTrackPlaybackInfo = (trackId: string): TrackPlaybackInfo =>
	usePlayerStore(
		useShallow((state) => {
			const isActive = state.currentTrack?.id.value === trackId;
			if (!isActive) return INACTIVE_TRACK_INFO;
			return {
				isActiveTrack: true,
				isCurrentlyPlaying: state.status === 'playing',
				formattedPosition: state.position.format(),
			};
		})
	);
