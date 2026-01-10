import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore } from '@/src/application/state/player-store';
import { useHistoryStore } from '@/src/application/state/history-store';
import { playbackService } from '@/src/application/services/playback-service';
import { getLogger } from '@/src/shared/services/logger';
import type { Track } from '@/src/domain/entities/track';
import { Duration } from '@/src/domain/value-objects/duration';

const logger = getLogger('usePlayer');

export function usePlayer() {
	const {
		currentTrack,
		status,
		position,
		duration,
		volume,
		isMuted,
		repeatMode,
		isShuffled,
		queue,
		queueIndex,
		error,
	} = usePlayerStore(
		useShallow((state) => ({
			currentTrack: state.currentTrack,
			status: state.status,
			position: state.position,
			duration: state.duration,
			volume: state.volume,
			isMuted: state.isMuted,
			repeatMode: state.repeatMode,
			isShuffled: state.isShuffled,
			queue: state.queue,
			queueIndex: state.queueIndex,
			error: state.error,
		}))
	);

	const addToHistory = useHistoryStore((state) => state.addToHistory);

	const play = useCallback(
		async (track: Track) => {
			usePlayerStore.getState().setQueue([track], 0);
			addToHistory(track);
			await playbackService.play(track);
		},
		[addToHistory]
	);

	const playQueue = useCallback(
		async (tracks: Track[], startIndex: number) => {
			if (tracks.length === 0 || startIndex < 0 || startIndex >= tracks.length) {
				return;
			}
			usePlayerStore.getState().setQueue(tracks, startIndex);
			addToHistory(tracks[startIndex]);
			await playbackService.play(tracks[startIndex]);
		},
		[addToHistory]
	);

	const pause = useCallback(async () => {
		await playbackService.pause();
	}, []);

	const resume = useCallback(async () => {
		await playbackService.resume();
	}, []);

	const togglePlayPause = useCallback(async () => {
		const state = usePlayerStore.getState();
		logger.debug('togglePlayPause called', {
			status: state.status,
			hasTrack: !!state.currentTrack,
		});

		if (state.status === 'playing') {
			logger.debug('Pausing playback');
			await playbackService.pause();
		} else if (state.status === 'paused') {
			logger.debug('Resuming playback');
			await playbackService.resume();
		} else if ((state.status === 'idle' || state.status === 'error') && state.currentTrack) {
			logger.debug('Starting playback from idle/error state');
			await playbackService.play(state.currentTrack);
		} else {
			logger.warn('togglePlayPause: unhandled state', { status: state.status });
		}
	}, []);

	const seekTo = useCallback(async (position: Duration) => {
		await playbackService.seekTo(position);
	}, []);

	const skipToNext = useCallback(async () => {
		await playbackService.skipToNext();
	}, []);

	const skipToPrevious = useCallback(async () => {
		await playbackService.skipToPrevious();
	}, []);

	const toggleShuffle = useCallback(() => {
		usePlayerStore.getState().toggleShuffle();
	}, []);

	const cycleRepeatMode = useCallback(() => {
		usePlayerStore.getState().cycleRepeatMode();
	}, []);

	const setVolume = useCallback(async (volume: number) => {
		await playbackService.setVolume(volume);
	}, []);

	const toggleMute = useCallback(() => {
		usePlayerStore.getState().toggleMute();
	}, []);

	return {
		currentTrack,
		status,
		position,
		duration,
		volume,
		isMuted,
		repeatMode,
		isShuffled,
		queue,
		queueIndex,
		error,

		isPlaying: status === 'playing',
		isPaused: status === 'paused',
		isLoading: status === 'loading',
		isBuffering: status === 'buffering',
		isIdle: status === 'idle',

		play,
		playQueue,
		pause,
		resume,
		togglePlayPause,
		seekTo,
		skipToNext,
		skipToPrevious,
		toggleShuffle,
		cycleRepeatMode,
		setVolume,
		toggleMute,
	};
}
