import { useCallback } from 'react';
import { usePlayerStore } from '@/src/application/state/player-store';
import { useHistoryStore } from '@/src/application/state/history-store';
import { playbackService } from '@/src/application/services/playback-service';
import type { Track } from '@/src/domain/entities/track';
import { Duration } from '@/src/domain/value-objects/duration';

export function usePlayer() {
	const currentTrack = usePlayerStore((state) => state.currentTrack);
	const status = usePlayerStore((state) => state.status);
	const position = usePlayerStore((state) => state.position);
	const duration = usePlayerStore((state) => state.duration);
	const volume = usePlayerStore((state) => state.volume);
	const isMuted = usePlayerStore((state) => state.isMuted);
	const repeatMode = usePlayerStore((state) => state.repeatMode);
	const isShuffled = usePlayerStore((state) => state.isShuffled);
	const queue = usePlayerStore((state) => state.queue);
	const queueIndex = usePlayerStore((state) => state.queueIndex);
	const error = usePlayerStore((state) => state.error);

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
		const currentStatus = usePlayerStore.getState().status;
		if (currentStatus === 'playing') {
			await playbackService.pause();
		} else if (currentStatus === 'paused') {
			await playbackService.resume();
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
