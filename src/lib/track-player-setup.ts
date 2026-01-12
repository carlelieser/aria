/**
 * React Native Track Player Service Registration
 *
 * Must be imported before the app starts to register the playback service.
 * This enables background playback and lock screen controls.
 */

import TrackPlayer from 'react-native-track-player';
import { PlaybackService } from '@/src/plugins/playback/react-native-track-player/service';

TrackPlayer.registerPlaybackService(() => PlaybackService);

export {};
