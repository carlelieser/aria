import { useCallback, useMemo, useState, useRef } from 'react';
import { View, StyleSheet, TextInput, Pressable } from 'react-native';
import { PlayerAwareScrollView } from '@/src/components/ui/player-aware-scroll-view';
import { PageLayout } from '@/src/components/ui/page-layout';
import {
	HeartIcon,
	ClockIcon,
	SparklesIcon,
	SearchIcon,
	MusicIcon,
	XIcon,
	AlertCircleIcon,
	SearchXIcon,
	DownloadIcon,
	LibraryBigIcon,
	PlugIcon,
} from 'lucide-react-native';
import { SelectableTrackListItem } from '@/src/components/media-list/selectable-track-list-item';
import { Icon } from '@/src/components/ui/icon';
import { EmptyState } from '@/src/components/ui/empty-state';
import { TrackListSkeleton } from '@/src/components/skeletons';
import { ResultGroup, UnifiedFilterSheet } from '@/src/components/unified-search';
import { SortFilterFAB } from '@/src/components/sort-filter/sort-filter-fab';
import { BatchActionBar } from '@/src/components/selection/batch-action-bar';
import { BatchPlaylistPicker } from '@/src/components/playlist/batch-playlist-picker';
import { CuratedSection, LibraryResults, ExploreResults } from '@/src/components/search';
import { useCuratedContent } from '@/src/hooks/use-curated-content';
import { useUnifiedSearch } from '@/src/hooks/use-unified-search';
import { useSelection } from '@/src/hooks/use-selection';
import { useBatchHandlers } from '@/src/hooks/use-batch-handlers';
import { useAppTheme, FontFamily } from '@/lib/theme';
import type { Track } from '@/src/domain/entities/track';

const BATCH_ACTION_BAR_PADDING = 120;
const DEFAULT_CONTENT_PADDING = 20;
const MAX_RESULTS_PER_SECTION = 5;

export default function SearchScreen() {
	const { colors } = useAppTheme();
	const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
	const [selectionSource, setSelectionSource] = useState<'library' | 'explore'>('library');
	const searchInputRef = useRef<TextInput>(null);

	const { recentlyPlayed, favoriteTracks, recentlyAdded, hasCuratedContent } =
		useCuratedContent(10);

	const {
		query,
		hasQuery,
		search,
		clearSearch,
		isSearching,
		error,
		hasLibraryResults,
		hasExploreResults,
		hasDownloadsResults,
		hasAnyResults,
		libraryTracks,
		libraryPlaylists,
		libraryAlbums,
		libraryArtists,
		downloadsTracks,
		exploreTracks,
		exploreAlbums,
		exploreArtists,
		hasFilters,
		filterCount,
		libraryFilterState,
		exploreFilterState,
	} = useUnifiedSearch();

	const {
		isSelectionMode,
		selectedTrackIds,
		selectedCount,
		enterSelectionMode,
		exitSelectionMode,
		toggleTrackSelection,
	} = useSelection();

	const currentTracks = selectionSource === 'library' ? libraryTracks : exploreTracks;
	const selectedTracks = useMemo(
		() => currentTracks.filter((t) => selectedTrackIds.has(t.id.value)),
		[currentTracks, selectedTrackIds]
	);

	const {
		handleBatchAddToQueue,
		handleBatchToggleFavorites,
		handleBatchRemoveFromLibrary,
		handleBatchAddToLibrary,
		handleBatchDownload,
		handleOpenPlaylistPicker,
		handleClosePlaylistPicker,
		handleSelectPlaylist,
		isPlaylistPickerOpen,
		isDownloading,
		isDeleting,
	} = useBatchHandlers({ selectedTracks, selectedTrackIds, exitSelectionMode });

	const handleLibraryLongPress = useCallback(
		(track: Track) => {
			setSelectionSource('library');
			enterSelectionMode(track.id.value);
		},
		[enterSelectionMode]
	);

	const handleLibrarySelectionToggle = useCallback(
		(track: Track) => {
			toggleTrackSelection(track.id.value);
		},
		[toggleTrackSelection]
	);

	const handleExploreLongPress = useCallback(
		(track: Track) => {
			setSelectionSource('explore');
			enterSelectionMode(track.id.value);
		},
		[enterSelectionMode]
	);

	const handleExploreSelectionToggle = useCallback(
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
	}, []);

	const showCuratedContent = !hasQuery;
	const showLoading = hasQuery && isSearching && !hasAnyResults;
	const showNoResults = hasQuery && !hasAnyResults && !isSearching;
	const showResults = hasQuery && hasAnyResults;

	const sectionOrder = useMemo(() => {
		const sections = [
			{ key: 'library' as const, hasResults: hasLibraryResults },
			{ key: 'downloads' as const, hasResults: hasDownloadsResults },
			{ key: 'plugins' as const, hasResults: hasExploreResults || isSearching },
		];
		return sections.sort((a, b) => Number(b.hasResults) - Number(a.hasResults));
	}, [hasLibraryResults, hasDownloadsResults, hasExploreResults, isSearching]);

	return (
		<PageLayout
			header={{
				icon: SearchIcon,
				title: 'Search',
				showBorder: false,
			}}
		>
			<View style={styles.searchContainer}>
				<View
					style={[
						styles.searchInputWrapper,
						{ backgroundColor: colors.surfaceContainerHigh },
					]}
				>
					<Icon
						as={SearchIcon}
						size={20}
						color={colors.onSurfaceVariant}
						style={styles.searchIcon}
					/>
					<TextInput
						ref={searchInputRef}
						value={query}
						onChangeText={search}
						style={[styles.searchInput, { color: colors.onSurface }]}
						placeholderTextColor={colors.onSurfaceVariant}
						placeholder="Search songs, artists, albums..."
						autoCapitalize="none"
						autoCorrect={false}
						returnKeyType="search"
						textAlignVertical="center"
					/>
					{query.length > 0 && (
						<Pressable onPress={clearSearch} hitSlop={8} style={styles.clearButton}>
							<Icon as={XIcon} size={18} color={colors.onSurfaceVariant} />
						</Pressable>
					)}
				</View>
			</View>

			{showLoading && (
				<View style={styles.loadingContainer}>
					<TrackListSkeleton count={8} />
				</View>
			)}

			<PlayerAwareScrollView
				contentContainerStyle={[
					styles.scrollContent,
					{
						paddingBottom: isSelectionMode
							? BATCH_ACTION_BAR_PADDING
							: DEFAULT_CONTENT_PADDING,
					},
				]}
			>
				{showCuratedContent && (
					<>
						{!hasCuratedContent && (
							<View style={styles.emptyContainer}>
								<EmptyState
									icon={SearchIcon}
									title="Search for music"
									description="Find songs, artists, and albums from your library and YouTube Music"
								/>
							</View>
						)}

						{hasCuratedContent && (
							<>
								<CuratedSection
									id="recently-played"
									title="Recently Played"
									icon={ClockIcon}
									tracks={recentlyPlayed}
								/>

								<CuratedSection
									id="favorites"
									title="Favorites"
									icon={HeartIcon}
									tracks={favoriteTracks}
								/>

								{recentlyAdded.length > 0 && (
									<CuratedSection
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

				{showNoResults && (
					<View style={styles.emptyContainer}>
						{error ? (
							<EmptyState
								icon={AlertCircleIcon}
								title="Something went wrong"
								description={error}
							/>
						) : (
							<EmptyState
								icon={SearchXIcon}
								title="No results found"
								description={
									hasFilters
										? 'Try adjusting your filters or search term'
										: `No matches for "${query}"`
								}
							/>
						)}
					</View>
				)}

				{showResults && (
					<View style={styles.resultsContainer}>
						{sectionOrder.map(({ key }) => {
							switch (key) {
								case 'library':
									return (
										<ResultGroup
											key={key}
											title="Your Library"
											icon={LibraryBigIcon}
											isEmpty={!hasLibraryResults}
											emptyState={
												<EmptyState
													icon={MusicIcon}
													title="No library matches"
													description={`"${query}" not found in your library`}
												/>
											}
										>
											<LibraryResults
												tracks={libraryTracks.slice(
													0,
													MAX_RESULTS_PER_SECTION
												)}
												playlists={libraryPlaylists.slice(
													0,
													MAX_RESULTS_PER_SECTION
												)}
												albums={libraryAlbums.slice(
													0,
													MAX_RESULTS_PER_SECTION
												)}
												artists={libraryArtists.slice(
													0,
													MAX_RESULTS_PER_SECTION
												)}
												isSelectionMode={
													isSelectionMode && selectionSource === 'library'
												}
												selectedTrackIds={selectedTrackIds}
												onLongPress={handleLibraryLongPress}
												onSelectionToggle={handleLibrarySelectionToggle}
											/>
										</ResultGroup>
									);
								case 'downloads':
									return (
										<ResultGroup
											key={key}
											title="Downloads"
											icon={DownloadIcon}
											isEmpty={!hasDownloadsResults}
											emptyState={
												<EmptyState
													icon={DownloadIcon}
													title="No download matches"
													description={`"${query}" not found in downloads`}
												/>
											}
										>
											<View style={styles.sectionContent}>
												{downloadsTracks
													.slice(0, MAX_RESULTS_PER_SECTION)
													.map((track, index) => (
														<SelectableTrackListItem
															key={track.id.value}
															track={track}
															source="library"
															isSelectionMode={
																isSelectionMode &&
																selectionSource === 'library'
															}
															isSelected={selectedTrackIds.has(
																track.id.value
															)}
															onLongPress={handleLibraryLongPress}
															onSelectionToggle={
																handleLibrarySelectionToggle
															}
															queue={downloadsTracks}
															queueIndex={index}
														/>
													))}
											</View>
										</ResultGroup>
									);
								case 'plugins':
									return (
										<ResultGroup
											key={key}
											title="Plugins"
											icon={PlugIcon}
											isEmpty={!hasExploreResults && !isSearching}
											emptyState={
												<EmptyState
													icon={SearchXIcon}
													title="No plugin results"
													description="Try a different search term"
												/>
											}
										>
											{isSearching && !hasExploreResults ? (
												<View style={{ paddingHorizontal: 16 }}>
													<TrackListSkeleton count={3} />
												</View>
											) : (
												<ExploreResults
													tracks={exploreTracks.slice(
														0,
														MAX_RESULTS_PER_SECTION
													)}
													albums={exploreAlbums.slice(
														0,
														MAX_RESULTS_PER_SECTION
													)}
													artists={exploreArtists.slice(
														0,
														MAX_RESULTS_PER_SECTION
													)}
													isSelectionMode={
														isSelectionMode &&
														selectionSource === 'explore'
													}
													selectedTrackIds={selectedTrackIds}
													onLongPress={handleExploreLongPress}
													onSelectionToggle={handleExploreSelectionToggle}
												/>
											)}
										</ResultGroup>
									);
							}
						})}
					</View>
				)}
			</PlayerAwareScrollView>

			{hasQuery && hasAnyResults && !isSelectionMode && (
				<SortFilterFAB filterCount={filterCount} onPress={handleOpenFilterSheet} />
			)}

			<UnifiedFilterSheet
				isOpen={isFilterSheetOpen}
				onClose={handleCloseFilterSheet}
				libraryProps={{
					sortField: libraryFilterState.sortField,
					sortDirection: libraryFilterState.sortDirection,
					activeFilters: libraryFilterState.activeFilters,
					artists: libraryFilterState.artists,
					albums: libraryFilterState.albums,
					onSortFieldChange: libraryFilterState.setSortField,
					onToggleSortDirection: libraryFilterState.toggleSortDirection,
					onToggleArtist: libraryFilterState.toggleArtistFilter,
					onToggleAlbum: libraryFilterState.toggleAlbumFilter,
					onToggleFavorites: libraryFilterState.toggleFavoritesOnly,
					onToggleDownloaded: libraryFilterState.toggleDownloadedOnly,
					onClearAll: libraryFilterState.clearAll,
				}}
				exploreProps={{
					sortField: exploreFilterState.sortField,
					sortDirection: exploreFilterState.sortDirection,
					activeFilters: exploreFilterState.activeFilters,
					artists: exploreFilterState.artists,
					albums: exploreFilterState.albums,
					onSortFieldChange: exploreFilterState.setSortField,
					onToggleSortDirection: exploreFilterState.toggleSortDirection,
					onContentTypeChange: exploreFilterState.setContentType,
					onToggleArtist: exploreFilterState.toggleArtistFilter,
					onToggleAlbum: exploreFilterState.toggleAlbumFilter,
					onToggleFavorites: exploreFilterState.toggleFavoritesOnly,
					onClearAll: exploreFilterState.clearAll,
				}}
			/>

			{selectionSource === 'library' ? (
				<BatchActionBar
					context="library"
					selectedCount={selectedCount}
					onCancel={exitSelectionMode}
					onAddToQueue={handleBatchAddToQueue}
					onAddToPlaylist={handleOpenPlaylistPicker}
					onToggleFavorites={handleBatchToggleFavorites}
					onRemoveFromLibrary={handleBatchRemoveFromLibrary}
					isProcessing={isDeleting}
				/>
			) : (
				<BatchActionBar
					context="explore"
					selectedCount={selectedCount}
					onDownload={handleBatchDownload}
					onAddToLibrary={handleBatchAddToLibrary}
					onAddToQueue={handleBatchAddToQueue}
					onAddToPlaylist={handleOpenPlaylistPicker}
					onCancel={exitSelectionMode}
					isProcessing={isDownloading}
				/>
			)}

			<BatchPlaylistPicker
				isOpen={isPlaylistPickerOpen}
				onClose={handleClosePlaylistPicker}
				onSelectPlaylist={handleSelectPlaylist}
				selectedCount={selectedCount}
			/>
		</PageLayout>
	);
}

const styles = StyleSheet.create({
	searchContainer: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 8,
	},
	searchInputWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		height: 48,
		paddingHorizontal: 16,
		borderRadius: 28,
	},
	searchIcon: {
		marginRight: 8,
	},
	searchInput: {
		flex: 1,
		height: 48,
		fontSize: 16,
		fontFamily: FontFamily.regular,
		includeFontPadding: false,
	},
	clearButton: {
		padding: 4,
		marginLeft: 4,
	},
	loadingContainer: {
		flex: 1,
		paddingHorizontal: 16,
		paddingTop: 24,
	},
	scrollContent: {
		gap: 24,
		paddingVertical: 24,
	},
	emptyContainer: {
		paddingHorizontal: 16,
		paddingTop: 32,
	},
	resultsContainer: {
		gap: 32,
		paddingBottom: 84,
	},
	sectionContent: {
		paddingHorizontal: 16,
		gap: 4,
	},
});
