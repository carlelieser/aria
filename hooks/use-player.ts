import { useCallback } from 'react';
import { usePlayerStore } from '@/src/application/state/player-store';
import { useHistoryStore } from '@/src/application/state/history-store';
import { playbackService } from '@/src/application/services/playback-service';
import type { Track } from '@/src/domain/entities/track';
import { Duration } from '@/src/domain/value-objects/duration';

export function usePlayer() {
	const store = usePlayerStore();
	const addToHistory = useHistoryStore((state) => state.addToHistory);

	const play = useCallback(
		async (track: Track) => {
			store.setQueue([track], 0);
			addToHistory(track);
			await playbackService.play(track);
		},
		[store, addToHistory]
	);

	const pause = useCallback(async () => {
		await playbackService.pause();
	}, []);

	const resume = useCallback(async () => {
		await playbackService.resume();
	}, []);

	const togglePlayPause = useCallback(async () => {
		if (store.status === 'playing') {
			await pause();
		} else if (store.status === 'paused') {
			await resume();
		}
	}, [store.status, pause, resume]);

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
		store.toggleShuffle();
	}, [store]);

	const cycleRepeatMode = useCallback(() => {
		store.cycleRepeatMode();
	}, [store]);

	const setVolume = useCallback(async (volume: number) => {
		await playbackService.setVolume(volume);
	}, []);

	const toggleMute = useCallback(() => {
		store.toggleMute();
	}, [store]);

	return {
		currentTrack: store.currentTrack,
		status: store.status,
		position: store.position,
		duration: store.duration,
		volume: store.volume,
		isMuted: store.isMuted,
		repeatMode: store.repeatMode,
		isShuffled: store.isShuffled,
		queue: store.queue,
		queueIndex: store.queueIndex,
		error: store.error,

		isPlaying: store.status === 'playing',
		isPaused: store.status === 'paused',
		isLoading: store.status === 'loading',
		isBuffering: store.status === 'buffering',
		isIdle: store.status === 'idle',

		play,
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
