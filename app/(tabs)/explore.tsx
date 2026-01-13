import { useCallback, useMemo, memo, useState } from 'react';
import { ScrollView, View, StyleSheet, TextInput } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { PageLayout } from '@/components/page-layout';
import {
	SearchXIcon,
	HeartIcon,
	ClockIcon,
	SparklesIcon,
	CompassIcon,
	AlertCircleIcon,
} from 'lucide-react-native';
import { TrackCard } from '@/components/track-card';
import { SelectableTrackListItem } from '@/components/selectable-track-list-item';
import { AlbumListItem } from '@/components/album-list-item';
import { ArtistListItem } from '@/components/artist-list-item';
import { BatchActionBar } from '@/components/batch-action-bar';
import { BatchPlaylistPicker } from '@/components/batch-playlist-picker';
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

const BATCH_ACTION_BAR_PADDING = 120;
const DEFAULT_CONTENT_PADDING = 20;

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
	const [isPlaylistPickerOpen, setIsPlaylistPickerOpen] = useState(false);

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

	const {
		downloadSelected,
		addSelectedToLibrary,
		addSelectedToQueue,
		addSelectedToPlaylist,
		isDownloading,
	} = useBatchActions();

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

	const handleOpenPlaylistPicker = useCallback(() => {
		setIsPlaylistPickerOpen(true);
	}, []);

	const handleClosePlaylistPicker = useCallback(() => {
		setIsPlaylistPickerOpen(false);
	}, []);

	const handleSelectPlaylist = useCallback(
		(playlistId: string) => {
			const selectedTracks = filteredTracks.filter((t) => selectedTrackIds.has(t.id.value));
			addSelectedToPlaylist(playlistId, selectedTracks);
			setIsPlaylistPickerOpen(false);
			exitSelectionMode();
		},
		[filteredTracks, selectedTrackIds, addSelectedToPlaylist, exitSelectionMode]
	);

	return (
		<PageLayout
			header={{
				icon: CompassIcon,
				title: 'Explore',
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
					<TextInput
						value={query}
						onChangeText={search}
						style={[styles.searchInput, { color: colors.onSurface }]}
						placeholderTextColor={colors.onSurfaceVariant}
						placeholder="Search songs, artists, albums..."
						autoFocus={false}
					/>
				</View>
			</View>
			{!isExploreMode && isSearching && (
				<View style={styles.loadingContainer}>
					<TrackListSkeleton count={10} />
				</View>
			)}

			<ScrollView
				contentContainerStyle={[
					styles.scrollContent,
					{
						paddingBottom: isSelectionMode
							? BATCH_ACTION_BAR_PADDING
							: DEFAULT_CONTENT_PADDING,
					},
				]}
			>
				{!isExploreMode && !isSearching && (
					<View style={styles.searchResults}>
						{error && (
							<EmptyState
								icon={AlertCircleIcon}
								title="Something went wrong"
								description={error}
							/>
						)}

						{!error && !hasSearchResults && (
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

						{!error && hasSearchResults && (
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
									<AlbumListItem key={album.id.value} album={album} />
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
				context="explore"
				selectedCount={selectedCount}
				onDownload={handleBatchDownload}
				onAddToLibrary={handleBatchAddToLibrary}
				onAddToQueue={handleBatchAddToQueue}
				onAddToPlaylist={handleOpenPlaylistPicker}
				onCancel={exitSelectionMode}
				isProcessing={isDownloading}
			/>

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
		paddingHorizontal: 16,
		paddingVertical: 4,
		borderRadius: 28,
	},
	searchInput: {
		flex: 1,
		fontSize: 16,
		paddingVertical: 12,
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
	loadingContainer: {
		flex: 1,
		paddingHorizontal: 16,
		paddingTop: 24,
	},
	searchResults: {
		paddingHorizontal: 16,
	},
	trackList: {
		gap: 8,
	},
	emptyExplore: {
		paddingHorizontal: 16,
		paddingTop: 32,
	},
});
