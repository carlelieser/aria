/**
 * Track Renderer
 *
 * Renders the SVG track visuals for each ProgressTrack variant style.
 */

import Svg, { Path, Line, Circle } from 'react-native-svg';
import Animated from 'react-native-reanimated';
import type { ProgressBarStyle } from '@/src/application/state/settings-store';
import type { TrackRenderParams } from './types';
import {
	ACTIVE_THICKNESS,
	TRACK_THICKNESS,
	TRACK_HEIGHT,
	STOP_RADIUS,
	BASIC_TRACK_HEIGHT,
	BASIC_TRACK_THICKNESS,
	VARIANT_TRACK_HEIGHT,
	VARIANT_TRACK_RADIUS,
	VARIANT_THUMB_GAP,
	VARIANT_INSIDE_CORNER,
} from './types';
import { buildVariantActiveTrackPath, buildVariantInactiveTrackPath } from './utils';
import { styles } from './styles';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export function renderTrack(style: ProgressBarStyle, params: TrackRenderParams) {
	if (style === 'basic') {
		return renderBasicTrack(params);
	}

	if (style === 'expressive-variant') {
		return renderVariantTrack(params);
	}

	return renderExpressiveTrack(params);
}

function renderBasicTrack(params: TrackRenderParams) {
	const { trackWidth, activeEnd, colors } = params;
	const basicCy = BASIC_TRACK_HEIGHT / 2;

	return (
		<Svg width={trackWidth} height={BASIC_TRACK_HEIGHT} style={styles.basicTrackSvg}>
			<Line
				x1={0}
				y1={basicCy}
				x2={trackWidth}
				y2={basicCy}
				stroke={colors.primaryContainer}
				strokeWidth={BASIC_TRACK_THICKNESS}
				strokeLinecap={'round'}
			/>
			{activeEnd > 0 && (
				<Line
					x1={0}
					y1={basicCy}
					x2={activeEnd}
					y2={basicCy}
					stroke={colors.primary}
					strokeWidth={BASIC_TRACK_THICKNESS}
					strokeLinecap={'round'}
				/>
			)}
		</Svg>
	);
}

function renderVariantTrack(params: TrackRenderParams) {
	const { trackWidth, activeEnd, stopCx, colors } = params;
	const vcy = VARIANT_TRACK_HEIGHT / 2;
	const inactiveColor = colors.surfaceContainerHighest ?? colors.primaryContainer;
	const inactivePath = buildVariantInactiveTrackPath(
		activeEnd,
		trackWidth,
		VARIANT_TRACK_HEIGHT,
		VARIANT_TRACK_RADIUS,
		VARIANT_THUMB_GAP,
		VARIANT_INSIDE_CORNER
	);

	return (
		<Svg width={trackWidth} height={VARIANT_TRACK_HEIGHT} style={styles.variantTrackSvg}>
			{inactivePath.length > 0 && <Path d={inactivePath} fill={inactiveColor} />}
			{activeEnd > 0 && (
				<Path
					d={buildVariantActiveTrackPath(
						activeEnd,
						VARIANT_TRACK_HEIGHT,
						VARIANT_TRACK_RADIUS,
						VARIANT_THUMB_GAP,
						VARIANT_INSIDE_CORNER
					)}
					fill={colors.primary}
				/>
			)}
			<Circle cx={stopCx} cy={vcy} r={STOP_RADIUS} fill={colors.primary} />
		</Svg>
	);
}

function renderExpressiveTrack(params: TrackRenderParams) {
	const {
		trackWidth,
		activeWidth,
		cy,
		inactiveStart,
		inactiveEnd,
		stopCx,
		colors,
		waveAnimatedProps,
	} = params;

	return (
		<Svg width={trackWidth} height={TRACK_HEIGHT} style={styles.trackSvg}>
			{inactiveStart < inactiveEnd && (
				<Line
					x1={inactiveStart}
					y1={cy}
					x2={inactiveEnd}
					y2={cy}
					stroke={colors.primaryContainer}
					strokeWidth={TRACK_THICKNESS}
					strokeLinecap={'round'}
				/>
			)}
			<Circle cx={stopCx} cy={cy} r={STOP_RADIUS} fill={colors.primary} />
			{activeWidth > ACTIVE_THICKNESS && (
				<AnimatedPath
					animatedProps={waveAnimatedProps}
					stroke={colors.primary}
					strokeWidth={ACTIVE_THICKNESS}
					strokeLinecap={'round'}
					fill={'none'}
				/>
			)}
		</Svg>
	);
}
