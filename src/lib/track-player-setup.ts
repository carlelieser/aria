/**
 * React Native Track Player Service Registration
 *
 * Must be imported AFTER expo-router/entry registers the app component.
 * This enables background playback and lock screen controls.
 * See: https://rntp.dev/docs/basics/playback-service
 */

import TrackPlayer from 'react-native-track-player';
import { PlaybackService } from '@plugins/playback/react-native-track-player/service';

TrackPlayer.registerPlaybackService(() => PlaybackService);

export {};
