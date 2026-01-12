import '@/lib/polyfills';
// Track player service must be registered before expo-router/entry
// This ensures the headless JS task can access the service
import '@/src/lib/track-player-setup';
import 'expo-router/entry';
