/**
 * React Native Track Player Constants
 *
 * Configuration values and thresholds for the playback provider.
 */

// Small enough that position is fine-grained for lyric-line syncing (a line
// only activates once position passes its start, so a coarse interval makes
// every line activate up to that interval late).
export const PROGRESS_UPDATE_INTERVAL_SECONDS = 0.25;
export const MIN_PLAYBACK_RATE = 0.5;
export const MAX_PLAYBACK_RATE = 2.0;
export const MIN_VOLUME = 0;
export const MAX_VOLUME = 1;
export const SKIP_PREVIOUS_THRESHOLD_SECONDS = 3;
