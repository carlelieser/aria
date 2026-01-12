/**
 * AlbumListItem Component
 *
 * Displays an album in a list format with artwork, name, and artist info.
 * Uses M3 theming.
 */

import { memo, useCallback, useMemo } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Text } from 'react-native-paper';
import { Disc } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { useAppTheme, M3Shapes } from '@/lib/theme';
import { getBestArtwork } from '@/src/domain/value-objects/artwork';
import { formatArtistNames } from '@/src/domain/entities/artist';
import type { Album } from '@/src/domain/entities/album';

interface AlbumListItemProps {
	album: Album;
	onPress?: (album: Album) => void;
}

export const AlbumListItem = memo(function AlbumListItem({ album, onPress }: AlbumListItemProps) {
	const { colors } = useAppTheme();

	const handlePress = useCallback(() => {
		if (onPress) {
			onPress(album);
		} else {
			router.push(`/album/${album.id.value}`);
		}
	}, [onPress, album]);

	const artwork = getBestArtwork(album.artwork, 48);
	const artistNames = useMemo(() => formatArtistNames(album.artists), [album.artists]);
	const albumInfo = useMemo(() => {
		return [
			album.albumType
				? album.albumType.charAt(0).toUpperCase() + album.albumType.slice(1)
				: null,
			album.trackCount ? `${album.trackCount} tracks` : null,
		]
			.filter(Boolean)
			.join(' · ');
	}, [album.albumType, album.trackCount]);

	return (
		<TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
			<View
				style={[
					styles.artworkContainer,
					{ backgroundColor: colors.surfaceContainerHighest },
				]}
			>
				{artwork?.url ? (
					<Image
						source={{ uri: artwork.url }}
						style={styles.artwork}
						contentFit="cover"
						transition={200}
						cachePolicy="memory-disk"
						recyclingKey={album.id.value}
					/>
				) : (
					<Icon as={Disc} size={24} color={colors.onSurfaceVariant} />
				)}
			</View>

			<View style={styles.infoContainer}>
				<Text variant="bodyLarge" numberOfLines={1} style={{ color: colors.onSurface }}>
					{album.name}
				</Text>
				<Text
					variant="bodyMedium"
					numberOfLines={1}
					style={{ color: colors.onSurfaceVariant }}
				>
					{artistNames}
				</Text>
				{albumInfo && (
					<Text
						variant="bodySmall"
						numberOfLines={1}
						style={{ color: colors.onSurfaceVariant }}
					>
						{albumInfo}
					</Text>
				)}
			</View>
		</TouchableOpacity>
	);
});

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		width: '100%',
		gap: 16,
		paddingVertical: 12,
	},
	artworkContainer: {
		width: 48,
		height: 48,
		borderRadius: M3Shapes.small,
		justifyContent: 'center',
		alignItems: 'center',
		overflow: 'hidden',
	},
	artwork: {
		width: 48,
		height: 48,
		borderRadius: M3Shapes.small,
	},
	infoContainer: {
		flex: 1,
		flexDirection: 'column',
	},
});
