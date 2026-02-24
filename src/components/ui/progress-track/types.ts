/**
 * ProgressTrack Types
 *
 * Shared types, constants, and tokens for the ProgressTrack component family.
 */

import type { useAnimatedProps } from 'react-native-reanimated';
import type { ProgressBarStyle } from '@/src/application/state/settings-store';

/** M3 Expressive determinate progress indicator tokens */
export const ACTIVE_THICKNESS = 4;
export const TRACK_THICKNESS = 4;
export const WAVE_AMPLITUDE = 4;
export const WAVELENGTH = 40;
export const TRACK_HEIGHT = 14;
export const GAP_SIZE = 4;
export const INACTIVE_INSET = 12;
export const STOP_DIAMETER = 4;
export const STOP_RADIUS = STOP_DIAMETER / 2;
export const STOP_GAP = 4;

export const THUMB_SIZE = 24;
export const HIT_SLOP = 16;

export const CAP_INSET = ACTIVE_THICKNESS / 2;
export const WAVE_STEP = 2;
export const TWO_PI_OVER_WAVELENGTH = (2 * Math.PI) / WAVELENGTH;

/** Expressive variant tokens (M3 Expressive slider) */
export const VARIANT_TRACK_HEIGHT = 16;
export const VARIANT_TRACK_RADIUS = VARIANT_TRACK_HEIGHT / 2;
export const VARIANT_HANDLE_WIDTH = 4;
export const VARIANT_HANDLE_HEIGHT = 44;
export const VARIANT_HANDLE_RADIUS = 2;
export const VARIANT_THUMB_GAP = 6;
export const VARIANT_INSIDE_CORNER = 2;

/** Basic style tokens */
export const BASIC_TRACK_THICKNESS = 4;
export const BASIC_THUMB_SIZE = 16;
export const BASIC_TRACK_HEIGHT = BASIC_TRACK_THICKNESS;

export interface ProgressTrackColors {
	readonly primary: string;
	readonly primaryContainer: string;
	readonly onSurfaceVariant: string;
	readonly surfaceContainerHighest?: string;
}

export interface ProgressTrackProps {
	readonly variant: ProgressBarStyle;
	readonly progress: number;
	readonly colors: ProgressTrackColors;
	readonly animated?: boolean;
	readonly interactive?: boolean;
	readonly onSeek?: (progress: number) => void;
	readonly showTimeLabels?: boolean;
	readonly currentTime?: string;
	readonly totalTime?: string;
	readonly disabled?: boolean;
}

export interface TrackRenderParams {
	readonly trackWidth: number;
	readonly activeWidth: number;
	readonly activeEnd: number;
	readonly cy: number;
	readonly inactiveStart: number;
	readonly inactiveEnd: number;
	readonly stopCx: number;
	readonly colors: ProgressTrackColors;
	readonly waveAnimatedProps: ReturnType<typeof useAnimatedProps>;
}
