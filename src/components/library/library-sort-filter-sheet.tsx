/**
 * LibrarySortFilterSheet Component
 *
 * Bottom sheet for library sort and filter options.
 * Composes SortFilterBottomSheet + SortSection + FilterSection.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Divider } from 'react-native-paper';
import { SortFilterBottomSheet } from '@/src/components/ui/sort-filter-bottom-sheet';
import { SortSection, LIBRARY_SORT_OPTIONS } from './sort-section';
import { FilterSection } from './filter-section';
import type { SortField, SortDirection, LibraryFilters } from '@/src/domain/utils/track-filtering';
import type { ArtistReference } from '@/src/domain/entities/artist';
import type { AlbumReference } from '@/src/domain/entities/album';

interface LibrarySortFilterSheetProps {
	isOpen: boolean;
	onClose: () => void;
	sortField: SortField;
	sortDirection: SortDirection;
	activeFilters: LibraryFilters;
	artists: ArtistReference[];
	albums: AlbumReference[];
	onSortFieldChange: (field: SortField) => void;
	onToggleSortDirection: () => void;
	onToggleArtist: (artistId: string) => void;
	onToggleAlbum: (albumId: string) => void;
	onToggleFavorites: () => void;
	onToggleDownloaded: () => void;
	onClearAll: () => void;
}

export function LibrarySortFilterSheet({
	isOpen,
	onClose,
	sortField,
	sortDirection,
	activeFilters,
	artists,
	albums,
	onSortFieldChange,
	onToggleSortDirection,
	onToggleArtist,
	onToggleAlbum,
	onToggleFavorites,
	onToggleDownloaded,
	onClearAll,
}: LibrarySortFilterSheetProps) {
	const toggles = useMemo(
		() => [
			{ label: 'Favorites only', value: activeFilters.favoritesOnly, onToggle: onToggleFavorites },
			{ label: 'Downloaded only', value: activeFilters.downloadedOnly, onToggle: onToggleDownloaded },
		],
		[activeFilters.favoritesOnly, activeFilters.downloadedOnly, onToggleFavorites, onToggleDownloaded]
	);

	return (
		<SortFilterBottomSheet
			isOpen={isOpen}
			onClose={onClose}
			onClearAll={onClearAll}
			portalName="library-sort-filter-sheet"
		>
			<Divider style={styles.divider} />
			<View style={styles.section}>
				<SortSection
					sortField={sortField}
					sortDirection={sortDirection}
					sortOptions={LIBRARY_SORT_OPTIONS}
					onSortFieldChange={onSortFieldChange}
					onToggleDirection={onToggleSortDirection}
				/>
			</View>

			<Divider style={styles.divider} />
			<View style={styles.section}>
				<FilterSection
					artists={artists}
					albums={albums}
					selectedArtistIds={activeFilters.artistIds}
					selectedAlbumIds={activeFilters.albumIds}
					onToggleArtist={onToggleArtist}
					onToggleAlbum={onToggleAlbum}
					toggles={toggles}
				/>
			</View>
		</SortFilterBottomSheet>
	);
}

const styles = StyleSheet.create({
	divider: {
		marginVertical: 4,
	},
	section: {
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
});
