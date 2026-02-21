/**
 * Audio Visualizer Types
 *
 * Types for the native audio visualizer module that provides
 * real-time frequency band levels from the audio playback engine.
 */

export interface AudioLevelsEvent {
	/** 12 normalized frequency band levels (0.0–1.0) */
	readonly levels: readonly number[];
}
