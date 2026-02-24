/**
 * useWavyAnimation Hook
 *
 * Manages the wavy circle animation state: phase rotation, peak morphing,
 * and size transitions between idle and loading states.
 */

import { useEffect, useRef, useCallback } from 'react';
import {
	useSharedValue,
	withRepeat,
	withTiming,
	withSpring,
	runOnJS,
	cancelAnimation,
	Easing,
} from 'react-native-reanimated';
import {
	TWO_PI,
	WAVE_AMPLITUDE_RATIO,
	PHASE_DURATION,
	PEAK_CHANGE_INTERVAL,
	AMPLITUDE_FADE_DURATION,
	STROKE_TRANSITION_DURATION,
	PEAK_MIN,
	PEAK_MAX,
	IDLE_PEAKS,
	SPRING_CONFIG,
	RING_STROKE_WIDTH,
	deriveMetrics,
} from './constants';

interface UseWavyAnimationParams {
	readonly isLoading: boolean;
	readonly isPlaying: boolean;
	readonly size: 'sm' | 'md' | 'lg';
}

export function useWavyAnimation({ isLoading, isPlaying, size }: UseWavyAnimationParams) {
	const { fabSize, canvasSize, center, idleRadius, loadingRadius, loadingAmplitude } =
		deriveMetrics(size);

	const idleAmplitude = idleRadius * WAVE_AMPLITUDE_RATIO;
	const idleBaseRadius = idleRadius - idleAmplitude;

	const targetRadius = useSharedValue(idleBaseRadius);
	const targetAmplitude = useSharedValue(idleAmplitude);
	const containerSize = useSharedValue<number>(fabSize);
	const phase = useSharedValue(0);
	const peaks = useSharedValue(IDLE_PEAKS);
	const ampScale = useSharedValue(1);
	const strokeAnim = useSharedValue(0);

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
		if (isLoading || !isPlaying) {
			activeRef.current = true;

			targetRadius.value = withSpring(loadingRadius, SPRING_CONFIG);
			targetAmplitude.value = withSpring(loadingAmplitude, SPRING_CONFIG);
			containerSize.value = withSpring(canvasSize, SPRING_CONFIG);
			strokeAnim.value = withTiming(RING_STROKE_WIDTH, {
				duration: STROKE_TRANSITION_DURATION,
			});

			phase.value = withRepeat(
				withTiming(phase.value + TWO_PI, {
					duration: PHASE_DURATION,
					easing: Easing.linear,
				}),
				-1,
				false
			);

			schedulePeakChange();
		} else {
			activeRef.current = false;

			targetRadius.value = withSpring(idleBaseRadius, SPRING_CONFIG);
			targetAmplitude.value = withSpring(idleAmplitude, SPRING_CONFIG);
			containerSize.value = withSpring(fabSize, SPRING_CONFIG);
			strokeAnim.value = withTiming(0, { duration: STROKE_TRANSITION_DURATION });

			cancelAnimation(phase);
			cancelAnimation(ampScale);

			peaks.value = IDLE_PEAKS;
			ampScale.value = 1;
		}

		return () => {
			activeRef.current = false;
			cancelAnimation(phase);
			cancelAnimation(ampScale);
		};
	}, [
		ampScale,
		canvasSize,
		containerSize,
		fabSize,
		idleAmplitude,
		idleBaseRadius,
		isLoading,
		isPlaying,
		loadingAmplitude,
		loadingRadius,
		peaks,
		phase,
		schedulePeakChange,
		strokeAnim,
		targetAmplitude,
		targetRadius,
	]);

	return {
		canvasSize,
		center,
		targetRadius,
		targetAmplitude,
		ampScale,
		peaks,
		phase,
		strokeAnim,
		containerSize,
	};
}
