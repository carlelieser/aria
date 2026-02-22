/**
 * IndeterminateProgressRing Component
 *
 * Animated wavy circular ring using SVG + Reanimated.
 * Modulates circle radius with a sine wave, creating a rotating
 * wavy ring that matches the M3 Expressive progress bar style.
 */

import { useEffect, useRef, useCallback, memo } from 'react';
import Animated, {
	useSharedValue,
	useAnimatedProps,
	withRepeat,
	withTiming,
	runOnJS,
	cancelAnimation,
	Easing,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Angular step in radians (~2 degrees) for path resolution */
const ANGULAR_STEP = Math.PI / 90;
const TWO_PI = 2 * Math.PI;

/** Sine-wave amplitude as a fraction of the base radius */
const WAVE_AMPLITUDE_RATIO = 0.1;

/** Rotation duration in ms (one full revolution) */
const PHASE_DURATION = 3000;

/** How often peaks change, in ms */
const PEAK_CHANGE_INTERVAL = 2000;

/** Duration to fade amplitude in/out when changing peaks */
const AMPLITUDE_FADE_DURATION = 250;

/** Peak count range for random morphing */
const PEAK_MIN = 3;
const PEAK_MAX = 6;

/**
 * Builds a closed SVG path for a circle with sine-wave radius modulation.
 * r(theta) = baseRadius + amplitude * sin(peaks * theta - phase)
 * Peaks must be an integer for the path to form a closed loop.
 */
function buildWavyCirclePath(
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

interface IndeterminateProgressRingProps {
	readonly size: number;
	readonly strokeWidth: number;
	readonly color: string;
	readonly fillColor?: string;
	readonly active: boolean;
}

export const IndeterminateProgressRing = memo(function IndeterminateProgressRing({
	size,
	strokeWidth,
	color,
	fillColor,
	active,
}: IndeterminateProgressRingProps) {
	const cx = size / 2;
	const cy = size / 2;
	const rawRadius = (size - strokeWidth) / 2;
	const amplitude = rawRadius * WAVE_AMPLITUDE_RATIO;
	const baseRadius = rawRadius - amplitude;

	const phase = useSharedValue(0);
	const peaks = useSharedValue(4);
	const ampScale = useSharedValue(1);
	const activeRef = useRef(false);
	const changePeaksRef = useRef<() => void>(() => {});

	const schedulePeakChange = useCallback(() => {
		if (!activeRef.current) return;
		setTimeout(() => changePeaksRef.current(), PEAK_CHANGE_INTERVAL);
	}, []);

	const changePeaks = useCallback(() => {
		if (!activeRef.current) return;

		const current = peaks.value;
		let newPeaks = PEAK_MIN + Math.floor(Math.random() * (PEAK_MAX - PEAK_MIN + 1));
		while (newPeaks === current) {
			newPeaks = PEAK_MIN + Math.floor(Math.random() * (PEAK_MAX - PEAK_MIN + 1));
		}
		ampScale.value = withTiming(0, { duration: AMPLITUDE_FADE_DURATION }, (finished) => {
			if (finished) {
				peaks.value = newPeaks;
				ampScale.value = withTiming(1, { duration: AMPLITUDE_FADE_DURATION }, (done) => {
					if (done) {
						runOnJS(schedulePeakChange)();
					}
				});
			}
		});
	}, [peaks, ampScale, schedulePeakChange]);
	changePeaksRef.current = changePeaks;

	useEffect(() => {
		if (active) {
			activeRef.current = true;

			// Continuous rotation
			phase.value = withRepeat(
				withTiming(phase.value + TWO_PI, {
					duration: PHASE_DURATION,
					easing: Easing.linear,
				}),
				-1,
				false
			);

			// Periodic peak changes
			schedulePeakChange();
		} else {
			activeRef.current = false;
			cancelAnimation(phase);
			cancelAnimation(ampScale);
		}
		return () => {
			activeRef.current = false;
			cancelAnimation(phase);
			cancelAnimation(ampScale);
		};
	}, [active, phase, ampScale, schedulePeakChange]);

	const animatedProps = useAnimatedProps(() => ({
		d: buildWavyCirclePath(
			cx,
			cy,
			baseRadius,
			amplitude * ampScale.value,
			peaks.value,
			phase.value
		),
	}));

	return (
		<Svg width={size} height={size}>
			<AnimatedPath
				animatedProps={animatedProps}
				stroke={color}
				strokeWidth={strokeWidth}
				strokeLinejoin={'round'}
				fill={fillColor ?? 'none'}
			/>
		</Svg>
	);
});
