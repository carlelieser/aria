/**
 * Audio Visualizer Native Module
 *
 * Provides real-time audio frequency band levels using platform-specific APIs:
 * - Android: android.media.audiofx.Visualizer (requires RECORD_AUDIO permission)
 * - iOS: MTAudioProcessingTap with vDSP FFT (no permission needed)
 *
 * Emits 12 normalized frequency band levels at ~30 Hz for smooth visualization.
 */

import { requireNativeModule, Platform } from 'expo-modules-core';
import type { EventSubscription } from 'expo-modules-core';
import type { AudioLevelsEvent } from './AudioVisualizer.types';

export type { AudioLevelsEvent } from './AudioVisualizer.types';

interface AudioVisualizerNativeModule {
	startCapture(): Promise<void>;
	stopCapture(): Promise<void>;
	isAvailable(): boolean;
	addListener(eventName: string, listener: (event: AudioLevelsEvent) => void): EventSubscription;
}

const nativeModule: AudioVisualizerNativeModule | null =
	Platform.OS === 'web'
		? null
		: requireNativeModule<AudioVisualizerNativeModule>('AudioVisualizer');

/**
 * Start capturing audio levels from the playback engine.
 * On Android, requires RECORD_AUDIO permission.
 */
export async function startCapture(): Promise<void> {
	if (!nativeModule) {
		return;
	}
	return nativeModule.startCapture();
}

/**
 * Stop capturing audio levels.
 */
export async function stopCapture(): Promise<void> {
	if (!nativeModule) {
		return;
	}
	return nativeModule.stopCapture();
}

/**
 * Check if the audio visualizer is available on this platform.
 * Returns false on web or when native module failed to load.
 */
export function isAvailable(): boolean {
	if (!nativeModule) {
		return false;
	}
	return nativeModule.isAvailable();
}

/**
 * Subscribe to real-time audio level events.
 * Each event contains 12 normalized frequency band levels (0.0–1.0).
 */
export function addAudioLevelsListener(
	listener: (event: AudioLevelsEvent) => void
): EventSubscription {
	if (!nativeModule) {
		return { remove: () => {} } as EventSubscription;
	}
	return nativeModule.addListener('onAudioLevels', listener);
}
