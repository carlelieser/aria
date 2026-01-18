/**
 * Search Tab Screen
 *
 * Unified search combining library and external plugin results.
 * Shows curated content (recently played, favorites, recently added)
 * when idle, and unified search results when a query is entered.
 */

import { useCallback, useMemo, useState, memo } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Pressable } from 'react-native';
import { PlayerAwareScrollView } from '@/components/ui/player-aware-scroll-view';
import { Text } from 'react-native-paper';
import { PageLayout } from '@/components/page-layout';
import {
	HeartIcon,
	ClockIcon,
	SparklesIcon,
	SearchIcon,
	MusicIcon,
	ListMusicIcon,
	UsersIcon,
	DiscIcon,
	XIcon,
	AlertCircleIcon,
	SearchXIcon,
} from 'lucide-react-native';
import { TrackCard } from '@/components/track-card';
import { SelectableTrackListItem } from '@/components/selectable-track-list-item';
import { AlbumListItem } from '@/components/album-list-item';
import { ArtistListItem } from '@/components/artist-list-item';
import { PlaylistListItem } from '@/components/media-list';
import { Icon } from '@/components/ui/icon';
import { EmptyState } from '@/components/empty-state';
import { TrackListSkeleton } from '@/components/skeletons';
import { ResultGroup, UnifiedFilterSheet } from '@/components/unified-search';
import { SortFilterFAB } from '@/components/library/sort-filter-fab';
import { BatchActionBar } from '@/components/batch-action-bar';
import { BatchPlaylistPicker } from '@/components/batch-playlist-picker';
import { useRecentlyPlayed, useHasHistory } from '@/src/application/state/history-store';
import { getTrackIdString } from '@/src/domain/value-objects/track-id';
import { useFavoriteTracks, useRecentlyAddedTracks } from '@/src/application/state/library-store';
import { useUnifiedSearch } from '@/hooks/use-unified-search';
import { useSelection } from '@/hooks/use-selection';
import { useBatchActions } from '@/hooks/use-batch-actions';
import { useAppTheme } from '@/lib/theme';
import type { Track } from '@/src/domain/entities/track';
import type { Playlist } from '@/src/domain/entities/playlist';
import type { Album } from '@/src/domain/entities/album';
import type { Artist } from '@/src/domain/entities/artist';
import type { UniqueAlbum, UniqueArtist } from '@/src/application/state/library-store';
import type { LucideIcon } from 'lucide-react-native';

const BATCH_ACTION_BAR_PADDING = 120;
const DEFAULT_CONTENT_PADDING = 20;
const MAX_RESULTS_PER_SECTION = 5;

interface CuratedSectionProps {
	readonly id: string;
	readonly title: string;
	readonly icon: LucideIcon;
	readonly tracks: Track[];
}

const CuratedSection = memo(function CuratedSection({ id, title, tracks }: CuratedSectionProps) {
	const { colors } = useAppTheme();

	const titleStyle = useMemo(
		() => ({ color: colors.onSurface, fontWeight: '600' as const }),
		[colors.onSurface]
	);

	if (tracks.length === 0) return null;

	return (
		<View style={styles.curatedSection}>
			<View style={styles.curatedSectionHeader}>
				<Text variant="labelLarge" style={titleStyle}>
					{title}
				</Text>
			</View>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				style={styles.horizontalScrollView}
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

interface ResultSectionProps {
	readonly title: string;
	readonly icon: LucideIcon;
	readonly children: React.ReactNode;
	readonly maxItems?: number;
}

function ResultSection({ title, icon: IconComponent, children }: ResultSectionProps) {
	const { colors } = useAppTheme();

	return (
		<View style={styles.section}>
			<View style={styles.sectionHeader}>
				<Icon as={IconComponent} size={18} color={colors.primary} />
				<Text variant="titleSmall" style={{ color: colors.onSurface, fontWeight: '600' }}>
					{title}
				</Text>
			</View>
			<View style={styles.sectionContent}>{children}</View>
		</View>
	);
}

export default function SearchScreen() {
	const { colors } = useAppTheme();
	const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
	const [isPlaylistPickerOpen, setIsPlaylistPickerOpen] = useState(false);
	const [selectionSource, setSelectionSource] = useState<'library' | 'explore'>('library');

	// Curated content data
	const recentlyPlayed = useRecentlyPlayed(10);
	const favoriteTracks = useFavoriteTracks();
	const recentlyAdded = useRecentlyAddedTracks(10);
	const hasHistory = useHasHistory();

	const hasCuratedContent = hasHistory || favoriteTracks.length > 0 || recentlyAdded.length > 0;

	// Unified search
	const {
		query,
		hasQuery,
		search,
		clearSearch,
		isSearching,
		error,
		hasLibraryResults,
		hasExploreResults,
		hasAnyResults,
		libraryTracks,
		libraryPlaylists,
		libraryAlbums,
		libraryArtists,
		exploreTracks,
		exploreAlbums,
		exploreArtists,
		hasFilters,
		filterCount,
		libraryFilterState,
		exploreFilterState,
	} = useUnifiedSearch();

	// Selection state
	const {
		isSelectionMode,
		selectedTrackIds,
		selectedCount,
		enterSelectionMode,
		exitSelectionMode,
		toggleTrackSelection,
	} = useSelection();

	// Batch actions
	const {
		downloadSelected,
		addSelectedToLibrary,
		addSelectedToQueue,
		addSelectedToPlaylist,
		removeSelectedFromLibrary,
		toggleSelectedFavorites,
		isDownloading,
		isDeleting,
	} = useBatchActions();

	// Get tracks for batch operations based on selection source
	const currentTracks = selectionSource === 'library' ? libraryTracks : exploreTracks;
	const selectedTracks = useMemo(
		() => currentTracks.filter((t) => selectedTrackIds.has(t.id.value)),
		[currentTracks, selectedTrackIds]
	);

	// Library track handlers
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

	// Explore track handlers
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

	// Batch action handlers
	const handleBatchAddToQueue = useCallback(() => {
		addSelectedToQueue(selectedTracks);
		exitSelectionMode();
	}, [selectedTracks, addSelectedToQueue, exitSelectionMode]);

	const handleBatchToggleFavorites = useCallback(() => {
		const trackIds = Array.from(selectedTrackIds);
		toggleSelectedFavorites(trackIds);
		exitSelectionMode();
	}, [selectedTrackIds, toggleSelectedFavorites, exitSelectionMode]);

	const handleBatchRemoveFromLibrary = useCallback(() => {
		const trackIds = Array.from(selectedTrackIds);
		removeSelectedFromLibrary(trackIds);
		exitSelectionMode();
	}, [selectedTrackIds, removeSelectedFromLibrary, exitSelectionMode]);

	const handleBatchDownload = useCallback(async () => {
		await downloadSelected(selectedTracks);
		exitSelectionMode();
	}, [selectedTracks, downloadSelected, exitSelectionMode]);

	const handleBatchAddToLibrary = useCallback(() => {
		addSelectedToLibrary(selectedTracks);
		exitSelectionMode();
	}, [selectedTracks, addSelectedToLibrary, exitSelectionMode]);

	const handleOpenPlaylistPicker = useCallback(() => {
		setIsPlaylistPickerOpen(true);
	}, []);

	const handleClosePlaylistPicker = useCallback(() => {
		setIsPlaylistPickerOpen(false);
	}, []);

	const handleSelectPlaylist = useCallback(
		(playlistId: string) => {
			addSelectedToPlaylist(playlistId, selectedTracks);
			setIsPlaylistPickerOpen(false);
			exitSelectionMode();
		},
		[selectedTracks, addSelectedToPlaylist, exitSelectionMode]
	);

	// Display states
	const showCuratedContent = !hasQuery;
	const showLoading = hasQuery && isSearching && !hasAnyResults;
	const showNoResults = hasQuery && !hasAnyResults && !isSearching;
	const showResults = hasQuery && hasAnyResults;

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
						value={query}
						onChangeText={search}
						style={[styles.searchInput, { color: colors.onSurface }]}
						placeholderTextColor={colors.onSurfaceVariant}
						placeholder="Search songs, artists, albums..."
						autoCapitalize="none"
						autoCorrect={false}
						returnKeyType="search"
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
						<ResultGroup
							title="Your Library"
							isEmpty={!hasLibraryResults}
							emptyState={
								<EmptyState
									icon={MusicIcon}
									title="No library matches"
									description={`"${query}" not found in your library`}
									compact
								/>
							}
						>
							<LibraryResults
								tracks={libraryTracks.slice(0, MAX_RESULTS_PER_SECTION)}
								playlists={libraryPlaylists.slice(0, MAX_RESULTS_PER_SECTION)}
								albums={libraryAlbums.slice(0, MAX_RESULTS_PER_SECTION)}
								artists={libraryArtists.slice(0, MAX_RESULTS_PER_SECTION)}
								isSelectionMode={isSelectionMode && selectionSource === 'library'}
								selectedTrackIds={selectedTrackIds}
								onLongPress={handleLibraryLongPress}
								onSelectionToggle={handleLibrarySelectionToggle}
							/>
						</ResultGroup>

						<ResultGroup
							title="From YouTube Music"
							isEmpty={!hasExploreResults && !isSearching}
							emptyState={
								<EmptyState
									icon={SearchXIcon}
									title="No external results"
									description="Try a different search term"
									compact
								/>
							}
						>
							{isSearching && !hasExploreResults ? (
								<TrackListSkeleton count={3} />
							) : (
								<ExploreResults
									tracks={exploreTracks.slice(0, MAX_RESULTS_PER_SECTION)}
									albums={exploreAlbums.slice(0, MAX_RESULTS_PER_SECTION)}
									artists={exploreArtists.slice(0, MAX_RESULTS_PER_SECTION)}
									isSelectionMode={
										isSelectionMode && selectionSource === 'explore'
									}
									selectedTrackIds={selectedTrackIds}
									onLongPress={handleExploreLongPress}
									onSelectionToggle={handleExploreSelectionToggle}
								/>
							)}
						</ResultGroup>
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

interface LibraryResultsProps {
	readonly tracks: Track[];
	readonly playlists: Playlist[];
	readonly albums: UniqueAlbum[];
	readonly artists: UniqueArtist[];
	readonly isSelectionMode: boolean;
	readonly selectedTrackIds: Set<string>;
	readonly onLongPress: (track: Track) => void;
	readonly onSelectionToggle: (track: Track) => void;
}

function LibraryResults({
	tracks,
	playlists,
	albums,
	artists,
	isSelectionMode,
	selectedTrackIds,
	onLongPress,
	onSelectionToggle,
}: LibraryResultsProps) {
	return (
		<>
			{tracks.length > 0 && (
				<ResultSection title="Songs" icon={MusicIcon}>
					{tracks.map((track, index) => (
						<SelectableTrackListItem
							key={track.id.value}
							track={track}
							source="library"
							isSelectionMode={isSelectionMode}
							isSelected={selectedTrackIds.has(track.id.value)}
							onLongPress={onLongPress}
							onSelectionToggle={onSelectionToggle}
							queue={tracks}
							queueIndex={index}
						/>
					))}
				</ResultSection>
			)}

			{playlists.length > 0 && (
				<ResultSection title="Playlists" icon={ListMusicIcon}>
					{playlists.map((playlist) => (
						<PlaylistListItem key={playlist.id} playlist={playlist} />
					))}
				</ResultSection>
			)}

			{albums.length > 0 && (
				<ResultSection title="Albums" icon={DiscIcon}>
					{albums.map((album) => (
						<AlbumListItem
							key={album.id}
							id={album.id}
							name={album.name}
							artistName={album.artistName ?? 'Unknown Artist'}
							artworkUrl={album.artworkUrl}
							trackCount={album.trackCount}
						/>
					))}
				</ResultSection>
			)}

			{artists.length > 0 && (
				<ResultSection title="Artists" icon={UsersIcon}>
					{artists.map((artist) => (
						<ArtistListItem
							key={artist.id}
							id={artist.id}
							name={artist.name}
							artworkUrl={artist.artworkUrl}
							trackCount={artist.trackCount}
						/>
					))}
				</ResultSection>
			)}
		</>
	);
}

interface ExploreResultsProps {
	readonly tracks: Track[];
	readonly albums: Album[];
	readonly artists: Artist[];
	readonly isSelectionMode: boolean;
	readonly selectedTrackIds: Set<string>;
	readonly onLongPress: (track: Track) => void;
	readonly onSelectionToggle: (track: Track) => void;
}

function ExploreResults({
	tracks,
	albums,
	artists,
	isSelectionMode,
	selectedTrackIds,
	onLongPress,
	onSelectionToggle,
}: ExploreResultsProps) {
	return (
		<>
			{tracks.length > 0 && (
				<ResultSection title="Songs" icon={MusicIcon}>
					{tracks.map((track, index) => (
						<SelectableTrackListItem
							key={track.id.value}
							track={track}
							source="search"
							isSelectionMode={isSelectionMode}
							isSelected={selectedTrackIds.has(track.id.value)}
							onLongPress={onLongPress}
							onSelectionToggle={onSelectionToggle}
							queue={tracks}
							queueIndex={index}
						/>
					))}
				</ResultSection>
			)}

			{albums.length > 0 && (
				<ResultSection title="Albums" icon={DiscIcon}>
					{albums.map((album) => (
						<AlbumListItem key={album.id.value} album={album} />
					))}
				</ResultSection>
			)}

			{artists.length > 0 && (
				<ResultSection title="Artists" icon={UsersIcon}>
					{artists.map((artist) => (
						<ArtistListItem key={artist.id} artist={artist} />
					))}
				</ResultSection>
			)}
		</>
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
		paddingHorizontal: 16,
		paddingVertical: 4,
		borderRadius: 28,
	},
	searchIcon: {
		marginRight: 8,
	},
	searchInput: {
		flex: 1,
		fontSize: 16,
		paddingVertical: 12,
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
	},
	curatedSection: {
		gap: 12,
	},
	curatedSectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
	},
	horizontalScrollView: {
		borderRadius: 12,
		overflow: 'hidden',
	},
	horizontalScroll: {
		gap: 16,
		paddingHorizontal: 16,
	},
	section: {
		gap: 8,
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 16,
	},
	sectionContent: {
		paddingHorizontal: 16,
		gap: 4,
	},
});
