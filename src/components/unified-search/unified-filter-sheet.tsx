/**
 * UnifiedFilterSheet Component
 *
 * Tabbed bottom sheet for unified search sort and filter options.
 * Shows both library and explore filter sections in tabs.
 */

import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import BottomSheet, {
	BottomSheetBackdrop,
	BottomSheetScrollView,
	type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { Portal } from '@rn-primitives/portal';
import { Text, Button, Divider } from 'react-native-paper';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';
import {
	SortSection,
	LIBRARY_SORT_OPTIONS,
	EXPLORE_SORT_OPTIONS,
} from '@/src/components/sort-filter/sort-section';
import { FilterSection } from '@/src/components/sort-filter/filter-section';
import { ContentTypeChips } from '@/src/components/explore/content-type-chips';
import { useAppTheme } from '@/lib/theme';
import type { SortField, SortDirection, LibraryFilters } from '@/src/domain/utils/track-filtering';
import type {
	SearchSortField,
	SearchSortDirection,
	SearchFilters,
	SearchContentType,
} from '@/src/domain/utils/search-filtering';
import type { ArtistReference } from '@/src/domain/entities/artist';
import type { AlbumReference } from '@/src/domain/entities/album';

type FilterTab = 'library' | 'explore';

interface LibraryFilterProps {
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

interface ExploreFilterProps {
	sortField: SearchSortField;
	sortDirection: SearchSortDirection;
	activeFilters: SearchFilters;
	artists: ArtistReference[];
	albums: AlbumReference[];
	onSortFieldChange: (field: SearchSortField) => void;
	onToggleSortDirection: () => void;
	onContentTypeChange: (type: SearchContentType) => void;
	onToggleArtist: (artistId: string) => void;
	onToggleAlbum: (albumId: string) => void;
	onToggleFavorites: () => void;
	onClearAll: () => void;
}

interface UnifiedFilterSheetProps {
	isOpen: boolean;
	onClose: () => void;
	libraryProps: LibraryFilterProps;
	exploreProps: ExploreFilterProps;
}

const TAB_PADDING = 16;

export function UnifiedFilterSheet({
	isOpen,
	onClose,
	libraryProps,
	exploreProps,
}: UnifiedFilterSheetProps) {
	const { colors } = useAppTheme();
	const { width: windowWidth } = useWindowDimensions();
	const sheetRef = useRef<BottomSheetMethods>(null);
	const [activeTab, setActiveTab] = useState<FilterTab>('library');
	const indicatorPosition = useSharedValue(0);

	const tabContainerWidth = windowWidth - TAB_PADDING * 2;
	const tabWidth = tabContainerWidth / 2;

	const snapPoints = useMemo(() => ['60%', '85%'], []);

	useEffect(() => {
		if (isOpen) {
			sheetRef.current?.snapToIndex(0);
		}
	}, [isOpen]);

	useEffect(() => {
		indicatorPosition.value = withTiming(activeTab === 'library' ? 0 : tabWidth, {
			duration: 200,
		});
	}, [activeTab, indicatorPosition, tabWidth]);

	const handleSheetChanges = useCallback(
		(index: number) => {
			if (index === -1) {
				onClose();
			}
		},
		[onClose]
	);

	const renderBackdrop = useCallback(
		(props: BottomSheetBackdropProps) => (
			<BottomSheetBackdrop
				{...props}
				disappearsOnIndex={-1}
				appearsOnIndex={0}
				opacity={0.5}
				pressBehavior="close"
			/>
		),
		[]
	);

	const handleClearAll = useCallback(() => {
		libraryProps.onClearAll();
		exploreProps.onClearAll();
	}, [libraryProps, exploreProps]);

	const indicatorStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: indicatorPosition.value }],
	}));

	const libraryToggles = useMemo(
		() => [
			{
				label: 'Favorites only',
				value: libraryProps.activeFilters.favoritesOnly,
				onToggle: libraryProps.onToggleFavorites,
			},
			{
				label: 'Downloaded only',
				value: libraryProps.activeFilters.downloadedOnly,
				onToggle: libraryProps.onToggleDownloaded,
			},
		],
		[
			libraryProps.activeFilters.favoritesOnly,
			libraryProps.activeFilters.downloadedOnly,
			libraryProps.onToggleFavorites,
			libraryProps.onToggleDownloaded,
		]
	);

	const exploreToggles = useMemo(
		() => [
			{
				label: 'Favorites only',
				value: exploreProps.activeFilters.favoritesOnly,
				onToggle: exploreProps.onToggleFavorites,
			},
		],
		[exploreProps.activeFilters.favoritesOnly, exploreProps.onToggleFavorites]
	);

	const exploreHeaderContent = useMemo(
		() => (
			<View style={styles.filterSection}>
				<Text
					variant="labelMedium"
					style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}
				>
					CONTENT TYPE
				</Text>
				<ContentTypeChips
					selected={exploreProps.activeFilters.contentType}
					onChange={exploreProps.onContentTypeChange}
				/>
			</View>
		),
		[
			exploreProps.activeFilters.contentType,
			exploreProps.onContentTypeChange,
			colors.onSurfaceVariant,
		]
	);

	if (!isOpen) {
		return null;
	}

	return (
		<Portal name="unified-filter-sheet">
			<BottomSheet
				ref={sheetRef}
				index={0}
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
							onPress={handleClearAll}
							textColor={colors.onSurfaceVariant}
						>
							Clear all
						</Button>
					</View>

					<View style={styles.tabContainer}>
						<View style={styles.tabRow}>
							<Pressable style={styles.tab} onPress={() => setActiveTab('library')}>
								<Text
									variant="labelLarge"
									style={{
										color:
											activeTab === 'library'
												? colors.primary
												: colors.onSurfaceVariant,
										fontWeight: activeTab === 'library' ? '600' : '500',
									}}
								>
									Library
								</Text>
							</Pressable>
							<Pressable style={styles.tab} onPress={() => setActiveTab('explore')}>
								<Text
									variant="labelLarge"
									style={{
										color:
											activeTab === 'explore'
												? colors.primary
												: colors.onSurfaceVariant,
										fontWeight: activeTab === 'explore' ? '600' : '500',
									}}
								>
									Explore
								</Text>
							</Pressable>
						</View>
						<View
							style={[
								styles.tabIndicatorTrack,
								{ backgroundColor: colors.outlineVariant },
							]}
						>
							<Animated.View
								style={[
									styles.tabIndicator,
									{ backgroundColor: colors.primary, width: tabWidth },
									indicatorStyle,
								]}
							/>
						</View>
					</View>

					<Divider style={styles.divider} />

					{activeTab === 'library' ? (
						<>
							<View style={styles.section}>
								<SortSection
									sortField={libraryProps.sortField}
									sortDirection={libraryProps.sortDirection}
									sortOptions={LIBRARY_SORT_OPTIONS}
									onSortFieldChange={libraryProps.onSortFieldChange}
									onToggleDirection={libraryProps.onToggleSortDirection}
								/>
							</View>
							<Divider style={styles.divider} />
							<View style={styles.section}>
								<FilterSection
									artists={libraryProps.artists}
									albums={libraryProps.albums}
									selectedArtistIds={libraryProps.activeFilters.artistIds}
									selectedAlbumIds={libraryProps.activeFilters.albumIds}
									onToggleArtist={libraryProps.onToggleArtist}
									onToggleAlbum={libraryProps.onToggleAlbum}
									toggles={libraryToggles}
								/>
							</View>
						</>
					) : (
						<>
							<View style={styles.section}>
								<SortSection
									sortField={exploreProps.sortField}
									sortDirection={exploreProps.sortDirection}
									sortOptions={EXPLORE_SORT_OPTIONS}
									onSortFieldChange={exploreProps.onSortFieldChange}
									onToggleDirection={exploreProps.onToggleSortDirection}
								/>
							</View>
							<Divider style={styles.divider} />
							<View style={styles.section}>
								<FilterSection
									artists={exploreProps.artists}
									albums={exploreProps.albums}
									selectedArtistIds={exploreProps.activeFilters.artistIds}
									selectedAlbumIds={exploreProps.activeFilters.albumIds}
									onToggleArtist={exploreProps.onToggleArtist}
									onToggleAlbum={exploreProps.onToggleAlbum}
									toggles={exploreToggles}
									headerContent={exploreHeaderContent}
								/>
							</View>
						</>
					)}

					<View style={styles.bottomPadding} />
				</BottomSheetScrollView>
			</BottomSheet>
		</Portal>
	);
}

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
	tabContainer: {
		paddingHorizontal: 16,
		paddingVertical: 8,
	},
	tabRow: {
		flexDirection: 'row',
	},
	tab: {
		flex: 1,
		alignItems: 'center',
		paddingVertical: 8,
	},
	tabIndicatorTrack: {
		height: 2,
		borderRadius: 1,
		marginTop: 4,
	},
	tabIndicator: {
		height: 2,
		borderRadius: 1,
	},
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
	bottomPadding: {
		height: 34,
	},
});
