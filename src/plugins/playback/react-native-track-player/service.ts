/**
 * React Native Track Player Playback Service
 *
 * This service handles remote control events (lock screen, notification, headphone buttons).
 * Must be registered after the app component with TrackPlayer.registerPlaybackService().
 */

import TrackPlayer, { Event } from 'react-native-track-player';
import { getLogger } from '@shared/services/logger';

const logger = getLogger('RNTPPlaybackService');
const MIN_SEEK_POSITION = 0;

export async function PlaybackService(): Promise<void> {
	logger.debug('PlaybackService initializing - registering remote control handlers');

	TrackPlayer.addEventListener(Event.RemotePlay, () => {
		logger.debug('RemotePlay received (service)');
		TrackPlayer.play();
	});

	TrackPlayer.addEventListener(Event.RemotePause, () => {
		logger.debug('RemotePause received (service)');
		TrackPlayer.pause();
	});

	TrackPlayer.addEventListener(Event.RemoteStop, () => {
		logger.debug('RemoteStop received (service)');
		TrackPlayer.stop();
	});

	TrackPlayer.addEventListener(Event.RemoteNext, () => {
		logger.debug('RemoteNext received (service)');
		// Skip handled by main app event handler - uses app queue instead of native queue
	});

	TrackPlayer.addEventListener(Event.RemotePrevious, () => {
		logger.debug('RemotePrevious received (service)');
		// Skip handled by main app event handler - uses app queue instead of native queue
	});

	TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
		logger.debug(`RemoteSeek received (service): position=${event.position}`);
		TrackPlayer.seekTo(event.position);
	});

	TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event) => {
		logger.debug(`RemoteJumpForward received (service): interval=${event.interval}`);
		const position = await TrackPlayer.getPosition();
		await TrackPlayer.seekTo(position + event.interval);
	});

	TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event) => {
		logger.debug(`RemoteJumpBackward received (service): interval=${event.interval}`);
		const position = await TrackPlayer.getPosition();
		await TrackPlayer.seekTo(Math.max(MIN_SEEK_POSITION, position - event.interval));
	});

	logger.debug('PlaybackService initialized - all remote control handlers registered');
}
