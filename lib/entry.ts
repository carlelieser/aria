import '@/lib/polyfills';
import 'expo-router/entry';
// Track player service must be registered AFTER the app component is registered
// See: https://rntp.dev/docs/basics/playback-service
import '@/src/lib/track-player-setup';
