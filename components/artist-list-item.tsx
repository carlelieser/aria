/**
 * ArtistListItem Component
 *
 * Displays an artist in a list format with artwork and name.
 * Uses M3 theming.
 */

import { memo, useCallback } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Text } from 'react-native-paper';
import { User } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { useAppTheme } from '@/lib/theme';
import { getBestArtwork } from '@/src/domain/value-objects/artwork';
import type { Artist } from '@/src/domain/entities/artist';

interface ArtistListItemProps {
	artist: Artist;
	onPress?: (artist: Artist) => void;
}

function formatListeners(count: number | undefined): string | null {
	if (!count) return null;
	if (count >= 1_000_000) {
		return `${(count / 1_000_000).toFixed(1)}M listeners`;
	}
	if (count >= 1_000) {
		return `${(count / 1_000).toFixed(0)}K listeners`;
	}
	return `${count} listeners`;
}

export const ArtistListItem = memo(function ArtistListItem({
	artist,
	onPress,
}: ArtistListItemProps) {
	const { colors } = useAppTheme();

	const handlePress = useCallback(() => {
		onPress?.(artist);
	}, [onPress, artist]);

	const artwork = getBestArtwork(artist.artwork, 48);
	const listeners = formatListeners(artist.monthlyListeners);
	const genres = artist.genres?.slice(0, 2).join(', ');

	return (
		<TouchableOpacity
			style={styles.container}
			onPress={handlePress}
			activeOpacity={0.7}
			disabled={!onPress}
		>
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
						recyclingKey={artist.id}
					/>
				) : (
					<Icon as={User} size={24} color={colors.onSurfaceVariant} />
				)}
			</View>

			<View style={styles.infoContainer}>
				<Text variant="bodyLarge" numberOfLines={1} style={{ color: colors.onSurface }}>
					{artist.name}
				</Text>
				{(listeners || genres) && (
					<Text variant="bodyMedium" numberOfLines={1} style={{ color: colors.onSurfaceVariant }}>
						{[genres, listeners].filter(Boolean).join(' · ')}
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
		borderRadius: 24,
		justifyContent: 'center',
		alignItems: 'center',
		overflow: 'hidden',
	},
	artwork: {
		width: 48,
		height: 48,
		borderRadius: 24,
	},
	infoContainer: {
		flex: 1,
		flexDirection: 'column',
	},
});
