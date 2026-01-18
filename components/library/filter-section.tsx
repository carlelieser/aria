/**
 * FilterSection Component
 *
 * Filter options for library (artists, albums, favorites).
 * Uses M3 theming.
 */

import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Switch } from 'react-native-paper';
import { FilterChip } from './filter-chip';
import { useAppTheme } from '@/lib/theme';
import type { ArtistReference } from '@/src/domain/entities/artist';
import type { AlbumReference } from '@/src/domain/entities/album';
import type { LibraryFilters } from '@/src/domain/utils/track-filtering';

interface FilterSectionProps {
	artists: ArtistReference[];
	albums: AlbumReference[];
	activeFilters: LibraryFilters;
	onToggleArtist: (artistId: string) => void;
	onToggleAlbum: (albumId: string) => void;
	onToggleFavorites: () => void;
	onToggleDownloaded: () => void;
}

export function FilterSection({
	artists,
	albums,
	activeFilters,
	onToggleArtist,
	onToggleAlbum,
	onToggleFavorites,
	onToggleDownloaded,
}: FilterSectionProps) {
	const { colors } = useAppTheme();

	return (
		<View style={styles.container}>
			<View style={styles.favoritesRow}>
				<Text variant="bodyMedium" style={{ color: colors.onSurface }}>
					Favorites only
				</Text>
				<Switch value={activeFilters.favoritesOnly} onValueChange={onToggleFavorites} />
			</View>

			<View style={styles.favoritesRow}>
				<Text variant="bodyMedium" style={{ color: colors.onSurface }}>
					Downloaded only
				</Text>
				<Switch value={activeFilters.downloadedOnly} onValueChange={onToggleDownloaded} />
			</View>

			{artists.length > 0 && (
				<View style={styles.section}>
					<Text
						variant="labelMedium"
						style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}
					>
						ARTISTS
					</Text>
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						style={styles.scrollView}
						contentContainerStyle={styles.chipContainer}
					>
						{artists.map((artist) => (
							<FilterChip
								key={artist.id}
								label={artist.name}
								selected={activeFilters.artistIds.includes(artist.id)}
								onPress={() => onToggleArtist(artist.id)}
							/>
						))}
					</ScrollView>
				</View>
			)}

			{albums.length > 0 && (
				<View style={styles.section}>
					<Text
						variant="labelMedium"
						style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}
					>
						ALBUMS
					</Text>
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						style={styles.scrollView}
						contentContainerStyle={styles.chipContainer}
					>
						{albums.map((album) => (
							<FilterChip
								key={album.id}
								label={album.name}
								selected={activeFilters.albumIds.includes(album.id)}
								onPress={() => onToggleAlbum(album.id)}
							/>
						))}
					</ScrollView>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		gap: 16,
	},
	scrollView: {
		borderRadius: 12,
		overflow: 'hidden',
	},
	favoritesRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 4,
	},
	section: {
		gap: 8,
	},
	sectionLabel: {
		letterSpacing: 0.5,
	},
	chipContainer: {
		gap: 8,
		paddingRight: 16,
	},
});
