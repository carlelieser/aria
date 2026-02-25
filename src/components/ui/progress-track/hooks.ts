/**
 * ProgressTrack Hooks
 *
 * Custom hooks for wave animation, amplitude, and gesture handling.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import {
	useSharedValue,
	useAnimatedStyle,
	useAnimatedProps,
	useDerivedValue,
	withSpring,
	withRepeat,
	withTiming,
	cancelAnimation,
	runOnJS,
	Easing,
	type SharedValue,
} from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import { WAVE_AMPLITUDE, WAVELENGTH } from './types';
import { buildAnimatedWavePath } from './utils';

export function useWaveAnimation(shouldAnimate: boolean) {
	const phase = useSharedValue(0);

	useEffect(() => {
		if (shouldAnimate) {
			phase.value = withRepeat(
				withTiming(phase.value + WAVELENGTH, { duration: 2500, easing: Easing.linear }),
				-1,
				false
			);
		} else {
			cancelAnimation(phase);
		}
		return () => cancelAnimation(phase);
	}, [phase, shouldAnimate]);

	return phase;
}

export function useAmplitude(
	displayProgress: ReturnType<typeof useSharedValue<number>>,
	shouldAnimate: boolean
) {
	// Derive target amplitude on the UI thread: taper near 0% and 100%, full amplitude in between.
	return useDerivedValue(() => {
		if (!shouldAnimate) return withTiming(0, { duration: 300 });
		const p = displayProgress.value;
		let target: number;
		if (p < 0.1) target = (p / 0.1) * WAVE_AMPLITUDE;
		else if (p > 0.95) target = ((1 - p) / 0.05) * WAVE_AMPLITUDE;
		else target = WAVE_AMPLITUDE;
		return withTiming(target, { duration: 300 });
	});
}

export function useWaveAnimatedProps(
	activeWidth: SharedValue<number>,
	animatedAmplitude: SharedValue<number>,
	phase: SharedValue<number>
) {
	return useAnimatedProps(() => ({
		d: buildAnimatedWavePath(activeWidth.value, animatedAmplitude.value, phase.value),
	}));
}

export function useTrackLayout() {
	const [trackWidth, setTrackWidth] = useState(0);

	const handleLayout = useCallback((event: LayoutChangeEvent) => {
		setTrackWidth(event.nativeEvent.layout.width);
	}, []);

	return { trackWidth, handleLayout };
}

export function useSeekGesture(
	trackWidth: number,
	isDisabled: boolean,
	onSeek?: (progress: number) => void
) {
	const thumbScale = useSharedValue(1);
	const isDragging = useRef(false);
	const [localProgress, setLocalProgress] = useState<number | null>(null);

	const updateLocalProgress = useCallback(
		(x: number) => {
			const clampedX = Math.max(0, Math.min(x, trackWidth));
			setLocalProgress(trackWidth > 0 ? clampedX / trackWidth : 0);
		},
		[trackWidth]
	);

	const finishSeeking = useCallback(
		(x: number) => {
			const clampedX = Math.max(0, Math.min(x, trackWidth));
			const newProgress = trackWidth > 0 ? clampedX / trackWidth : 0;
			setLocalProgress(null);
			onSeek?.(newProgress);
		},
		[trackWidth, onSeek]
	);

	const panGesture = Gesture.Pan()
		.enabled(!isDisabled)
		.onStart((event) => {
			isDragging.current = true;
			thumbScale.value = withSpring(1.5, { damping: 15, stiffness: 400 });
			runOnJS(updateLocalProgress)(event.x);
		})
		.onUpdate((event) => {
			runOnJS(updateLocalProgress)(event.x);
		})
		.onEnd((event) => {
			isDragging.current = false;
			thumbScale.value = withSpring(1, { damping: 15, stiffness: 400 });
			runOnJS(finishSeeking)(event.x);
		});

	const tapGesture = Gesture.Tap()
		.enabled(!isDisabled)
		.onEnd((event) => {
			if (!isDragging.current) {
				runOnJS(finishSeeking)(event.x);
			}
		});

	const composedGesture = Gesture.Race(panGesture, tapGesture);

	const thumbAnimatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: thumbScale.value }],
	}));

	return { localProgress, isDragging, composedGesture, thumbAnimatedStyle };
}
