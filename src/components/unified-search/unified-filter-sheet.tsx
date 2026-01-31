/**
 * UnifiedFilterSheet Component
 *
 * Tabbed bottom sheet for unified search sort and filter options.
 * Shows both library and explore filter sections in tabs.
 */

import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import BottomSheet, {
	BottomSheetBackdrop,
	BottomSheetScrollView,
	type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { Portal } from '@rn-primitives/portal';
import { Text, Button, Divider, Switch } from 'react-native-paper';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';
import { SortSection } from '@/components/library/sort-section';
import { ExploreSortSection } from '@/components/explore/explore-sort-section';
import { ContentTypeChips } from '@/components/explore/content-type-chips';
import { FilterChip } from '@/components/library/filter-chip';
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

	// Calculate tab width (container width minus padding, divided by 2 tabs)
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
						<LibraryFilterContent {...libraryProps} />
					) : (
						<ExploreFilterContent {...exploreProps} />
					)}

					<View style={styles.bottomPadding} />
				</BottomSheetScrollView>
			</BottomSheet>
		</Portal>
	);
}

function LibraryFilterContent({
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
}: LibraryFilterProps) {
	const { colors } = useAppTheme();

	return (
		<>
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
				<View style={styles.container}>
					<View style={styles.switchRow}>
						<Text variant="bodyMedium" style={{ color: colors.onSurface }}>
							Favorites only
						</Text>
						<Switch
							value={activeFilters.favoritesOnly}
							onValueChange={onToggleFavorites}
						/>
					</View>

					<View style={styles.switchRow}>
						<Text variant="bodyMedium" style={{ color: colors.onSurface }}>
							Downloaded only
						</Text>
						<Switch
							value={activeFilters.downloadedOnly}
							onValueChange={onToggleDownloaded}
						/>
					</View>

					{artists.length > 0 && (
						<FilterChipSection
							label="ARTISTS"
							items={artists}
							selectedIds={activeFilters.artistIds}
							onToggle={onToggleArtist}
						/>
					)}

					{albums.length > 0 && (
						<FilterChipSection
							label="ALBUMS"
							items={albums}
							selectedIds={activeFilters.albumIds}
							onToggle={onToggleAlbum}
						/>
					)}
				</View>
			</View>
		</>
	);
}

function ExploreFilterContent({
	sortField,
	sortDirection,
	activeFilters,
	artists,
	albums,
	onSortFieldChange,
	onToggleSortDirection,
	onContentTypeChange,
	onToggleArtist,
	onToggleAlbum,
	onToggleFavorites,
}: ExploreFilterProps) {
	const { colors } = useAppTheme();

	return (
		<>
			<View style={styles.section}>
				<ExploreSortSection
					sortField={sortField}
					sortDirection={sortDirection}
					onSortFieldChange={onSortFieldChange}
					onToggleDirection={onToggleSortDirection}
				/>
			</View>

			<Divider style={styles.divider} />

			<View style={styles.section}>
				<View style={styles.container}>
					<View style={styles.filterSection}>
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

					<View style={styles.switchRow}>
						<Text variant="bodyMedium" style={{ color: colors.onSurface }}>
							Favorites only
						</Text>
						<Switch
							value={activeFilters.favoritesOnly}
							onValueChange={onToggleFavorites}
						/>
					</View>

					{artists.length > 0 && (
						<FilterChipSection
							label="ARTISTS"
							items={artists}
							selectedIds={activeFilters.artistIds}
							onToggle={onToggleArtist}
						/>
					)}

					{albums.length > 0 && (
						<FilterChipSection
							label="ALBUMS"
							items={albums}
							selectedIds={activeFilters.albumIds}
							onToggle={onToggleAlbum}
						/>
					)}
				</View>
			</View>
		</>
	);
}

interface FilterChipSectionProps {
	label: string;
	items: { id: string; name: string }[];
	selectedIds: readonly string[];
	onToggle: (id: string) => void;
}

function FilterChipSection({ label, items, selectedIds, onToggle }: FilterChipSectionProps) {
	const { colors } = useAppTheme();

	return (
		<View style={styles.filterSection}>
			<Text
				variant="labelMedium"
				style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}
			>
				{label}
			</Text>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				style={styles.scrollView}
				contentContainerStyle={styles.chipContainer}
			>
				{items.map((item) => (
					<FilterChip
						key={item.id}
						label={item.name}
						selected={selectedIds.includes(item.id)}
						onPress={() => onToggle(item.id)}
					/>
				))}
			</ScrollView>
		</View>
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
	container: {
		gap: 16,
	},
	switchRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 4,
	},
	filterSection: {
		gap: 8,
	},
	sectionLabel: {
		letterSpacing: 0.5,
	},
	scrollView: {
		borderRadius: 12,
		overflow: 'hidden',
	},
	chipContainer: {
		gap: 8,
		paddingRight: 16,
	},
	bottomPadding: {
		height: 34,
	},
});
