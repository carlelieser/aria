/**
 * Real-time audio levels hook.
 *
 * Bridges native audio visualizer events to reanimated shared values.
 * Restarts capture on play/pause to handle audio session changes
 * (expo-video creates new sessions per track).
 */

import { useEffect, useRef, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { startCapture, stopCapture, isAvailable, addAudioLevelsListener } from 'audio-visualizer';
import { useIsPlaying } from '@/src/application/state/player-store';

const BAND_COUNT = 12;
const ZERO_LEVELS: number[] = new Array(BAND_COUNT).fill(0);

export interface AudioLevelsResult {
	readonly levels: SharedValue<number[]>;
}

async function ensureRecordPermission(): Promise<boolean> {
	if (Platform.OS !== 'android') return true;

	// Check if already granted — avoids showing the dialog again
	const already = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
	if (already) return true;

	const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
		title: 'Audio Visualizer',
		message: 'Aria needs microphone access to visualize audio playback in real time.',
		buttonPositive: 'Allow',
		buttonNegative: 'Deny',
	});

	return result === PermissionsAndroid.RESULTS.GRANTED;
}

export function useAudioLevels(): AudioLevelsResult {
	const levels = useSharedValue(ZERO_LEVELS);
	const isPlaying = useIsPlaying();
	const permissionDeniedRef = useRef(false);

	const animateToZero = useCallback(() => {
		levels.value = ZERO_LEVELS;
	}, [levels]);

	useEffect(() => {
		if (!isPlaying || permissionDeniedRef.current || !isAvailable()) {
			animateToZero();
			return;
		}

		let cancelled = false;

		const subscription = addAudioLevelsListener((event) => {
			const raw = event.levels;
			if (raw.length < BAND_COUNT) return;
			levels.value = raw.slice(0, BAND_COUNT) as number[];
		});

		const start = async () => {
			try {
				if (Platform.OS === 'android') {
					const granted = await ensureRecordPermission();
					if (!granted) {
						permissionDeniedRef.current = true;
						return;
					}
				}
				if (cancelled) return;
				await startCapture();
			} catch {
				// Native module failed — waveform falls back to synthetic animation
			}
		};

		start();

		return () => {
			cancelled = true;
			subscription.remove();
			stopCapture().catch(() => {});
		};
	}, [isPlaying, levels, animateToZero]);

	return { levels };
}
