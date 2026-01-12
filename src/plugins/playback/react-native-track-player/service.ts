/**
 * React Native Track Player Playback Service
 *
 * This service handles remote control events (lock screen, notification, headphone buttons).
 * Must be registered after the app component with TrackPlayer.registerPlaybackService().
 */

import TrackPlayer, { Event } from 'react-native-track-player';

const MIN_SEEK_POSITION = 0;

export async function PlaybackService(): Promise<void> {
	TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
	TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
	TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
	TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
	TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
	TrackPlayer.addEventListener(Event.RemoteSeek, (event) => TrackPlayer.seekTo(event.position));

	TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event) => {
		const position = await TrackPlayer.getPosition();
		await TrackPlayer.seekTo(position + event.interval);
	});

	TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event) => {
		const position = await TrackPlayer.getPosition();
		await TrackPlayer.seekTo(Math.max(MIN_SEEK_POSITION, position - event.interval));
	});
}
