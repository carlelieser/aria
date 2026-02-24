/**
 * UnifiedFilterSheet Component
 *
 * Bottom sheet for unified search sort and filter options.
 * Single flat panel — no tabs.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { SortFilterBottomSheet } from '@/src/components/ui/sort-filter-bottom-sheet';
import { SortSection, UNIFIED_SORT_OPTIONS } from '@/src/components/sort-filter/sort-section';
import { FilterSection } from '@/src/components/sort-filter/filter-section';
import { ContentTypeChips } from '@/src/components/explore/content-type-chips';
import { useAppTheme } from '@/lib/theme';
import type {
	UnifiedSortField,
	SearchSortDirection,
	SearchContentType,
	UnifiedSearchFilters,
} from '@/src/domain/utils/search-filtering';
import type { ArtistReference } from '@/src/domain/entities/artist';
import type { AlbumReference } from '@/src/domain/entities/album';

interface ProviderOption {
	readonly id: string;
	readonly name: string;
}

interface UnifiedFilterSheetProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly sortField: UnifiedSortField;
	readonly sortDirection: SearchSortDirection;
	readonly activeFilters: UnifiedSearchFilters;
	readonly artists: ArtistReference[];
	readonly albums: AlbumReference[];
	readonly providers?: readonly ProviderOption[];
	readonly onSortFieldChange: (field: UnifiedSortField) => void;
	readonly onToggleSortDirection: () => void;
	readonly onContentTypeChange: (type: SearchContentType) => void;
	readonly onToggleArtist: (artistId: string) => void;
	readonly onToggleAlbum: (albumId: string) => void;
	readonly onToggleProvider?: (providerId: string) => void;
	readonly onToggleFavorites: () => void;
	readonly onToggleDownloaded: () => void;
	readonly onClearAll: () => void;
}

export function UnifiedFilterSheet({
	isOpen,
	onClose,
	sortField,
	sortDirection,
	activeFilters,
	artists,
	albums,
	providers,
	onSortFieldChange,
	onToggleSortDirection,
	onContentTypeChange,
	onToggleArtist,
	onToggleAlbum,
	onToggleProvider,
	onToggleFavorites,
	onToggleDownloaded,
	onClearAll,
}: UnifiedFilterSheetProps) {
	const { colors } = useAppTheme();

	const toggles = useMemo(
		() => [
			{
				label: 'Favorites only',
				value: activeFilters.favoritesOnly,
				onToggle: onToggleFavorites,
			},
			{
				label: 'Downloaded only',
				value: activeFilters.downloadedOnly,
				onToggle: onToggleDownloaded,
			},
		],
		[
			activeFilters.favoritesOnly,
			activeFilters.downloadedOnly,
			onToggleFavorites,
			onToggleDownloaded,
		]
	);

	const headerContent = useMemo(
		() => (
			<View style={styles.filterSection}>
				<Text
					variant={'labelMedium'}
					style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}
				>
					CONTENT TYPE
				</Text>
				<ContentTypeChips
					selected={activeFilters.contentType}
					onChange={onContentTypeChange}
				/>
			</View>
		),
		[activeFilters.contentType, onContentTypeChange, colors.onSurfaceVariant]
	);

	return (
		<SortFilterBottomSheet
			isOpen={isOpen}
			onClose={onClose}
			onClearAll={onClearAll}
			portalName={'unified-filter-sheet'}
		>
			<Divider style={styles.divider} />

			<View style={styles.section}>
				<SortSection
					sortField={sortField}
					sortDirection={sortDirection}
					sortOptions={UNIFIED_SORT_OPTIONS}
					onSortFieldChange={onSortFieldChange}
					onToggleDirection={onToggleSortDirection}
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
					onToggleArtist={onToggleArtist}
					onToggleAlbum={onToggleAlbum}
					onToggleProvider={onToggleProvider}
					toggles={toggles}
					headerContent={headerContent}
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
	filterSection: {
		gap: 8,
	},
	sectionLabel: {
		letterSpacing: 0.5,
	},
});
