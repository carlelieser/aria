/**
 * PlayerControls Component
 *
 * Main playback controls with play/pause, skip, shuffle, and repeat.
 * Uses M3 theming.
 */

import { useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { IconButton } from 'react-native-paper';
import { SkipBack, SkipForward, Repeat, Repeat1, Shuffle } from 'lucide-react-native';
import { usePlayer } from '@/src/hooks/use-player';
import { usePlayerTheme } from '@/src/components/player/player-theme-context';
import { WavyPlayButton } from '@/src/components/player/wavy-play-button';

interface PlayerControlsProps {
	readonly size?: 'sm' | 'md' | 'lg';
}

const ICON_SIZES = {
	sm: { secondary: 24 },
	md: { secondary: 28 },
	lg: { secondary: 32 },
} as const;

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
	const { colors } = usePlayerTheme();

	const { secondary: secondaryIconSize } = ICON_SIZES[size];

	const surfaceColor = colors.onSurface;

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

			{/* Play/Pause */}
			<View style={styles.fabWrapper}>
				<WavyPlayButton
					isLoading={isLoading}
					isPlaying={isPlaying}
					onPress={togglePlayPause}
					color={colors.primary}
					iconColor={colors.onPrimary}
					size={size}
				/>
			</View>

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
	fabWrapper: {
		marginHorizontal: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},
});
