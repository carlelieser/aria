/**
 * React Native Track Player Service Registration
 *
 * Must be imported before the app starts to register the playback service.
 * This enables background playback and lock screen controls.
 */

import TrackPlayer from 'react-native-track-player';
import { PlaybackService } from '@/src/plugins/playback/react-native-track-player/service';

console.warn('[TrackPlayerSetup] Registering playback service...');
TrackPlayer.registerPlaybackService(() => {
	console.warn('[TrackPlayerSetup] Factory called - returning PlaybackService');
	return PlaybackService;
});
console.warn('[TrackPlayerSetup] Registration complete');

export {};
