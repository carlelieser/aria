/**
 * ActiveFiltersBar Component
 *
 * Horizontal bar showing active filters with remove capability.
 * Uses M3 theming.
 */

import { View, StyleSheet, ScrollView } from 'react-native';
import { FilterChip } from '@/src/components/sort-filter/filter-chip';
import type { ArtistReference } from '@/src/domain/entities/artist';
import type { AlbumReference } from '@/src/domain/entities/album';
import type { LibraryFilters } from '@/src/domain/utils/track-filtering';

interface ActiveFiltersBarProps {
	readonly activeFilters: LibraryFilters;
	readonly artists: ArtistReference[];
	readonly albums: AlbumReference[];
	readonly onToggleArtist: (artistId: string) => void;
	readonly onToggleAlbum: (albumId: string) => void;
	readonly onToggleFavorites: () => void;
	readonly onToggleDownloaded: () => void;
	readonly onClearAll: () => void;
}

export function ActiveFiltersBar({
	activeFilters,
	artists,
	albums,
	onToggleArtist,
	onToggleAlbum,
	onToggleFavorites,
	onToggleDownloaded,
	onClearAll,
}: ActiveFiltersBarProps) {
	const selectedArtists = artists.filter((a) => activeFilters.artistIds.includes(a.id));
	const selectedAlbums = albums.filter((a) => activeFilters.albumIds.includes(a.id));

	const hasFilters =
		activeFilters.favoritesOnly ||
		activeFilters.downloadedOnly ||
		selectedArtists.length > 0 ||
		selectedAlbums.length > 0;

	if (!hasFilters) {
		return null;
	}

	return (
		<View style={styles.container}>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.chipContainer}
				style={styles.scrollView}
			>
				{activeFilters.favoritesOnly && (
					<FilterChip
						label={'Favorites'}
						selected
						showRemoveIcon
						onRemove={onToggleFavorites}
					/>
				)}
				{activeFilters.downloadedOnly && (
					<FilterChip
						label={'Downloaded'}
						selected
						showRemoveIcon
						onRemove={onToggleDownloaded}
					/>
				)}
				{selectedArtists.map((artist) => (
					<FilterChip
						key={artist.id}
						label={artist.name}
						selected
						showRemoveIcon
						onRemove={() => onToggleArtist(artist.id)}
					/>
				))}
				{selectedAlbums.map((album) => (
					<FilterChip
						key={album.id}
						label={album.name}
						selected
						showRemoveIcon
						onRemove={() => onToggleAlbum(album.id)}
					/>
				))}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 14,
		gap: 8,
	},
	scrollView: {
		flex: 1,
	},
	chipContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
});
