/**
 * DASH Playback Provider Constants
 *
 * Configuration values and thresholds for the expo-video playback provider.
 */

/**
 * Interval in seconds for expo-video's native timeUpdate events. Kept small so
 * position is fine-grained enough for lyric-line syncing: since a line only
 * becomes active once position passes its start, a coarse interval makes every
 * line activate up to that interval late.
 */
export const TIME_UPDATE_INTERVAL_SECONDS = 0.25;

export const MIN_PLAYBACK_RATE = 0.5;
export const MAX_PLAYBACK_RATE = 2.0;
export const MIN_VOLUME = 0;
export const MAX_VOLUME = 1;
export const SKIP_PREVIOUS_THRESHOLD_SECONDS = 3;
