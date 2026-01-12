/**
 * React Native Track Player Playback Service
 *
 * This service handles remote control events (lock screen, notification, headphone buttons).
 * Must be registered before the app starts with TrackPlayer.registerPlaybackService().
 */

import TrackPlayer, { Event } from 'react-native-track-player';
import { getLogger } from '@shared/services/logger';

const logger = getLogger('PlaybackService');
const MIN_SEEK_POSITION = 0;

export async function PlaybackService(): Promise<void> {
	// Use console.log as fallback since headless JS context may not have full logger
	console.log('[PlaybackService] Initializing - registering remote event handlers');
	logger.debug('PlaybackService initializing - registering remote event handlers');

	TrackPlayer.addEventListener(Event.RemotePlay, async () => {
		console.log('[PlaybackService] RemotePlay event received');
		logger.debug('RemotePlay event received');
		try {
			await TrackPlayer.play();
			console.log('[PlaybackService] RemotePlay: TrackPlayer.play() completed');
			logger.debug('RemotePlay: TrackPlayer.play() completed');
		} catch (error) {
			console.log('[PlaybackService] RemotePlay failed:', error);
			logger.error('RemotePlay failed', error instanceof Error ? error : undefined);
		}
	});

	TrackPlayer.addEventListener(Event.RemotePause, async () => {
		console.log('[PlaybackService] RemotePause event received');
		logger.debug('RemotePause event received');
		try {
			await TrackPlayer.pause();
			console.log('[PlaybackService] RemotePause: TrackPlayer.pause() completed');
			logger.debug('RemotePause: TrackPlayer.pause() completed');
		} catch (error) {
			console.log('[PlaybackService] RemotePause failed:', error);
			logger.error('RemotePause failed', error instanceof Error ? error : undefined);
		}
	});

	TrackPlayer.addEventListener(Event.RemoteStop, async () => {
		logger.debug('RemoteStop event received');
		try {
			await TrackPlayer.stop();
			logger.debug('RemoteStop: TrackPlayer.stop() completed');
		} catch (error) {
			logger.error('RemoteStop failed', error instanceof Error ? error : undefined);
		}
	});

	TrackPlayer.addEventListener(Event.RemoteNext, async () => {
		logger.debug('RemoteNext event received');
		try {
			await TrackPlayer.skipToNext();
			logger.debug('RemoteNext: TrackPlayer.skipToNext() completed');
		} catch (error) {
			logger.error('RemoteNext failed', error instanceof Error ? error : undefined);
		}
	});

	TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
		logger.debug('RemotePrevious event received');
		try {
			await TrackPlayer.skipToPrevious();
			logger.debug('RemotePrevious: TrackPlayer.skipToPrevious() completed');
		} catch (error) {
			logger.error('RemotePrevious failed', error instanceof Error ? error : undefined);
		}
	});

	TrackPlayer.addEventListener(Event.RemoteSeek, async (event) => {
		logger.debug('RemoteSeek event received', { position: event.position });
		try {
			await TrackPlayer.seekTo(event.position);
			logger.debug('RemoteSeek: TrackPlayer.seekTo() completed');
		} catch (error) {
			logger.error('RemoteSeek failed', error instanceof Error ? error : undefined);
		}
	});

	TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event) => {
		logger.debug('RemoteJumpForward event received', { interval: event.interval });
		try {
			const position = await TrackPlayer.getPosition();
			await TrackPlayer.seekTo(position + event.interval);
			logger.debug('RemoteJumpForward: completed');
		} catch (error) {
			logger.error('RemoteJumpForward failed', error instanceof Error ? error : undefined);
		}
	});

	TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event) => {
		logger.debug('RemoteJumpBackward event received', { interval: event.interval });
		try {
			const position = await TrackPlayer.getPosition();
			await TrackPlayer.seekTo(Math.max(MIN_SEEK_POSITION, position - event.interval));
			logger.debug('RemoteJumpBackward: completed');
		} catch (error) {
			logger.error('RemoteJumpBackward failed', error instanceof Error ? error : undefined);
		}
	});

	logger.debug('PlaybackService initialization complete');
}
