/**
 * Audio Equalizer Types
 *
 * Types for the native audio equalizer module.
 */

export interface EqualizerBandInfo {
	/** Minimum frequency for this band in Hz */
	readonly minFrequency: number;
	/** Maximum frequency for this band in Hz */
	readonly maxFrequency: number;
	/** Center frequency for this band in Hz */
	readonly centerFrequency: number;
}

export interface EqualizerInfo {
	/** Whether the equalizer is available on this device */
	readonly isAvailable: boolean;
	/** Number of bands supported */
	readonly numberOfBands: number;
	/** Minimum band level in millibels (mB) */
	readonly minBandLevel: number;
	/** Maximum band level in millibels (mB) */
	readonly maxBandLevel: number;
	/** Information about each frequency band */
	readonly bands: EqualizerBandInfo[];
}

export interface EqualizerPreset {
	readonly id: string;
	readonly name: string;
}

export interface EqualizerState {
	/** Whether the equalizer is currently enabled */
	readonly isEnabled: boolean;
	/** Current band levels in millibels (mB) */
	readonly bandLevels: number[];
	/** Currently selected preset name (if any) */
	readonly presetName: string | null;
}
