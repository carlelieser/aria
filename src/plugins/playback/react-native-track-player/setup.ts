/**
 * TrackPlayer Setup
 *
 * Centralized, idempotent setup for React Native Track Player.
 * Safe to call multiple times - will only run setup once.
 *
 * On Android, the app must be in the foreground when setting up the player.
 * This module handles that requirement with AppState checks and retry logic.
 */

import { AppState, Platform } from 'react-native';
import TrackPlayer, { AppKilledPlaybackBehavior, Capability } from 'react-native-track-player';
import { getLogger } from '@shared/services/logger';
import { PROGRESS_UPDATE_INTERVAL_SECONDS } from './constants';

const logger = getLogger('TrackPlayerSetup');

let setupPromise: Promise<boolean> | null = null;
let isSetupComplete = false;

/**
 * Initialize TrackPlayer. Safe to call multiple times.
 * Returns true if setup succeeded, false if it failed.
 * On Android, waits for app to be in foreground before setup.
 */
export async function setupTrackPlayer(): Promise<boolean> {
	if (isSetupComplete) {
		return true;
	}

	if (setupPromise) {
		return setupPromise;
	}

	setupPromise = _doSetup();
	return setupPromise;
}

async function _waitForForeground(): Promise<void> {
	if (Platform.OS !== 'android') return;
	if (AppState.currentState === 'active') return;

	logger.info('Waiting for app to be in foreground...');
	return new Promise((resolve) => {
		const subscription = AppState.addEventListener('change', (state) => {
			if (state === 'active') {
				subscription.remove();
				resolve();
			}
		});
	});
}

/**
 * Check if TrackPlayer has been set up successfully.
 */
export function isTrackPlayerReady(): boolean {
	return isSetupComplete;
}

/**
 * Wait for TrackPlayer to be ready. Initiates setup if not started.
 */
export async function ensureTrackPlayerReady(): Promise<boolean> {
	if (isSetupComplete) {
		return true;
	}
	return setupTrackPlayer();
}

async function _doSetup(): Promise<boolean> {
	try {
		await _waitForForeground();
		logger.info('Setting up TrackPlayer...');

		await TrackPlayer.setupPlayer({
			autoHandleInterruptions: true,
		});

		await TrackPlayer.updateOptions({
			capabilities: [
				Capability.Play,
				Capability.Pause,
				Capability.Stop,
				Capability.SkipToNext,
				Capability.SkipToPrevious,
				Capability.SeekTo,
				Capability.JumpForward,
				Capability.JumpBackward,
			],
			notificationCapabilities: [
				Capability.Play,
				Capability.Pause,
				Capability.SkipToNext,
				Capability.SkipToPrevious,
			],
			compactCapabilities: [
				Capability.Play,
				Capability.Pause,
				Capability.SkipToNext,
				Capability.SkipToPrevious,
			],
			progressUpdateEventInterval: PROGRESS_UPDATE_INTERVAL_SECONDS,
			android: {
				appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
			},
		});

		isSetupComplete = true;
		logger.info('TrackPlayer setup complete');
		return true;
	} catch (error) {
		logger.error('TrackPlayer setup failed:', error instanceof Error ? error : undefined);
		setupPromise = null;
		return false;
	}
}
