import { memo } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { ListMusicIcon } from 'lucide-react-native';
import { Text } from 'react-native-paper';
import { Icon } from '@/src/components/ui/icon';
import { getBestArtwork } from '@/src/domain/value-objects/artwork';
import { useAppTheme, M3Shapes } from '@/lib/theme';
import type { FeedPlaylist } from '@/src/domain/entities/feed-section';

interface PlaylistCardProps {
	readonly playlist: FeedPlaylist;
	readonly onPress: () => void;
}

export const PlaylistCard = memo(function PlaylistCard({ playlist, onPress }: PlaylistCardProps) {
	const { colors } = useAppTheme();
	const artwork = getBestArtwork(playlist.artwork, 300);

	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [styles.container, pressed && styles.pressed]}
		>
			{artwork?.url ? (
				<Image
					source={{ uri: artwork.url }}
					style={styles.artwork}
					contentFit={'contain'}
					transition={200}
				/>
			) : (
				<View style={[styles.artwork, { backgroundColor: colors.surfaceContainerHighest }]}>
					<Icon as={ListMusicIcon} size={32} color={colors.onSurfaceVariant} />
				</View>
			)}
			<Text
				variant={'bodyMedium'}
				numberOfLines={2}
				style={[styles.name, { color: colors.onSurface }]}
			>
				{playlist.name}
			</Text>
		</Pressable>
	);
});

const styles = StyleSheet.create({
	container: {
		width: 140,
	},
	pressed: {
		opacity: 0.7,
	},
	artwork: {
		width: 140,
		height: 140,
		borderRadius: M3Shapes.medium,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 8,
	},
	name: {
		fontWeight: '500',
	},
});
