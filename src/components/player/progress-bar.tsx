/**
 * ProgressBar Component
 *
 * Player-specific wrapper around ProgressTrack.
 * Reads playback state and theme, then delegates all rendering to ProgressTrack.
 */

import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/src/components/ui/skeleton';
import { ProgressTrack } from '@/src/components/ui/progress-track';
import { usePlayer } from '@/src/hooks/use-player';
import { Duration } from '@/src/domain/value-objects/duration';
import { useCallback } from 'react';
import { usePlayerTheme } from '@/src/components/player/player-theme-context';
import { useProgressBarStyle } from '@/src/application/state/settings-store';

interface ProgressBarProps {
	readonly seekable?: boolean;
}

export function ProgressBar({ seekable = true }: ProgressBarProps) {
	const { position, duration, seekTo, isLoading, isBuffering, isPlaying } = usePlayer();
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

	const isDisabled = !seekable || isLoading || duration.isZero();

	if (isLoading) {
		return (
			<View style={styles.loadingContainer}>
				<Skeleton width={'100%'} height={24} rounded={'sm'} />
				<View style={styles.timeContainer}>
					<Skeleton width={32} height={14} rounded={'sm'} />
					<Skeleton width={32} height={14} rounded={'sm'} />
				</View>
			</View>
		);
	}

	return (
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
			isBuffering={isBuffering}
			disabled={isDisabled}
		/>
	);
}

const styles = StyleSheet.create({
	loadingContainer: {
		width: '100%',
		gap: 12,
	},
	timeContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
});
