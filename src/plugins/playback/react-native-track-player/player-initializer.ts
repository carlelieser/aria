/**
 * Player Initializer
 *
 * Handles initialization and setup of the React Native Track Player.
 */

import TrackPlayer from 'react-native-track-player';
import { getLogger } from '@shared/services/logger';
import { ensureTrackPlayerReady } from './setup';

const logger = getLogger('PlayerInitializer');

export class PlayerInitializer {
	async setup(initialVolume: number): Promise<void> {
		const ready = await ensureTrackPlayerReady();
		if (!ready) {
			throw new Error('TrackPlayer setup failed');
		}

		await TrackPlayer.setVolume(initialVolume);
		logger.debug('RNTP initialized with volume:', initialVolume);
	}
}
