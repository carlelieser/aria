/**
 * Real-time audio levels hook.
 *
 * Bridges native audio visualizer events to reanimated shared values.
 * Starts/stops capture based on playback state and handles Android
 * RECORD_AUDIO permission flow with graceful fallback.
 */

import { useEffect, useRef, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import { useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';
import { startCapture, stopCapture, isAvailable, addAudioLevelsListener } from 'audio-visualizer';
import { useIsPlaying } from '@/src/application/state/player-store';

const BAND_COUNT = 4;

const SPRING_CONFIG = {
	damping: 15,
	stiffness: 150,
	mass: 0.5,
} as const;

const ZERO_SPRING_CONFIG = {
	damping: 20,
	stiffness: 100,
	mass: 0.5,
} as const;

export interface AudioLevelsResult {
	readonly levels: readonly [
		SharedValue<number>,
		SharedValue<number>,
		SharedValue<number>,
		SharedValue<number>,
	];
	readonly isCapturing: boolean;
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
	const isCapturingRef = useRef(false);
	const permissionDeniedRef = useRef(false);

	const animateToZero = useCallback(() => {
		level0.value = withSpring(0, ZERO_SPRING_CONFIG);
		level1.value = withSpring(0, ZERO_SPRING_CONFIG);
		level2.value = withSpring(0, ZERO_SPRING_CONFIG);
		level3.value = withSpring(0, ZERO_SPRING_CONFIG);
	}, [level0, level1, level2, level3]);

	useEffect(() => {
		if (!isPlaying || permissionDeniedRef.current) {
			if (isCapturingRef.current) {
				stopCapture().catch(() => {});
				isCapturingRef.current = false;
			}
			animateToZero();
			return;
		}

		if (!isAvailable()) {
			return;
		}

		let cancelled = false;

		const start = async () => {
			try {
				if (Platform.OS === 'android') {
					const granted = await requestRecordPermission();
					if (!granted) {
						permissionDeniedRef.current = true;
						return;
					}
				}

				if (cancelled) return;

				await startCapture();
				isCapturingRef.current = true;
			} catch {
				// Native module failed — fall back to synthetic animation
			}
		};

		const subscription = addAudioLevelsListener((event) => {
			if (!isCapturingRef.current) return;

			const levels = event.levels;
			if (levels.length < BAND_COUNT) return;

			level0.value = withSpring(levels[0], SPRING_CONFIG);
			level1.value = withSpring(levels[1], SPRING_CONFIG);
			level2.value = withSpring(levels[2], SPRING_CONFIG);
			level3.value = withSpring(levels[3], SPRING_CONFIG);
		});

		start();

		return () => {
			cancelled = true;
			subscription.remove();

			if (isCapturingRef.current) {
				stopCapture().catch(() => {});
				isCapturingRef.current = false;
			}
		};
	}, [isPlaying, level0, level1, level2, level3, animateToZero]);

	return {
		levels: [level0, level1, level2, level3] as const,
		isCapturing: isCapturingRef.current,
	};
}
