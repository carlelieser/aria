/**
 * AnimatedPolygon Types
 *
 * Props interfaces and constants for polygon components.
 */

import type { ViewStyle } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

export const DEFAULT_SIZE = 100;
export const DEFAULT_STROKE_WIDTH = 2;
export const MIN_SEGMENTS = 3;
export const MAX_INTERPOLATION_POINTS = 360;

export interface AnimatedPolygonProps {
	readonly segments: number;
	readonly size?: number;
	readonly fill?: string;
	readonly stroke?: string;
	readonly strokeWidth?: number;
	readonly rotation?: number;
	readonly springConfig?: {
		readonly damping?: number;
		readonly stiffness?: number;
		readonly mass?: number;
	};
	readonly style?: ViewStyle;
}

export interface ControlledPolygonProps {
	/** Shared value controlling the number of segments */
	readonly segments: SharedValue<number>;
	/** Size of the SVG viewbox (width and height) */
	readonly size?: number;
	/** Fill color of the polygon */
	readonly fill?: string;
	/** Stroke color of the polygon */
	readonly stroke?: string;
	/** Stroke width */
	readonly strokeWidth?: number;
	/** Rotation in degrees */
	readonly rotation?: number;
	/** Container style */
	readonly style?: ViewStyle;
}
