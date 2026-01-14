/**
 * ExploreFilterSection Component
 *
 * Filter options for explore/search (content type, favorites, artists, albums).
 * Uses M3 theming.
 */

import { View, StyleSheet } from 'react-native';
import { PlayerAwareScrollView } from '@/components/ui/player-aware-scroll-view';
import { Text, Switch } from 'react-native-paper';
import { ContentTypeChips } from './content-type-chips';
import { FilterChip } from '@/components/library/filter-chip';
import { useAppTheme } from '@/lib/theme';
import type { ArtistReference } from '@/src/domain/entities/artist';
import type { AlbumReference } from '@/src/domain/entities/album';
import type { SearchFilters, SearchContentType } from '@/src/domain/utils/search-filtering';

interface ExploreFilterSectionProps {
	artists: ArtistReference[];
	albums: AlbumReference[];
	activeFilters: SearchFilters;
	onContentTypeChange: (type: SearchContentType) => void;
	onToggleArtist: (artistId: string) => void;
	onToggleAlbum: (albumId: string) => void;
	onToggleFavorites: () => void;
}

export function ExploreFilterSection({
	artists,
	albums,
	activeFilters,
	onContentTypeChange,
	onToggleArtist,
	onToggleAlbum,
	onToggleFavorites,
}: ExploreFilterSectionProps) {
	const { colors } = useAppTheme();

	return (
		<View style={styles.container}>
			<View style={styles.section}>
				<Text
					variant="labelMedium"
					style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}
				>
					CONTENT TYPE
				</Text>
				<ContentTypeChips
					selected={activeFilters.contentType}
					onChange={onContentTypeChange}
				/>
			</View>

			<View style={styles.favoritesRow}>
				<Text variant="bodyMedium" style={{ color: colors.onSurface }}>
					Favorites only
				</Text>
				<Switch value={activeFilters.favoritesOnly} onValueChange={onToggleFavorites} />
			</View>

			{artists.length > 0 && (
				<View style={styles.section}>
					<Text
						variant="labelMedium"
						style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}
					>
						ARTISTS
					</Text>
					<PlayerAwareScrollView
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
					</PlayerAwareScrollView>
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
					<PlayerAwareScrollView
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
					</PlayerAwareScrollView>
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
