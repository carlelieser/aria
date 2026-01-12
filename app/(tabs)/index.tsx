import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SegmentedButtons, IconButton } from 'react-native-paper';
import { PageLayout } from '@/components/page-layout';
import { EmptyState } from '@/components/empty-state';
import { MusicIcon, ListMusicIcon, UsersIcon, DiscIcon, SearchIcon } from 'lucide-react-native';
import { router } from 'expo-router';
import { Icon } from '@/components/ui/icon';
import { useAppTheme } from '@/lib/theme';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
	usePlaylists,
	useIsLibraryLoading,
	type UniqueArtist,
	type UniqueAlbum,
} from '@/src/application/state/library-store';
import { useDefaultLibraryTab, useSettingsStore } from '@/src/application/state/settings-store';
import {
	useAggregatedTracks,
	useAggregatedArtists,
	useAggregatedAlbums,
} from '@/hooks/use-aggregated-library';
import { SelectableTrackListItem } from '@/components/selectable-track-list-item';
import { AlbumListItem } from '@/components/album-list-item';
import { ArtistListItem } from '@/components/artist-list-item';
import { PlaylistListItem } from '@/components/media-list';
import { BatchActionBar } from '@/components/batch-action-bar';
import { BatchPlaylistPicker } from '@/components/batch-playlist-picker';
import {
	TrackListSkeleton,
	PlaylistListSkeleton,
	ArtistListSkeleton,
	AlbumListSkeleton,
} from '@/components/skeletons';
import { ActiveFiltersBar, SortFilterFAB, LibrarySortFilterSheet } from '@/components/library';
import { useLibraryFilter } from '@/hooks/use-library-filter';
import { useUniqueFilterOptions } from '@/hooks/use-unique-filter-options';
import { useSelection } from '@/hooks/use-selection';
import { useBatchActions } from '@/hooks/use-batch-actions';
import type { Track } from '@/src/domain/entities/track';
import type { Playlist } from '@/src/domain/entities/playlist';

type ChipType = 'playlists' | 'albums' | 'artists' | 'songs';

export default function HomeScreen() {
	const defaultLibraryTab = useDefaultLibraryTab();
	const [selected, setSelected] = useState<ChipType>(defaultLibraryTab);
	const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
	const [isPlaylistPickerOpen, setIsPlaylistPickerOpen] = useState(false);
	const hasAppliedDefaultRef = useRef(false);

	// Sync with persisted default after store hydration
	useEffect(() => {
		if (hasAppliedDefaultRef.current) return;

		if (useSettingsStore.persist.hasHydrated()) {
			hasAppliedDefaultRef.current = true;
			setSelected(defaultLibraryTab);
			return;
		}

		const unsubscribe = useSettingsStore.persist.onFinishHydration(() => {
			hasAppliedDefaultRef.current = true;
			setSelected(useSettingsStore.getState().defaultLibraryTab);
		});

		return unsubscribe;
	}, [defaultLibraryTab]);

	const { colors } = useAppTheme();
	const allTracks = useAggregatedTracks();
	const playlists = usePlaylists();
	const artists = useAggregatedArtists();
	const albums = useAggregatedAlbums();
	const isLoading = useIsLibraryLoading();

	const {
		tracks: filteredTracks,
		sortField,
		sortDirection,
		setSortField,
		toggleSortDirection,
		activeFilters,
		hasFilters,
		filterCount,
		toggleArtistFilter,
		toggleAlbumFilter,
		toggleFavoritesOnly,
		toggleDownloadedOnly,
		clearFilters,
		clearAll,
	} = useLibraryFilter();

	const { artists: filterArtists, albums: filterAlbums } = useUniqueFilterOptions(allTracks);

	const handleNavigateToSearch = useCallback(() => {
		router.push('/library/search');
	}, []);

	const {
		isSelectionMode,
		selectedTrackIds,
		selectedCount,
		enterSelectionMode,
		exitSelectionMode,
		toggleTrackSelection,
	} = useSelection();

	const {
		addSelectedToQueue,
		addSelectedToPlaylist,
		removeSelectedFromLibrary,
		toggleSelectedFavorites,
		isDeleting,
	} = useBatchActions();

	const selectedTracks = useMemo(
		() => filteredTracks.filter((t) => selectedTrackIds.has(t.id.value)),
		[filteredTracks, selectedTrackIds]
	);

	const handleOpenFilterSheet = useCallback(() => {
		setIsFilterSheetOpen(true);
	}, []);

	const handleCloseFilterSheet = useCallback(() => {
		setIsFilterSheetOpen(false);
	}, []);

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

	const isSongsTab = selected === 'songs';
	const showActiveFilters = isSongsTab && hasFilters;

	const segmentedButtons = [
		{ value: 'playlists', label: 'Playlists', icon: 'playlist-music' },
		{ value: 'albums', label: 'Albums', icon: 'album' },
		{ value: 'artists', label: 'Artists', icon: 'account-music' },
		{ value: 'songs', label: 'Songs', icon: 'music-note' },
	];

	const searchButton = (
		<IconButton
			icon={() => <Icon as={SearchIcon} size={24} color={colors.onSurface} />}
			onPress={handleNavigateToSearch}
		/>
	);

	return (
		<PageLayout
			header={{
				icon: MusicIcon,
				title: 'Library',
				showBorder: false,
				rightActions: searchButton,
			}}
		>
			<View style={styles.tabsRow}>
				<SegmentedButtons
					value={selected}
					onValueChange={(value) => setSelected(value as ChipType)}
					buttons={segmentedButtons}
				/>
			</View>

			{showActiveFilters && (
				<View style={styles.filtersBar}>
					<ActiveFiltersBar
						activeFilters={activeFilters}
						artists={filterArtists}
						albums={filterAlbums}
						onToggleArtist={toggleArtistFilter}
						onToggleAlbum={toggleAlbumFilter}
						onToggleFavorites={toggleFavoritesOnly}
						onToggleDownloaded={toggleDownloadedOnly}
						onClearAll={clearFilters}
					/>
				</View>
			)}

			<View style={styles.content}>
				{selected === 'songs' && (
					<SongsList
						tracks={filteredTracks}
						isLoading={isLoading}
						hasFilters={hasFilters}
						isSelectionMode={isSelectionMode}
						selectedTrackIds={selectedTrackIds}
						onLongPress={handleLongPress}
						onSelectionToggle={handleSelectionToggle}
					/>
				)}
				{selected === 'playlists' && (
					<PlaylistsList playlists={playlists} isLoading={isLoading} />
				)}
				{selected === 'albums' && <AlbumsList albums={albums} isLoading={isLoading} />}
				{selected === 'artists' && <ArtistsList artists={artists} isLoading={isLoading} />}
			</View>

			{isSongsTab && !isSelectionMode && (
				<SortFilterFAB filterCount={filterCount} onPress={handleOpenFilterSheet} />
			)}

			<LibrarySortFilterSheet
				isOpen={isFilterSheetOpen}
				onClose={handleCloseFilterSheet}
				sortField={sortField}
				sortDirection={sortDirection}
				activeFilters={activeFilters}
				artists={filterArtists}
				albums={filterAlbums}
				onSortFieldChange={setSortField}
				onToggleSortDirection={toggleSortDirection}
				onToggleArtist={toggleArtistFilter}
				onToggleAlbum={toggleAlbumFilter}
				onToggleFavorites={toggleFavoritesOnly}
				onToggleDownloaded={toggleDownloadedOnly}
				onClearAll={clearAll}
			/>

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

			<BatchPlaylistPicker
				isOpen={isPlaylistPickerOpen}
				onClose={handleClosePlaylistPicker}
				onSelectPlaylist={handleSelectPlaylist}
				selectedCount={selectedCount}
			/>
		</PageLayout>
	);
}

interface SongsListProps {
	tracks: Track[];
	isLoading: boolean;
	hasFilters: boolean;
	isSelectionMode: boolean;
	selectedTrackIds: Set<string>;
	onLongPress: (track: Track) => void;
	onSelectionToggle: (track: Track) => void;
}

function SongsList({
	tracks,
	isLoading,
	hasFilters,
	isSelectionMode,
	selectedTrackIds,
	onLongPress,
	onSelectionToggle,
}: SongsListProps) {
	if (isLoading) {
		return <TrackListSkeleton count={8} />;
	}

	if (tracks.length === 0) {
		if (hasFilters) {
			return (
				<EmptyState
					icon={MusicIcon}
					title="No matches"
					description="Try adjusting your filters"
				/>
			);
		}
		return (
			<EmptyState
				icon={MusicIcon}
				title="No songs yet"
				description="Search for music or add local files to build your library"
			/>
		);
	}

	return (
		<FlashList
			data={tracks}
			keyExtractor={(item) => item.id.value}
			renderItem={({ item, index }) => (
				<SelectableTrackListItem
					track={item}
					source="library"
					isSelectionMode={isSelectionMode}
					isSelected={selectedTrackIds.has(item.id.value)}
					onLongPress={onLongPress}
					onSelectionToggle={onSelectionToggle}
					queue={tracks}
					queueIndex={index}
				/>
			)}
			showsVerticalScrollIndicator={false}
			extraData={isSelectionMode ? selectedTrackIds : undefined}
		/>
	);
}

function PlaylistsList({ playlists, isLoading }: { playlists: Playlist[]; isLoading: boolean }) {
	if (isLoading) {
		return <PlaylistListSkeleton count={6} />;
	}

	if (playlists.length === 0) {
		return (
			<EmptyState
				icon={ListMusicIcon}
				title="No playlists yet"
				description="Create a playlist to organize your favorite tracks"
			/>
		);
	}

	return (
		<FlashList
			data={playlists}
			keyExtractor={(item) => item.id}
			renderItem={({ item }) => <PlaylistListItem playlist={item} />}
			showsVerticalScrollIndicator={false}
		/>
	);
}

function ArtistsList({ artists, isLoading }: { artists: UniqueArtist[]; isLoading: boolean }) {
	if (isLoading) {
		return <ArtistListSkeleton count={6} />;
	}

	if (artists.length === 0) {
		return (
			<EmptyState
				icon={UsersIcon}
				title="No artists yet"
				description="Add some music to see your favorite artists here"
			/>
		);
	}

	return (
		<FlashList
			data={artists}
			keyExtractor={(item) => item.id}
			renderItem={({ item }) => (
				<ArtistListItem
					id={item.id}
					name={item.name}
					artworkUrl={item.artworkUrl}
					trackCount={item.trackCount}
				/>
			)}
			showsVerticalScrollIndicator={false}
		/>
	);
}

function AlbumsList({ albums, isLoading }: { albums: UniqueAlbum[]; isLoading: boolean }) {
	if (isLoading) {
		return <AlbumListSkeleton count={6} />;
	}

	if (albums.length === 0) {
		return (
			<EmptyState
				icon={DiscIcon}
				title="No albums yet"
				description="Add some music to see your albums here"
			/>
		);
	}

	return (
		<FlashList
			data={albums}
			keyExtractor={(item) => item.id}
			renderItem={({ item }) => (
				<AlbumListItem
					id={item.id}
					name={item.name}
					artistName={item.artistName}
					artworkUrl={item.artworkUrl}
					trackCount={item.trackCount}
				/>
			)}
			showsVerticalScrollIndicator={false}
		/>
	);
}

const styles = StyleSheet.create({
	tabsRow: {
		paddingHorizontal: 16,
		marginBottom: 8,
		marginTop: 8,
	},
	filtersBar: {
		marginBottom: 8,
	},
	content: {
		flex: 1,
		paddingHorizontal: 16,
	},
});
