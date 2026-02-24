/**
 * Polygon Point Generation
 *
 * Worklet function that generates interpolated SVG polygon points.
 */

import {
	DEFAULT_SIZE,
	DEFAULT_STROKE_WIDTH,
	MIN_SEGMENTS,
	MAX_INTERPOLATION_POINTS,
} from './types';

/**
 * Worklet version of point generation for use in animated props.
 */
export function generateInterpolatedPointsWorklet(
	segments: number,
	size: number,
	rotation: number,
	strokeWidth: number = DEFAULT_STROKE_WIDTH
): string {
	'worklet';

	// Guard against NaN or invalid values
	const safeSegments = Number.isFinite(segments) ? segments : MIN_SEGMENTS;
	const safeSize = Number.isFinite(size) ? size : DEFAULT_SIZE;
	const safeRotation = Number.isFinite(rotation) ? rotation : 0;
	const safeStrokeWidth = Number.isFinite(strokeWidth) ? strokeWidth : DEFAULT_STROKE_WIDTH;

	const validSegments = Math.max(MIN_SEGMENTS, safeSegments);
	const center = safeSize / 2;
	const radius = (safeSize - safeStrokeWidth) / 2;
	const rotationRad = (safeRotation * Math.PI) / 180;

	let points = '';
	const pointCount = MAX_INTERPOLATION_POINTS;

	for (let i = 0; i < pointCount; i++) {
		const t = i / pointCount;
		const segmentIndex = t * validSegments;
		const currentVertex = Math.floor(segmentIndex);
		const nextVertex = (currentVertex + 1) % Math.ceil(validSegments);
		const localT = segmentIndex - currentVertex;

		const angle1 = (2 * Math.PI * currentVertex) / validSegments - Math.PI / 2 + rotationRad;
		const angle2 = (2 * Math.PI * nextVertex) / validSegments - Math.PI / 2 + rotationRad;

		let adjustedAngle2 = angle2;
		if (nextVertex === 0 && currentVertex === Math.floor(validSegments)) {
			adjustedAngle2 = angle1 + (2 * Math.PI) / validSegments;
		}

		const x1 = center + radius * Math.cos(angle1);
		const y1 = center + radius * Math.sin(angle1);
		const x2 = center + radius * Math.cos(adjustedAngle2);
		const y2 = center + radius * Math.sin(adjustedAngle2);

		const x = x1 + (x2 - x1) * localT;
		const y = y1 + (y2 - y1) * localT;

		if (i > 0) {
			points += ' ';
		}
		points += `${x.toFixed(2)},${y.toFixed(2)}`;
	}

	return points;
}
