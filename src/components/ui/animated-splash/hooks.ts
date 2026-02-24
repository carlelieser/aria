/**
 * AnimatedSplash Hooks
 *
 * Custom hooks for polygon morphing, rotation, and bootstrap progress.
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import {
	useSharedValue,
	useAnimatedReaction,
	withTiming,
	withSpring,
	withRepeat,
	Easing,
	runOnJS,
} from 'react-native-reanimated';
import {
	useBootstrapProgress,
	useBootstrapMessage,
} from '@application/state/bootstrap-progress-store';
import { MORPH_INTERVAL, ROTATION_DURATION, PROGRESS_TIMING_MS, getRandomSegments } from './types';

export function usePolygonMorph() {
	const [segments, setSegments] = useState(3);
	const polygonScale = useSharedValue(1);
	const morphCycle = useSharedValue(0);
	const isFirstRender = useRef(true);

	const updateSegments = useCallback(() => {
		setSegments((prev) => getRandomSegments(prev));
	}, []);

	useEffect(() => {
		if (isFirstRender.current) {
			isFirstRender.current = false;
			return;
		}
		polygonScale.value = withSpring(1.15, { damping: 8, stiffness: 200 }, () => {
			polygonScale.value = withSpring(1, { damping: 12, stiffness: 150 });
		});
	}, [segments, polygonScale]);

	useEffect(() => {
		morphCycle.value = withRepeat(
			withTiming(1, { duration: MORPH_INTERVAL, easing: Easing.linear }),
			-1,
			true
		);
	}, [morphCycle]);

	useAnimatedReaction(
		() => Math.round(morphCycle.value),
		(current, previous) => {
			if (previous !== null && current !== previous) {
				runOnJS(updateSegments)();
			}
		},
		[updateSegments]
	);

	return { segments, polygonScale };
}

export function usePolygonRotation() {
	const polygonRotation = useSharedValue(0);

	useEffect(() => {
		polygonRotation.value = withRepeat(
			withTiming(360, { duration: ROTATION_DURATION, easing: Easing.linear }),
			-1,
			false
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return polygonRotation;
}

export function useBootstrapProgressAnimation() {
	const progress = useBootstrapProgress();
	const progressMessage = useBootstrapMessage();
	const progressWidth = useSharedValue(0);

	useEffect(() => {
		progressWidth.value = withTiming(progress, {
			duration: PROGRESS_TIMING_MS,
			easing: Easing.out(Easing.ease),
		});
	}, [progress, progressWidth]);

	return { progress, progressMessage, progressWidth };
}
