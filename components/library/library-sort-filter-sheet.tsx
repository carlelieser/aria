/**
 * LibrarySortFilterSheet Component
 *
 * Bottom sheet for library sort and filter options.
 * Uses M3 theming.
 */

import React, { forwardRef, useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { Portal } from '@rn-primitives/portal';
import { Text, Button, Divider } from 'react-native-paper';
import { SortSection } from './sort-section';
import { FilterSection } from './filter-section';
import { useAppTheme } from '@/lib/theme';
import type { SortField, SortDirection, LibraryFilters } from '@/src/domain/utils/track-filtering';
import type { ArtistReference } from '@/src/domain/entities/artist';
import type { AlbumReference } from '@/src/domain/entities/album';

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
    const { colors } = useAppTheme();

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
          backgroundStyle={[
            styles.background,
            { backgroundColor: colors.surfaceContainerHigh },
          ]}
          handleIndicatorStyle={[
            styles.handleIndicator,
            { backgroundColor: colors.outlineVariant },
          ]}
        >
          <BottomSheetScrollView style={styles.contentContainer}>
            <View style={styles.header}>
              <Text variant="titleMedium" style={{ color: colors.onSurface }}>
                Sort & Filter
              </Text>
              <Button
                mode="text"
                compact
                onPress={onClearAll}
                textColor={colors.onSurfaceVariant}
              >
                Clear all
              </Button>
            </View>

            <Divider style={styles.divider} />
            <View style={styles.section}>
              <SortSection
                sortField={sortField}
                sortDirection={sortDirection}
                onSortFieldChange={onSortFieldChange}
                onToggleDirection={onToggleSortDirection}
              />
            </View>

            <Divider style={styles.divider} />
            <View style={styles.section}>
              <FilterSection
                artists={artists}
                albums={albums}
                activeFilters={activeFilters}
                onToggleArtist={onToggleArtist}
                onToggleAlbum={onToggleAlbum}
                onToggleFavorites={onToggleFavorites}
              />
            </View>

            <View style={styles.bottomPadding} />
          </BottomSheetScrollView>
        </BottomSheet>
      </Portal>
    );
  }
);

const styles = StyleSheet.create({
  background: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handleIndicator: {
    width: 32,
    height: 4,
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  divider: {
    marginVertical: 4,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bottomPadding: {
    height: 34,
  },
});
