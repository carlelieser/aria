/**
 * Real-time audio levels hook.
 *
 * Bridges native audio visualizer events to reanimated shared values.
 * Restarts capture on play/pause to handle audio session changes
 * (expo-video creates new sessions per track).
 */

import { useEffect, useRef, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import { useSharedValue, withTiming, Easing, type SharedValue } from 'react-native-reanimated';
import { startCapture, stopCapture, isAvailable, addAudioLevelsListener } from 'audio-visualizer';
import { useIsPlaying } from '@/src/application/state/player-store';

const BAND_COUNT = 4;

const TIMING_CONFIG = {
	duration: 80,
	easing: Easing.out(Easing.cubic),
} as const;

const ZERO_TIMING_CONFIG = {
	duration: 300,
	easing: Easing.out(Easing.quad),
} as const;

export interface AudioLevelsResult {
	readonly levels: readonly [
		SharedValue<number>,
		SharedValue<number>,
		SharedValue<number>,
		SharedValue<number>,
	];
}

async function requestRecordPermission(): Promise<boolean> {
	if (Platform.OS !== 'android') return true;

	const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
		title: 'Audio Visualizer',
		message: 'Aria needs microphone access to visualize audio playback in real time.',
		buttonPositive: 'Allow',
		buttonNegative: 'Deny',
	});

	return result === PermissionsAndroid.RESULTS.GRANTED;
}

export function useAudioLevels(): AudioLevelsResult {
	const level0 = useSharedValue(0);
	const level1 = useSharedValue(0);
	const level2 = useSharedValue(0);
	const level3 = useSharedValue(0);

	const isPlaying = useIsPlaying();
	const permissionDeniedRef = useRef(false);

	const animateToZero = useCallback(() => {
		level0.value = withTiming(0, ZERO_TIMING_CONFIG);
		level1.value = withTiming(0, ZERO_TIMING_CONFIG);
		level2.value = withTiming(0, ZERO_TIMING_CONFIG);
		level3.value = withTiming(0, ZERO_TIMING_CONFIG);
	}, [level0, level1, level2, level3]);

	useEffect(() => {
		if (!isPlaying || permissionDeniedRef.current || !isAvailable()) {
			animateToZero();
			return;
		}

		let cancelled = false;

		const subscription = addAudioLevelsListener((event) => {
			const levels = event.levels;
			if (levels.length < BAND_COUNT) return;

			level0.value = withTiming(levels[0], TIMING_CONFIG);
			level1.value = withTiming(levels[1], TIMING_CONFIG);
			level2.value = withTiming(levels[2], TIMING_CONFIG);
			level3.value = withTiming(levels[3], TIMING_CONFIG);
		});

		const start = async () => {
			if (Platform.OS === 'android') {
				const granted = await requestRecordPermission();
				if (!granted) {
					permissionDeniedRef.current = true;
					return;
				}
			}
			if (cancelled) return;
			await startCapture();
		};

		start().catch(() => {});

		return () => {
			cancelled = true;
			subscription.remove();
			stopCapture().catch(() => {});
		};
	}, [isPlaying, level0, level1, level2, level3, animateToZero]);

	return {
		levels: [level0, level1, level2, level3] as const,
	};
}
