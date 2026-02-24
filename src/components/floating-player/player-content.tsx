/**
 * PlayerContent Component
 *
 * The inner content of the floating player: artwork, track info, and controls.
 */

import { useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { IconButton, Text } from 'react-native-paper';
import { Play, Pause, SkipForward } from 'lucide-react-native';
import { AudioWaveform } from '@/src/components/ui/audio-waveform';
import { useAppTheme, M3Shapes } from '@/lib/theme';
import type { PlayerContentProps } from './types';

export function PlayerContent({
	artworkUrl,
	trackId,
	title,
	artistNames,
	isPlaying,
	showLoadingIndicator,
	isLoading,
	onPlayPause,
	onSkipNext,
}: PlayerContentProps) {
	const { colors } = useAppTheme();

	const playPauseIcon = useCallback(
		({ size, color }: { size: number; color: string }) =>
			isPlaying ? (
				<Pause size={size} color={color} fill={color} strokeWidth={0} />
			) : (
				<Play size={size} color={color} fill={color} strokeWidth={0} />
			),
		[isPlaying]
	);

	const skipForwardIcon = useCallback(
		({ size, color }: { size: number; color: string }) => (
			<SkipForward size={size} color={color} fill={color} />
		),
		[]
	);

	return (
		<View style={styles.content}>
			<View style={styles.artworkContainer}>
				<Image
					source={{ uri: artworkUrl }}
					style={styles.artwork}
					contentFit={'cover'}
					transition={200}
					cachePolicy={'memory-disk'}
					recyclingKey={trackId}
				/>
				{isPlaying && <AudioWaveform />}
				{showLoadingIndicator && (
					<View style={styles.loadingOverlay}>
						<ActivityIndicator size={'small'} color={'white'} />
					</View>
				)}
			</View>

			<View style={styles.trackInfo}>
				<Text
					variant={'titleSmall'}
					numberOfLines={1}
					style={{ color: colors.onSurface }}
				>
					{title}
				</Text>
				<Text
					variant={'bodySmall'}
					numberOfLines={1}
					style={{ color: colors.onSurfaceVariant }}
				>
					{artistNames}
				</Text>
			</View>

			<View style={styles.controls}>
				<IconButton
					icon={playPauseIcon}
					size={24}
					onPress={onPlayPause}
					disabled={isLoading}
				/>
				<IconButton
					icon={skipForwardIcon}
					size={24}
					onPress={onSkipNext}
					accessibilityLabel={'Skip to next track'}
				/>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	content: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingTop: 4,
	},
	artworkContainer: {
		position: 'relative',
		overflow: 'hidden',
		borderRadius: M3Shapes.small,
	},
	artwork: {
		width: 48,
		height: 48,
		borderRadius: M3Shapes.small,
	},
	loadingOverlay: {
		...StyleSheet.absoluteFillObject,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'rgba(0,0,0,0.3)',
		borderRadius: M3Shapes.small,
	},
	trackInfo: {
		flex: 1,
		marginHorizontal: 12,
		justifyContent: 'center',
	},
	controls: {
		flexDirection: 'row',
		alignItems: 'center',
	},
});
