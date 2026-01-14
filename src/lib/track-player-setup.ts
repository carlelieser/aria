/**
 * React Native Track Player Service Registration
 *
 * Must be imported AFTER expo-router/entry registers the app component.
 * This enables background playback and lock screen controls.
 * See: https://rntp.dev/docs/basics/playback-service
 *
 * NOTE: We only register the service here. Actual player setup is deferred
 * until the app is in the foreground (required on Android).
 */

import TrackPlayer from 'react-native-track-player';
import { PlaybackService } from '@plugins/playback/react-native-track-player/service';

TrackPlayer.registerPlaybackService(() => PlaybackService);

export {};
