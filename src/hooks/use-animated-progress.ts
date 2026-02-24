/**
 * useAnimatedProgress Hook
 *
 * Provides a Reanimated shared value representing playback progress (0-1).
 * Subscribes to the Zustand player store outside the React render cycle,
 * so updates drive UI-thread animations without triggering React re-renders.
 *
 * - Smoothly animates between progress ticks (800ms to bridge the 1s update gap)
 * - Snaps immediately to 0 on track change or seek-to-start
 */

import { useEffect } from 'react';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { usePlayerStore } from '@/src/application/state/player-store';

/** Duration to animate between ticks; slightly less than the 1s update interval for smoothness. */
const PROGRESS_ANIMATION_MS = 800;

/** Threshold below which we snap instantly (e.g., track restart, seek to start). */
const SNAP_THRESHOLD = 0.01;

function computeProgress(position: number, duration: number): number {
	return duration > 0 ? position / duration : 0;
}

export function useAnimatedProgress() {
	const progress = useSharedValue(0);

	useEffect(() => {
		const initial = usePlayerStore.getState();
		progress.value = computeProgress(
			initial.position.totalMilliseconds,
			initial.duration.totalMilliseconds
		);

		let prevPositionMs = initial.position.totalMilliseconds;

		const unsubscribe = usePlayerStore.subscribe((state) => {
			const posMs = state.position.totalMilliseconds;
			const durMs = state.duration.totalMilliseconds;

			// Skip if position hasn't changed
			if (posMs === prevPositionMs) return;
			prevPositionMs = posMs;

			const fraction = computeProgress(posMs, durMs);

			// Snap immediately on reset (track change, seek to start)
			if (fraction < SNAP_THRESHOLD) {
				progress.value = 0;
			} else {
				progress.value = withTiming(fraction, { duration: PROGRESS_ANIMATION_MS });
			}
		});

		return unsubscribe;
	}, [progress]);

	return progress;
}
