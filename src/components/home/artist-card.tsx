import { memo, useCallback } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Text } from 'react-native-paper';
import { UserIcon } from 'lucide-react-native';
import { Icon } from '@/src/components/ui/icon';
import { getBestArtwork } from '@/src/domain/value-objects/artwork';
import { useAppTheme } from '@/lib/theme';
import type { Artist } from '@/src/domain/entities/artist';

interface ArtistCardProps {
	readonly artist: Artist;
}

export const ArtistCard = memo(function ArtistCard({ artist }: ArtistCardProps) {
	const { colors } = useAppTheme();
	const artwork = getBestArtwork(artist.artwork, 300);

	const handlePress = useCallback(() => {
		router.push(`/artist/${artist.id}`);
	}, [artist.id]);

	return (
		<Pressable
			onPress={handlePress}
			style={({ pressed }) => [styles.container, pressed && styles.pressed]}
		>
			{artwork?.url ? (
				<Image
					source={{ uri: artwork.url }}
					style={styles.artwork}
					contentFit={'cover'}
					transition={200}
				/>
			) : (
				<View style={[styles.artwork, { backgroundColor: colors.surfaceContainerHighest }]}>
					<Icon as={UserIcon} size={40} color={colors.onSurfaceVariant} />
				</View>
			)}
			<Text
				variant={'bodyMedium'}
				numberOfLines={1}
				style={[styles.name, { color: colors.onSurface }]}
			>
				{artist.name}
			</Text>
		</Pressable>
	);
});

const styles = StyleSheet.create({
	container: {
		width: 128,
		alignItems: 'center',
	},
	pressed: {
		opacity: 0.7,
	},
	artwork: {
		width: 128,
		height: 128,
		borderRadius: 64,
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
	},
	name: {
		marginTop: 8,
		fontWeight: '500',
		textAlign: 'center',
	},
});
