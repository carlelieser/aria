/**
 * WavyPlayButton Constants
 *
 * Animation parameters, sizing, and geometry constants.
 */

export const ANGULAR_STEP = Math.PI / 90;
export const TWO_PI = 2 * Math.PI;
export const WAVE_AMPLITUDE_RATIO = 0.1;

export const PHASE_DURATION = 3000;
export const PEAK_CHANGE_INTERVAL = 2000;
export const AMPLITUDE_FADE_DURATION = 250;
export const STROKE_TRANSITION_DURATION = 200;

export const PEAK_MIN = 3;
export const PEAK_MAX = 6;
export const IDLE_PEAKS = 4;

export const SPRING_CONFIG = { damping: 18, stiffness: 180 };

/** M3 FAB container sizes (dp) */
export const FAB_CONTAINER_SIZES = {
	sm: 40,
	md: 56,
	lg: 96,
} as const;

export const RING_PADDING = 10;
export const RING_STROKE_WIDTH = 4;

export const ICON_SIZE = {
	sm: 24,
	md: 32,
	lg: 48,
} as const;

/**
 * Derives canvas and radius metrics from the button size.
 */
export function deriveMetrics(size: 'sm' | 'md' | 'lg') {
	const fabSize = FAB_CONTAINER_SIZES[size];
	const canvasSize = fabSize + RING_PADDING * 2;
	const center = canvasSize / 2;
	const idleRadius = fabSize / 2;
	const loadingRawRadius = (canvasSize - RING_STROKE_WIDTH) / 2;
	const loadingAmplitude = loadingRawRadius * WAVE_AMPLITUDE_RATIO;
	const loadingRadius = loadingRawRadius - loadingAmplitude;

	return { fabSize, canvasSize, center, idleRadius, loadingRadius, loadingAmplitude };
}

/**
 * Builds an SVG path for a wavy circle shape.
 * Marked as a Reanimated worklet for use on the UI thread.
 */
export function buildWavyCirclePath(
	cx: number,
	cy: number,
	baseRadius: number,
	amplitude: number,
	peaks: number,
	phase: number
): string {
	'worklet';

	const r0 = baseRadius + amplitude * Math.sin(-phase);
	let d = `M ${(cx + r0).toFixed(1)} ${cy.toFixed(1)}`;

	for (let theta = ANGULAR_STEP; theta < TWO_PI; theta += ANGULAR_STEP) {
		const r = baseRadius + amplitude * Math.sin(peaks * theta - phase);
		const x = cx + r * Math.cos(theta);
		const y = cy + r * Math.sin(theta);
		d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
	}

	d += ' Z';
	return d;
}
