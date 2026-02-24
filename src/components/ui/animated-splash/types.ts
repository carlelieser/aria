/**
 * AnimatedSplash Types
 *
 * Shared types and constants for the AnimatedSplash component.
 */

import { Platform } from 'react-native';

export const IS_WEB = Platform.OS === 'web';

export const POLYGON_SIZE = 225;
export const ICON_SIZE = 100;
export const ANIMATION_DURATION = 400;
export const MORPH_INTERVAL = 2500;
export const ROTATION_DURATION = 4000;
export const MIN_SEGMENTS = 3;
export const MAX_SEGMENTS = 6;
export const PROGRESS_BAR_WIDTH = 200;
export const PROGRESS_TIMING_MS = 300;

export interface AnimatedSplashProps {
	readonly isReady: boolean;
	readonly onAnimationComplete?: () => void;
	readonly isDark?: boolean;
}

export function getRandomSegments(current: number): number {
	let next: number;
	do {
		next = Math.floor(Math.random() * (MAX_SEGMENTS - MIN_SEGMENTS + 1)) + MIN_SEGMENTS;
	} while (next === current);
	return next;
}
