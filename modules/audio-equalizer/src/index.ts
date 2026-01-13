/**
 * Audio Equalizer Native Module
 *
 * Provides native equalizer functionality using platform-specific APIs:
 * - Android: android.media.audiofx.Equalizer
 * - iOS: AVAudioUnitEQ
 *
 * The equalizer attaches to the system audio output session used by
 * react-native-track-player.
 */

import { requireNativeModule, Platform } from 'expo-modules-core';
import type { EqualizerInfo, EqualizerPreset, EqualizerState } from './AudioEqualizer.types';

export type { EqualizerInfo, EqualizerPreset, EqualizerState } from './AudioEqualizer.types';

interface AudioEqualizerModule {
	getEqualizerInfo(): Promise<EqualizerInfo>;
	getPresets(): Promise<EqualizerPreset[]>;
	getState(): Promise<EqualizerState>;
	setEnabled(enabled: boolean): Promise<void>;
	setBandLevel(bandIndex: number, level: number): Promise<void>;
	setBandLevels(levels: number[]): Promise<void>;
	usePreset(presetName: string): Promise<void>;
	release(): Promise<void>;
}

const NativeModule: AudioEqualizerModule | null =
	Platform.OS === 'web' ? null : requireNativeModule('AudioEqualizer');

/**
 * Get information about the device's equalizer capabilities.
 */
export async function getEqualizerInfo(): Promise<EqualizerInfo> {
	if (!NativeModule) {
		return {
			isAvailable: false,
			numberOfBands: 0,
			minBandLevel: 0,
			maxBandLevel: 0,
			bands: [],
		};
	}
	return NativeModule.getEqualizerInfo();
}

/**
 * Get available system presets.
 */
export async function getPresets(): Promise<EqualizerPreset[]> {
	if (!NativeModule) {
		return [];
	}
	return NativeModule.getPresets();
}

/**
 * Get current equalizer state.
 */
export async function getState(): Promise<EqualizerState> {
	if (!NativeModule) {
		return {
			isEnabled: false,
			bandLevels: [],
			presetName: null,
		};
	}
	return NativeModule.getState();
}

/**
 * Enable or disable the equalizer.
 */
export async function setEnabled(enabled: boolean): Promise<void> {
	if (!NativeModule) {
		throw new Error('AudioEqualizer module is not available on web');
	}
	return NativeModule.setEnabled(enabled);
}

/**
 * Set the level for a specific band.
 * @param bandIndex The band index (0-based)
 * @param level Level in millibels (mB), typically -1500 to 1500
 */
export async function setBandLevel(bandIndex: number, level: number): Promise<void> {
	if (!NativeModule) {
		throw new Error('AudioEqualizer module is not available on web');
	}
	return NativeModule.setBandLevel(bandIndex, level);
}

/**
 * Set all band levels at once.
 * @param levels Array of levels in millibels (mB)
 */
export async function setBandLevels(levels: number[]): Promise<void> {
	if (!NativeModule) {
		throw new Error('AudioEqualizer module is not available on web');
	}
	return NativeModule.setBandLevels(levels);
}

/**
 * Apply a system preset by name.
 */
export async function usePreset(presetName: string): Promise<void> {
	if (!NativeModule) {
		throw new Error('AudioEqualizer module is not available on web');
	}
	return NativeModule.usePreset(presetName);
}

/**
 * Release the equalizer resources.
 * Call this when the app is being destroyed or equalizer is no longer needed.
 */
export async function release(): Promise<void> {
	if (!NativeModule) {
		return;
	}
	return NativeModule.release();
}

/**
 * Check if native module is available (false on web).
 */
export function isNativeModuleAvailable(): boolean {
	return NativeModule !== null;
}

/**
 * Convert decibels to millibels.
 */
export function dbToMillibels(db: number): number {
	return Math.round(db * 100);
}

/**
 * Convert millibels to decibels.
 */
export function millibelsToDb(millibels: number): number {
	return millibels / 100;
}
