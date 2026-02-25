import { Pressable, View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { DiscIcon } from 'lucide-react-native';
import { Text } from 'react-native-paper';
import { Icon } from '@/src/components/ui/icon';
import { getBestArtwork } from '@/src/domain/value-objects/artwork';
import { useAppTheme, M3Shapes } from '@/lib/theme';
import type { Album } from '@/src/domain/entities/album';

interface AlbumCardProps {
	readonly album: Album;
	readonly onPress: () => void;
}

export function AlbumCard({ album, onPress }: AlbumCardProps) {
	const { colors } = useAppTheme();
	const artwork = getBestArtwork(album.artwork, 300);

	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [styles.albumCard, pressed && styles.pressed]}
		>
			{artwork?.url ? (
				<Image
					source={{ uri: artwork.url }}
					style={styles.albumArtwork}
					contentFit={'contain'}
					transition={200}
				/>
			) : (
				<View
					style={[
						styles.albumArtwork,
						{ backgroundColor: colors.surfaceContainerHighest },
					]}
				>
					<Icon as={DiscIcon} size={32} color={colors.onSurfaceVariant} />
				</View>
			)}
			<Text
				variant={'bodyMedium'}
				numberOfLines={2}
				style={[styles.albumTitle, { color: colors.onSurface }]}
			>
				{album.name}
			</Text>
			{album.releaseDate && (
				<Text variant={'bodySmall'} style={{ color: colors.onSurfaceVariant }}>
					{new Date(album.releaseDate).getFullYear()}
				</Text>
			)}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	albumCard: {
		width: 140,
	},
	pressed: {
		opacity: 0.7,
	},
	albumArtwork: {
		width: 140,
		height: 140,
		borderRadius: M3Shapes.medium,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 8,
	},
	albumTitle: {
		fontWeight: '500',
	},
});
