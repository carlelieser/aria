import { View, StyleSheet } from 'react-native';
import { TabsProvider, Tabs, TabScreen } from 'react-native-paper-tabs';
import { GenericListView } from '@/components/ui/generic-list-view';
import { PageLayout } from '@/components/page-layout';
import { MusicIcon, ListMusicIcon, UsersIcon, DiscIcon, SearchIcon } from 'lucide-react-native';
import { router } from 'expo-router';
import { IconButton } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
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
import { ActiveFiltersBar, LibrarySortFilterSheet } from '@/components/library';
import { useLibraryFilter } from '@/hooks/use-library-filter';
import { useUniqueFilterOptions } from '@/hooks/use-unique-filter-options';
import { useSelection } from '@/hooks/use-selection';
import { useBatchActions } from '@/hooks/use-batch-actions';
import { useAppTheme } from '@/lib/theme';
import type { Track } from '@/src/domain/entities/track';
import type { Playlist } from '@/src/domain/entities/playlist';

type LibraryTabId = 'playlists' | 'albums' | 'artists' | 'songs';

const TAB_INDEX_MAP: Record<LibraryTabId, number> = {
	songs: 0,
	artists: 1,
	albums: 2,
	playlists: 3,
};

const INDEX_TAB_MAP: LibraryTabId[] = ['songs', 'artists', 'albums', 'playlists'];

export default function HomeScreen() {
	const { colors } = useAppTheme();
	const defaultLibraryTab = useDefaultLibraryTab();
	const [tabIndex, setTabIndex] = useState(TAB_INDEX_MAP[defaultLibraryTab]);
	const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
	const [isPlaylistPickerOpen, setIsPlaylistPickerOpen] = useState(false);
	const hasAppliedDefaultRef = useRef(false);

	useEffect(() => {
		if (hasAppliedDefaultRef.current) return;

		if (useSettingsStore.persist.hasHydrated()) {
			hasAppliedDefaultRef.current = true;
			setTabIndex(TAB_INDEX_MAP[defaultLibraryTab]);
			return;
		}

		const unsubscribe = useSettingsStore.persist.onFinishHydration(() => {
			hasAppliedDefaultRef.current = true;
			const storedTab = useSettingsStore.getState().defaultLibraryTab;
			setTabIndex(TAB_INDEX_MAP[storedTab]);
		});

		return unsubscribe;
	}, [defaultLibraryTab]);

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
		toggleArtistFilter,
		toggleAlbumFilter,
		toggleFavoritesOnly,
		toggleDownloadedOnly,
		clearFilters,
		clearAll,
	} = useLibraryFilter();

	const { artists: filterArtists, albums: filterAlbums } = useUniqueFilterOptions(allTracks);

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

	const currentTab = INDEX_TAB_MAP[tabIndex];
	const isSongsTab = currentTab === 'songs';
	const showActiveFilters = isSongsTab && hasFilters;

	const handleSearch = useCallback(() => {
		router.push('/search');
	}, []);

	const headerRightActions = (
		<IconButton
			icon={() => <Icon as={SearchIcon} size={22} color={colors.onSurfaceVariant} />}
			onPress={handleSearch}
		/>
	);

	return (
		<PageLayout
			header={{
				icon: MusicIcon,
				title: 'Library',
				showBorder: false,
				rightActions: headerRightActions,
			}}
		>
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
				<TabsProvider defaultIndex={tabIndex} onChangeIndex={setTabIndex}>
					<Tabs
						uppercase={false}
						mode="scrollable"
						showLeadingSpace={false}
						style={{ backgroundColor: colors.surface }}
					>
						<TabScreen label="Songs" icon="music-note">
							<View style={styles.tabContent}>
								<SongsList
									tracks={filteredTracks}
									isLoading={isLoading}
									hasFilters={hasFilters}
									isSelectionMode={isSelectionMode}
									selectedTrackIds={selectedTrackIds}
									onLongPress={handleLongPress}
									onSelectionToggle={handleSelectionToggle}
								/>
							</View>
						</TabScreen>
						<TabScreen label="Artists" icon="account-music">
							<View style={styles.tabContent}>
								<ArtistsList artists={artists} isLoading={isLoading} />
							</View>
						</TabScreen>
						<TabScreen label="Albums" icon="album">
							<View style={styles.tabContent}>
								<AlbumsList albums={albums} isLoading={isLoading} />
							</View>
						</TabScreen>
						<TabScreen label="Playlists" icon="playlist-music">
							<View style={styles.tabContent}>
								<PlaylistsList playlists={playlists} isLoading={isLoading} />
							</View>
						</TabScreen>
					</Tabs>
				</TabsProvider>
			</View>

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
	return (
		<GenericListView
			data={tracks}
			isLoading={isLoading}
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
			loadingSkeleton={<TrackListSkeleton count={8} />}
			emptyState={{
				icon: MusicIcon,
				title: 'No songs yet',
				description: 'Search for music or add local files to build your library',
			}}
			filteredEmptyState={{
				icon: MusicIcon,
				title: 'No matches',
				description: 'Try adjusting your filters',
			}}
			hasFilters={hasFilters}
			extraData={isSelectionMode ? selectedTrackIds : undefined}
		/>
	);
}

function PlaylistsList({ playlists, isLoading }: { playlists: Playlist[]; isLoading: boolean }) {
	return (
		<GenericListView
			data={playlists}
			isLoading={isLoading}
			keyExtractor={(item) => item.id}
			renderItem={({ item }) => <PlaylistListItem playlist={item} />}
			loadingSkeleton={<PlaylistListSkeleton count={6} />}
			emptyState={{
				icon: ListMusicIcon,
				title: 'No playlists yet',
				description: 'Create a playlist to organize your favorite tracks',
			}}
		/>
	);
}

function ArtistsList({ artists, isLoading }: { artists: UniqueArtist[]; isLoading: boolean }) {
	return (
		<GenericListView
			data={artists}
			isLoading={isLoading}
			keyExtractor={(item) => item.id}
			renderItem={({ item }) => (
				<ArtistListItem
					id={item.id}
					name={item.name}
					artworkUrl={item.artworkUrl}
					trackCount={item.trackCount}
				/>
			)}
			loadingSkeleton={<ArtistListSkeleton count={6} />}
			emptyState={{
				icon: UsersIcon,
				title: 'No artists yet',
				description: 'Add some music to see your favorite artists here',
			}}
		/>
	);
}

function AlbumsList({ albums, isLoading }: { albums: UniqueAlbum[]; isLoading: boolean }) {
	return (
		<GenericListView
			data={albums}
			isLoading={isLoading}
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
			loadingSkeleton={<AlbumListSkeleton count={6} />}
			emptyState={{
				icon: DiscIcon,
				title: 'No albums yet',
				description: 'Add some music to see your albums here',
			}}
		/>
	);
}

const styles = StyleSheet.create({
	filtersBar: {
		marginBottom: 8,
	},
	content: {
		flex: 1,
	},
	tabContent: {
		flex: 1,
		paddingHorizontal: 16,
	},
});
