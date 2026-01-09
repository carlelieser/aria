import React, { forwardRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import BottomSheet, {
	BottomSheetBackdrop,
	BottomSheetScrollView,
	type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { Portal } from '@rn-primitives/portal';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { SortSection } from './sort-section';
import { FilterSection } from './filter-section';
import type { SortField, SortDirection, LibraryFilters } from '@/src/domain/utils/track-filtering';
import type { ArtistReference } from '@/src/domain/entities/artist';
import type { AlbumReference } from '@/src/domain/entities/album';

const COLORS = {
	light: {
		background: '#ffffff',
		handleIndicator: '#d1d5db',
		separator: '#e5e7eb',
	},
	dark: {
		background: '#1c1c1e',
		handleIndicator: '#5c5c5e',
		separator: '#3c3c3e',
	},
};

interface LibrarySortFilterSheetProps {
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
	onClearAll: () => void;
	onDismiss?: () => void;
}

export const LibrarySortFilterSheet = forwardRef<BottomSheetMethods, LibrarySortFilterSheetProps>(
	function LibrarySortFilterSheet(
		{
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
			onClearAll,
			onDismiss,
		},
		ref
	) {
		const colorScheme = useColorScheme();
		const isDark = colorScheme === 'dark';
		const colors = isDark ? COLORS.dark : COLORS.light;

		const snapPoints = useMemo(() => ['60%', '85%'], []);

		const handleSheetChanges = useCallback(
			(index: number) => {
				if (index === -1) {
					onDismiss?.();
				}
			},
			[onDismiss]
		);

		const renderBackdrop = useCallback(
			(props: BottomSheetBackdropProps) => (
				<BottomSheetBackdrop
					{...props}
					disappearsOnIndex={-1}
					appearsOnIndex={0}
					opacity={0.5}
				/>
			),
			[]
		);

		return (
			<Portal name="library-sort-filter-sheet">
				<BottomSheet
					ref={ref}
					index={-1}
					snapPoints={snapPoints}
					enablePanDownToClose
					backdropComponent={renderBackdrop}
					onChange={handleSheetChanges}
					backgroundStyle={[styles.background, { backgroundColor: colors.background }]}
					handleIndicatorStyle={[
						styles.handleIndicator,
						{ backgroundColor: colors.handleIndicator },
					]}
				>
					<BottomSheetScrollView style={styles.contentContainer}>
						{}
						<View className="flex-row items-center justify-between px-4 pb-2">
							<Text className="text-lg font-semibold">Sort & Filter</Text>
							<Button variant="ghost" size="sm" onPress={onClearAll}>
								<Text className="text-sm text-muted-foreground">Clear all</Text>
							</Button>
						</View>

						{}
						<View style={[styles.separator, { backgroundColor: colors.separator }]} />
						<View className="px-4 py-3">
							<SortSection
								sortField={sortField}
								sortDirection={sortDirection}
								onSortFieldChange={onSortFieldChange}
								onToggleDirection={onToggleSortDirection}
							/>
						</View>

						{}
						<View style={[styles.separator, { backgroundColor: colors.separator }]} />
						<View className="px-4 py-3">
							<FilterSection
								artists={artists}
								albums={albums}
								activeFilters={activeFilters}
								onToggleArtist={onToggleArtist}
								onToggleAlbum={onToggleAlbum}
								onToggleFavorites={onToggleFavorites}
							/>
						</View>

						{}
						<View style={styles.bottomPadding} />
					</BottomSheetScrollView>
				</BottomSheet>
			</Portal>
		);
	}
);

const styles = StyleSheet.create({
	background: {
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
	},
	handleIndicator: {
		width: 36,
		height: 5,
	},
	contentContainer: {
		flex: 1,
	},
	separator: {
		height: StyleSheet.hairlineWidth,
		marginVertical: 4,
	},
	bottomPadding: {
		height: 34,
	},
});
