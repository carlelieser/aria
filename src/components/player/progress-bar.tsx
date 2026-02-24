/**
 * ProgressBar Component
 *
 * Player-specific wrapper around ProgressTrack.
 * Uses targeted Zustand selectors so only this component re-renders on
 * progress ticks — not the entire player screen subtree.
 */

import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { ProgressTrack } from '@/src/components/ui/progress-track';
import { usePlayerActions } from '@/src/hooks/use-player';
import {
	usePlaybackProgress,
	useIsPlaying,
	useIsLoading,
} from '@/src/application/state/player-store';
import { Duration } from '@/src/domain/value-objects/duration';
import { useCallback } from 'react';
import { usePlayerTheme } from '@/src/components/player/player-theme-context';
import { useProgressBarStyle } from '@/src/application/state/settings-store';

interface ProgressBarProps {
	readonly seekable?: boolean;
}

export function ProgressBar({ seekable = true }: ProgressBarProps) {
	const { position, duration } = usePlaybackProgress();
	const isPlaying = useIsPlaying();
	const isLoading = useIsLoading();
	const { seekTo } = usePlayerActions();
	const { colors } = usePlayerTheme();
	const barStyle = useProgressBarStyle();

	const totalMillis = duration.totalMilliseconds;
	const progress = totalMillis > 0 ? position.totalMilliseconds / totalMillis : 0;

	const handleSeek = useCallback(
		async (newProgress: number) => {
			const newPositionMs = Math.round(newProgress * totalMillis);
			await seekTo(Duration.fromMilliseconds(newPositionMs));
		},
		[totalMillis, seekTo]
	);

	const currentTime = position.format();
	const totalTime = duration.format();

	const isDisabled = isLoading || duration.isZero();

	const animatedStyle = useAnimatedStyle(
		() => ({
			opacity: withTiming(isLoading ? 0.4 : 1, { duration: 300 }),
		}),
		[isLoading]
	);

	return (
		<Animated.View style={animatedStyle}>
			<ProgressTrack
				variant={barStyle}
				progress={progress}
				colors={colors}
				animated={isPlaying}
				interactive={!isDisabled}
				onSeek={handleSeek}
				showTimeLabels
				currentTime={currentTime}
				totalTime={totalTime}
				disabled={isDisabled}
			/>
		</Animated.View>
	);
}
