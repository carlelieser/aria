/**
 * PlayerControls Component
 *
 * Main playback controls with play/pause, skip, shuffle, and repeat.
 * Uses M3 theming.
 */

import { useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { IconButton, FAB } from 'react-native-paper';
import { Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle } from 'lucide-react-native';
import { usePlayer } from '@/hooks/use-player';
import { useAppTheme } from '@/lib/theme';

interface PlayerControlsProps {
	size?: 'sm' | 'md' | 'lg';
}

export function PlayerControls({ size = 'md' }: PlayerControlsProps) {
	const {
		isPlaying,
		isLoading,
		repeatMode,
		isShuffled,
		togglePlayPause,
		skipToPrevious,
		skipToNext,
		cycleRepeatMode,
		toggleShuffle,
	} = usePlayer();
	const { colors } = useAppTheme();

	const iconSizes = {
		sm: { main: 32, secondary: 24, fab: 'small' as const },
		md: { main: 48, secondary: 28, fab: 'medium' as const },
		lg: { main: 64, secondary: 32, fab: 'large' as const },
	};

	const { secondary: secondaryIconSize, fab: fabSize } = iconSizes[size];

	const surfaceColor = colors.onSurface;
	const primaryColor = colors.onPrimary;

	const shuffleIcon = useCallback(
		() => <Shuffle size={secondaryIconSize} color={surfaceColor} />,
		[secondaryIconSize, surfaceColor]
	);

	const skipBackIcon = useCallback(
		() => <SkipBack size={secondaryIconSize} color={surfaceColor} fill={surfaceColor} />,
		[secondaryIconSize, surfaceColor]
	);

	const skipForwardIcon = useCallback(
		() => <SkipForward size={secondaryIconSize} color={surfaceColor} fill={surfaceColor} />,
		[secondaryIconSize, surfaceColor]
	);

	const playPauseIcon = useCallback(
		() =>
			isPlaying ? (
				<Pause size={32} color={primaryColor} fill={primaryColor} />
			) : (
				<Play size={32} color={primaryColor} fill={primaryColor} />
			),
		[isPlaying, primaryColor]
	);

	const repeatIcon = useCallback(
		() =>
			repeatMode === 'one' ? (
				<Repeat1 size={secondaryIconSize} color={surfaceColor} />
			) : (
				<Repeat size={secondaryIconSize} color={surfaceColor} />
			),
		[repeatMode, secondaryIconSize, surfaceColor]
	);

	const shuffleButtonStyle = useMemo(
		() => [styles.secondaryButton, { opacity: isShuffled ? 1 : 0.5 }],
		[isShuffled]
	);

	const repeatButtonStyle = useMemo(
		() => [styles.secondaryButton, { opacity: repeatMode !== 'off' ? 1 : 0.5 }],
		[repeatMode]
	);

	const fabStyle = useMemo(
		() => [styles.fab, { backgroundColor: colors.primary }],
		[colors.primary]
	);

	return (
		<View style={styles.container}>
			{/* Shuffle */}
			<IconButton
				icon={shuffleIcon}
				size={secondaryIconSize}
				onPress={toggleShuffle}
				style={shuffleButtonStyle}
			/>

			{/* Previous */}
			<IconButton icon={skipBackIcon} size={secondaryIconSize} onPress={skipToPrevious} />

			{/* Play/Pause FAB */}
			<FAB
				icon={playPauseIcon}
				size={fabSize}
				onPress={togglePlayPause}
				disabled={isLoading}
				style={fabStyle}
			/>

			{/* Next */}
			<IconButton icon={skipForwardIcon} size={secondaryIconSize} onPress={skipToNext} />

			{/* Repeat */}
			<IconButton
				icon={repeatIcon}
				size={secondaryIconSize}
				onPress={cycleRepeatMode}
				style={repeatButtonStyle}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 8,
	},
	secondaryButton: {
		margin: 0,
	},
	fab: {
		marginHorizontal: 16,
	},
});
