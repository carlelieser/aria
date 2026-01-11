/**
 * ExploreScreen
 *
 * Search and explore music with filtering, sorting, and batch actions.
 * Uses M3 theming.
 */

import { useCallback, useMemo, memo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, StyleSheet, TextInput } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import { SearchXIcon, HeartIcon, ClockIcon, SparklesIcon, CompassIcon } from 'lucide-react-native';
import { TrackCard } from '@/components/track-card';
import { SelectableTrackListItem } from '@/components/selectable-track-list-item';
import { AlbumListItem } from '@/components/album-list-item';
import { ArtistListItem } from '@/components/artist-list-item';
import { BatchActionBar } from '@/components/batch-action-bar';
import { ExploreSortFilterSheet } from '@/components/explore';
import { SortFilterFAB } from '@/components/library/sort-filter-fab';
import { useSearch } from '@/hooks/use-search';
import { useExploreFilter } from '@/hooks/use-explore-filter';
import { useSelection } from '@/hooks/use-selection';
import { useBatchActions } from '@/hooks/use-batch-actions';
import { EmptyState } from '@/components/empty-state';
import { TrackListSkeleton } from '@/components/skeletons';
import { useRecentlyPlayed, useHasHistory } from '@/src/application/state/history-store';
import { getTrackIdString } from '@/src/domain/value-objects/track-id';
import { useFavoriteTracks, useRecentlyAddedTracks } from '@/src/application/state/library-store';
import { useAppTheme } from '@/lib/theme';
import type { Track } from '@/src/domain/entities/track';
import type { LucideIcon } from 'lucide-react-native';

interface ExploreSectionProps {
	id: string;
	title: string;
	icon: LucideIcon;
	tracks: Track[];
	showSeeAll?: boolean;
	onSeeAll?: () => void;
}

const ExploreSection = memo(function ExploreSection({
	id,
	title,
	icon: IconComponent,
	tracks,
	showSeeAll,
	onSeeAll,
}: ExploreSectionProps) {
	const { colors } = useAppTheme();

	const titleStyle = useMemo(
		() => ({ color: colors.onSurface, fontWeight: '600' as const }),
		[colors.onSurface]
	);

	if (tracks.length === 0) return null;

	return (
		<View style={styles.section}>
			<View style={styles.sectionHeader}>
				<View style={styles.sectionTitleRow}>
					<Text variant="labelLarge" style={titleStyle}>
						{title}
					</Text>
				</View>
				{showSeeAll && onSeeAll && (
					<Button
						mode="text"
						compact
						onPress={onSeeAll}
						textColor={colors.onSurfaceVariant}
					>
						See all
					</Button>
				)}
			</View>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.horizontalScroll}
			>
				{tracks.map((track, index) => (
					<TrackCard
						key={`${id}-${getTrackIdString(track.id)}`}
						track={track}
						queue={tracks}
						queueIndex={index}
					/>
				))}
			</ScrollView>
		</View>
	);
});

export default function ExploreScreen() {
	const { query, isSearching, error, search } = useSearch();
	const { colors } = useAppTheme();
	const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

	const {
		tracks: filteredTracks,
		albums: filteredAlbums,
		artists: filteredArtists,
		hasResults: hasSearchResults,
		sortField,
		sortDirection,
		toggleSortDirection,
		setSortField,
		activeFilters,
		hasFilters,
		filterCount,
		setContentType,
		toggleArtistFilter,
		toggleAlbumFilter,
		toggleFavoritesOnly,
		clearAll,
		filterArtists,
		filterAlbums,
		closeFilterSheet,
	} = useExploreFilter();

	const {
		isSelectionMode,
		selectedTrackIds,
		selectedCount,
		enterSelectionMode,
		exitSelectionMode,
		toggleTrackSelection,
	} = useSelection();

	const { downloadSelected, addSelectedToLibrary, addSelectedToQueue, isDownloading } =
		useBatchActions();

	const recentlyPlayed = useRecentlyPlayed(10);
	const favoriteTracks = useFavoriteTracks();
	const recentlyAdded = useRecentlyAddedTracks(10);
	const hasHistory = useHasHistory();

	const isExploreMode = query.trim() === '';
	const hasExploreContent = hasHistory || favoriteTracks.length > 0 || recentlyAdded.length > 0;

	const handleLongPress = useCallback(
		(track: Track) => {
			enterSelectionMode(track.id.value);
		},
		[enterSelectionMode]
	);

	const handleSelectionToggle = useCallback(
		(track: Track) => {
			toggleTrackSelection(track.id.value);
		},
		[toggleTrackSelection]
	);

	const handleOpenFilterSheet = useCallback(() => {
		setIsFilterSheetOpen(true);
	}, []);

	const handleCloseFilterSheet = useCallback(() => {
		setIsFilterSheetOpen(false);
		closeFilterSheet();
	}, [closeFilterSheet]);

	const handleBatchDownload = useCallback(async () => {
		const selectedTracks = filteredTracks.filter((t) => selectedTrackIds.has(t.id.value));
		await downloadSelected(selectedTracks);
		exitSelectionMode();
	}, [filteredTracks, selectedTrackIds, downloadSelected, exitSelectionMode]);

	const handleBatchAddToLibrary = useCallback(() => {
		const selectedTracks = filteredTracks.filter((t) => selectedTrackIds.has(t.id.value));
		addSelectedToLibrary(selectedTracks);
		exitSelectionMode();
	}, [filteredTracks, selectedTrackIds, addSelectedToLibrary, exitSelectionMode]);

	const handleBatchAddToQueue = useCallback(() => {
		const selectedTracks = filteredTracks.filter((t) => selectedTrackIds.has(t.id.value));
		addSelectedToQueue(selectedTracks);
		exitSelectionMode();
	}, [filteredTracks, selectedTrackIds, addSelectedToQueue, exitSelectionMode]);

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<View
				style={[styles.headerContainer, { backgroundColor: colors.surfaceContainerHigh }]}
			>
				<SafeAreaView edges={['top']} style={styles.headerSafeArea}>
					<View style={styles.headerRow}>
						<Icon as={CompassIcon} size={28} color={colors.primary} />
						<Text
							variant="headlineMedium"
							style={{ color: colors.onSurface, fontWeight: '700' }}
						>
							Explore
						</Text>
					</View>
					<View style={styles.searchRow}>
						<TextInput
							value={query}
							onChangeText={search}
							style={[styles.searchInput, { color: colors.onSurface }]}
							placeholderTextColor={colors.onSurfaceVariant}
							placeholder="Search songs, artists, albums..."
							autoFocus={false}
						/>
					</View>
				</SafeAreaView>
			</View>

			<ScrollView
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingBottom: isSelectionMode ? 120 : 20 },
				]}
			>
				{!isExploreMode && (
					<View style={styles.searchResults}>
						{isSearching && <TrackListSkeleton count={6} />}

						{error && !isSearching && (
							<View style={styles.errorContainer}>
								<Text style={{ color: colors.error }}>Error: {error}</Text>
							</View>
						)}

						{!isSearching && !error && !hasSearchResults && (
							<EmptyState
								icon={SearchXIcon}
								title="No results found"
								description={
									hasFilters
										? 'Try adjusting your filters'
										: 'Try searching for something else'
								}
							/>
						)}

						{!isSearching && !error && hasSearchResults && (
							<View style={styles.trackList}>
								{filteredTracks.map((track, index) => (
									<SelectableTrackListItem
										key={track.id.value}
										track={track}
										source="search"
										isSelectionMode={isSelectionMode}
										isSelected={selectedTrackIds.has(track.id.value)}
										onLongPress={handleLongPress}
										onSelectionToggle={handleSelectionToggle}
										queue={filteredTracks}
										queueIndex={index}
									/>
								))}

								{filteredAlbums.map((album) => (
									<AlbumListItem key={album.id} album={album} />
								))}

								{filteredArtists.map((artist) => (
									<ArtistListItem key={artist.id} artist={artist} />
								))}
							</View>
						)}
					</View>
				)}

				{isExploreMode && (
					<>
						{!hasExploreContent && (
							<View style={styles.emptyExplore}>
								<EmptyState
									icon={SparklesIcon}
									title="Start exploring"
									description="Search for music or play some tracks to see your recent activity here"
								/>
							</View>
						)}

						{hasExploreContent && (
							<>
								<ExploreSection
									id="recently-played"
									title="Recently Played"
									icon={ClockIcon}
									tracks={recentlyPlayed}
								/>

								<ExploreSection
									id="favorites"
									title="Favorites"
									icon={HeartIcon}
									tracks={favoriteTracks}
								/>

								{recentlyAdded.length > 0 && (
									<ExploreSection
										id="recently-added"
										title="Recently Added"
										icon={SparklesIcon}
										tracks={recentlyAdded}
									/>
								)}
							</>
						)}
					</>
				)}
			</ScrollView>

			{!isExploreMode && hasSearchResults && !isSelectionMode && (
				<SortFilterFAB filterCount={filterCount} onPress={handleOpenFilterSheet} />
			)}

			<ExploreSortFilterSheet
				isOpen={isFilterSheetOpen}
				onClose={handleCloseFilterSheet}
				sortField={sortField}
				sortDirection={sortDirection}
				activeFilters={activeFilters}
				artists={filterArtists}
				albums={filterAlbums}
				onSortFieldChange={setSortField}
				onToggleSortDirection={toggleSortDirection}
				onContentTypeChange={setContentType}
				onToggleArtist={toggleArtistFilter}
				onToggleAlbum={toggleAlbumFilter}
				onToggleFavorites={toggleFavoritesOnly}
				onClearAll={clearAll}
			/>

			<BatchActionBar
				selectedCount={selectedCount}
				onDownload={handleBatchDownload}
				onAddToLibrary={handleBatchAddToLibrary}
				onAddToQueue={handleBatchAddToQueue}
				onCancel={exitSelectionMode}
				isDownloading={isDownloading}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	headerContainer: {
		paddingHorizontal: 16,
		paddingBottom: 16,
		borderBottomLeftRadius: 24,
		borderBottomRightRadius: 24,
	},
	headerSafeArea: {
		paddingTop: 16,
		gap: 16,
	},
	headerRow: {
		flexDirection: 'row',
		justifyContent: 'flex-start',
		alignItems: 'center',
		gap: 12,
		width: '100%',
	},
	searchRow: {
		flexDirection: 'row',
		alignItems: 'center',
		width: '100%',
	},
	searchInput: {
		flex: 1,
		fontSize: 16,
		paddingVertical: 8,
	},
	scrollContent: {
		gap: 24,
		paddingVertical: 24,
	},
	section: {
		gap: 12,
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
	},
	sectionTitleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	horizontalScroll: {
		gap: 16,
		paddingHorizontal: 16,
	},
	searchResults: {
		paddingHorizontal: 16,
	},
	errorContainer: {
		paddingVertical: 32,
		alignItems: 'center',
	},
	trackList: {
		gap: 8,
	},
	emptyExplore: {
		paddingHorizontal: 16,
		paddingTop: 32,
	},
});
