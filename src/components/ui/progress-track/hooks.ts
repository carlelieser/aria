/**
 * ProgressTrack Hooks
 *
 * Custom hooks for wave animation, buffering pulse, amplitude, and gesture handling.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import {
	useSharedValue,
	useAnimatedStyle,
	useAnimatedProps,
	withSpring,
	withRepeat,
	withSequence,
	withTiming,
	cancelAnimation,
	runOnJS,
	Easing,
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

export function useBufferingPulse(isBuffering: boolean, isDragging: React.RefObject<boolean>) {
	const thumbOpacity = useSharedValue(1);

	useEffect(() => {
		if (isBuffering && !isDragging.current) {
			thumbOpacity.value = withRepeat(
				withSequence(withTiming(0.4, { duration: 500 }), withTiming(1, { duration: 500 })),
				-1,
				false
			);
		} else {
			cancelAnimation(thumbOpacity);
			thumbOpacity.value = withTiming(1, { duration: 200 });
		}
	}, [isBuffering, thumbOpacity]);

	return thumbOpacity;
}

export function useAmplitude(displayProgress: number, shouldAnimate: boolean) {
	const targetAmplitude = useMemo(() => {
		if (!shouldAnimate) return 0;
		if (displayProgress < 0.1) return displayProgress / 0.1;
		if (displayProgress > 0.95) return (1 - displayProgress) / 0.05;
		return 1;
	}, [displayProgress, shouldAnimate]);

	const animatedAmplitude = useSharedValue(0);

	useEffect(() => {
		animatedAmplitude.value = withTiming(targetAmplitude * WAVE_AMPLITUDE, { duration: 300 });
	}, [targetAmplitude, animatedAmplitude]);

	return animatedAmplitude;
}

export function useWaveAnimatedProps(
	activeWidth: number,
	animatedAmplitude: ReturnType<typeof useSharedValue<number>>,
	phase: ReturnType<typeof useSharedValue<number>>
) {
	return useAnimatedProps(() => ({
		d: buildAnimatedWavePath(activeWidth, animatedAmplitude.value, phase.value),
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
