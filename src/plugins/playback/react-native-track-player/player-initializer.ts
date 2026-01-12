/**
 * Player Initializer
 *
 * Handles initialization and setup of the React Native Track Player.
 */

import TrackPlayer, { Capability } from 'react-native-track-player';
import { getLogger } from '@shared/services/logger';
import { PROGRESS_UPDATE_INTERVAL_SECONDS } from './constants';

const logger = getLogger('PlayerInitializer');

export class PlayerInitializer {
	async setup(initialVolume: number): Promise<void> {
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
			],
			compactCapabilities: [
				Capability.Play,
				Capability.Pause,
				Capability.SkipToNext,
				Capability.SkipToPrevious,
			],
			progressUpdateEventInterval: PROGRESS_UPDATE_INTERVAL_SECONDS,
		});

		await TrackPlayer.setVolume(initialVolume);

		logger.debug('RNTP setup complete');
	}
}
