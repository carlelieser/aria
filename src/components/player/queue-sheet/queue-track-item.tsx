/**
 * QueueTrackItem Component
 *
 * A single track row in the queue list with drag handle, artwork,
 * track info, and remove button.
 */

import { memo, useCallback } from 'react';
import { TouchableOpacity as RNTouchableOpacity, View, StyleSheet } from 'react-native';
import { TouchableOpacity as GHTouchableOpacity } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { Text } from 'react-native-paper';
import { GripVertical, X, Music } from 'lucide-react-native';
import { Icon } from '@/src/components/ui/icon';
import { AudioWaveform } from '@/src/components/ui/audio-waveform';
import { getBestArtwork } from '@/src/domain/value-objects/artwork';
import { getArtistNames } from '@/src/domain/entities/track';
import { useAppTheme, M3Shapes } from '@/lib/theme';
import type { QueueTrackItemProps } from './types';

export const QueueTrackItem = memo(function QueueTrackItem({
	track,
	index,
	isActive,
	isPlaying,
	drag,
	isDragging,
	onRemove,
	onPlay,
}: QueueTrackItemProps) {
	const { colors } = useAppTheme();

	const handleRemove = useCallback(() => onRemove(index), [onRemove, index]);
	const handlePlay = useCallback(() => onPlay(index), [onPlay, index]);

	const artwork = getBestArtwork(track.artwork, 300);
	const artworkUrl = artwork?.url;
	const artistNames = getArtistNames(track);

	const containerStyle = [
		styles.container,
		isActive && { backgroundColor: `${colors.primaryContainer}40` },
		isDragging && { backgroundColor: colors.surfaceContainerHighest, elevation: 8 },
	];

	return (
		<RNTouchableOpacity style={containerStyle} onPress={handlePlay} activeOpacity={0.7}>
			<GHTouchableOpacity onLongPress={drag} delayLongPress={0} style={styles.dragHandle}>
				<Icon as={GripVertical} size={20} color={colors.onSurfaceVariant} />
			</GHTouchableOpacity>

			<View style={styles.artworkContainer}>
				{artworkUrl ? (
					<Image
						source={{ uri: artworkUrl }}
						style={styles.artwork}
						contentFit={'contain'}
						transition={200}
						cachePolicy={'memory-disk'}
						recyclingKey={track.id.value}
					/>
				) : (
					<View
						style={[
							styles.artwork,
							styles.artworkPlaceholder,
							{ backgroundColor: colors.surfaceContainerHighest },
						]}
					>
						<Icon as={Music} size={20} color={colors.onSurfaceVariant} />
					</View>
				)}
				{isPlaying && <AudioWaveform />}
			</View>

			<View style={styles.info}>
				<Text
					variant={'bodyLarge'}
					numberOfLines={1}
					style={{ color: isActive ? colors.primary : colors.onSurface }}
				>
					{track.title}
				</Text>
				<Text
					variant={'bodySmall'}
					numberOfLines={1}
					style={{ color: colors.onSurfaceVariant }}
				>
					{artistNames}
				</Text>
			</View>

			<RNTouchableOpacity onPress={handleRemove} hitSlop={8} style={styles.removeButton}>
				<Icon as={X} size={20} color={colors.onSurfaceVariant} style={{ opacity: 0.5 }} />
			</RNTouchableOpacity>
		</RNTouchableOpacity>
	);
});

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
		paddingHorizontal: 4,
		gap: 12,
		borderRadius: M3Shapes.small,
	},
	dragHandle: {
		padding: 4,
	},
	artworkContainer: {
		width: 40,
		height: 40,
		borderRadius: M3Shapes.small,
		overflow: 'hidden',
	},
	artwork: {
		width: 40,
		height: 40,
		borderRadius: M3Shapes.small,
	},
	artworkPlaceholder: {
		justifyContent: 'center',
		alignItems: 'center',
	},
	info: {
		flex: 1,
	},
	removeButton: {
		padding: 4,
	},
});
