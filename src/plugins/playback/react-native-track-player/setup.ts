/**
 * TrackPlayer Setup
 *
 * Centralized, idempotent setup for React Native Track Player.
 * Safe to call multiple times - will only run setup once.
 * Should be called as early as possible in the app lifecycle.
 */

import TrackPlayer, { AppKilledPlaybackBehavior, Capability } from 'react-native-track-player';
import { getLogger } from '@shared/services/logger';
import { PROGRESS_UPDATE_INTERVAL_SECONDS } from './constants';

const logger = getLogger('TrackPlayerSetup');

let setupPromise: Promise<boolean> | null = null;
let isSetupComplete = false;

/**
 * Initialize TrackPlayer. Safe to call multiple times.
 * Returns true if setup succeeded, false if it failed.
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
