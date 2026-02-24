/**
 * LibrarySortFilterSheet Component
 *
 * Bottom sheet for library sort and filter options.
 * Composes SortFilterBottomSheet + SortSection + FilterSection.
 * Self-contained: consumes useLibraryFilter() and useUniqueFilterOptions() internally.
 */

import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Divider } from 'react-native-paper';
import { SortFilterBottomSheet } from '@/src/components/ui/sort-filter-bottom-sheet';
import { SortSection, LIBRARY_SORT_OPTIONS } from '@/src/components/sort-filter/sort-section';
import { FilterSection } from '@/src/components/sort-filter/filter-section';
import { useLibraryFilter } from '@/src/hooks/use-library-filter';
import { useUniqueFilterOptions } from '@/src/hooks/use-unique-filter-options';
import { useAggregatedTracks } from '@/src/hooks/use-aggregated-library';

interface LibrarySortFilterSheetProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
}

export function LibrarySortFilterSheet({ isOpen, onClose }: LibrarySortFilterSheetProps) {
	const allTracks = useAggregatedTracks();
	const { artists, albums, providers } = useUniqueFilterOptions(allTracks);

	const {
		sortField,
		sortDirection,
		activeFilters,
		setSortField,
		toggleSortDirection,
		toggleArtistFilter,
		toggleAlbumFilter,
		toggleProviderFilter,
		toggleFavoritesOnly,
		toggleDownloadedOnly,
		clearAll,
	} = useLibraryFilter();

	const toggles = useMemo(
		() => [
			{
				label: 'Favorites only',
				value: activeFilters.favoritesOnly,
				onToggle: toggleFavoritesOnly,
			},
			{
				label: 'Downloaded only',
				value: activeFilters.downloadedOnly,
				onToggle: toggleDownloadedOnly,
			},
		],
		[
			activeFilters.favoritesOnly,
			activeFilters.downloadedOnly,
			toggleFavoritesOnly,
			toggleDownloadedOnly,
		]
	);

	return (
		<SortFilterBottomSheet
			isOpen={isOpen}
			onClose={onClose}
			onClearAll={clearAll}
			portalName={'library-sort-filter-sheet'}
		>
			<Divider style={styles.divider} />
			<View style={styles.section}>
				<SortSection
					sortField={sortField}
					sortDirection={sortDirection}
					sortOptions={LIBRARY_SORT_OPTIONS}
					onSortFieldChange={setSortField}
					onToggleDirection={toggleSortDirection}
				/>
			</View>

			<Divider style={styles.divider} />
			<View style={styles.section}>
				<FilterSection
					artists={artists}
					albums={albums}
					providers={providers}
					selectedArtistIds={activeFilters.artistIds}
					selectedAlbumIds={activeFilters.albumIds}
					selectedProviderIds={activeFilters.providerIds}
					onToggleArtist={toggleArtistFilter}
					onToggleAlbum={toggleAlbumFilter}
					onToggleProvider={toggleProviderFilter}
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
