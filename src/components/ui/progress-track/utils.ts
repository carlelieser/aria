/**
 * ProgressTrack Utilities
 *
 * Pure helper functions for building SVG paths used by the progress track variants.
 */

import { CAP_INSET, TRACK_HEIGHT, TWO_PI_OVER_WAVELENGTH, WAVE_STEP } from './types';

/**
 * Builds a sine-wave polyline path from capInset to width-capInset.
 * Phase shifts the wave pattern.
 */
export function buildAnimatedWavePath(width: number, amp: number, phaseValue: number): string {
	'worklet';
	const cy = TRACK_HEIGHT / 2;
	const startX = CAP_INSET;
	const endX = width - CAP_INSET;

	if (endX <= startX) {
		return `M ${startX} ${cy} L ${startX} ${cy}`;
	}

	const startY = cy + amp * Math.sin(TWO_PI_OVER_WAVELENGTH * (startX - phaseValue));
	let d = `M ${startX.toFixed(1)} ${startY.toFixed(1)}`;

	for (let x = startX + WAVE_STEP; x < endX; x += WAVE_STEP) {
		const y = cy + amp * Math.sin(TWO_PI_OVER_WAVELENGTH * (x - phaseValue));
		d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
	}

	const endY = cy + amp * Math.sin(TWO_PI_OVER_WAVELENGTH * (endX - phaseValue));
	d += ` L ${endX.toFixed(1)} ${endY.toFixed(1)}`;

	return d;
}

/**
 * Builds the active track path with rounded left corners and
 * concave inside corners on the right edge (thumb-side gap per M3 spec).
 */
export function buildVariantActiveTrackPath(
	width: number,
	height: number,
	radius: number,
	gap: number,
	insideCorner: number
): string {
	const r = Math.min(radius, width, height / 2);
	const ic = insideCorner;
	const rightX = width - gap;

	if (rightX <= r) {
		return `M ${r} 0 A ${r} ${r} 0 0 0 0 ${r} L 0 ${height - r} A ${r} ${r} 0 0 0 ${r} ${height} Z`;
	}

	return [
		`M ${r} 0`,
		`L ${rightX - ic} 0`,
		`Q ${rightX} 0 ${rightX} ${ic}`,
		`L ${rightX} ${height - ic}`,
		`Q ${rightX} ${height} ${rightX - ic} ${height}`,
		`L ${r} ${height}`,
		`A ${r} ${r} 0 0 1 0 ${height - r}`,
		`L 0 ${r}`,
		`A ${r} ${r} 0 0 1 ${r} 0`,
		'Z',
	].join(' ');
}

/**
 * Builds the inactive track path with rounded right corners and
 * concave inside corners on the left edge (thumb-side gap per M3 spec).
 */
export function buildVariantInactiveTrackPath(
	startX: number,
	totalWidth: number,
	height: number,
	radius: number,
	gap: number,
	insideCorner: number
): string {
	const r = Math.min(radius, totalWidth - startX, height / 2);
	const ic = insideCorner;
	const leftX = startX + gap;
	const rightX = totalWidth;

	if (rightX - leftX <= r) {
		return '';
	}

	return [
		`M ${leftX + ic} 0`,
		`L ${rightX - r} 0`,
		`A ${r} ${r} 0 0 1 ${rightX} ${r}`,
		`L ${rightX} ${height - r}`,
		`A ${r} ${r} 0 0 1 ${rightX - r} ${height}`,
		`L ${leftX + ic} ${height}`,
		`Q ${leftX} ${height} ${leftX} ${height - ic}`,
		`L ${leftX} ${ic}`,
		`Q ${leftX} 0 ${leftX + ic} 0`,
		'Z',
	].join(' ');
}
