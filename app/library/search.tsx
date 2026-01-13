import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View, StyleSheet, TextInput } from 'react-native';
import { Text } from 'react-native-paper';
import { PageLayout } from '@/components/page-layout';
import { Icon } from '@/components/ui/icon';
import { SearchIcon, MusicIcon, ListMusicIcon, UsersIcon, DiscIcon } from 'lucide-react-native';
import { usePlaylists } from '@/src/application/state/library-store';
import {
	useAggregatedTracks,
	useAggregatedArtists,
	useAggregatedAlbums,
} from '@/hooks/use-aggregated-library';
import { SelectableTrackListItem } from '@/components/selectable-track-list-item';
import { AlbumListItem } from '@/components/album-list-item';
import { ArtistListItem } from '@/components/artist-list-item';
import { PlaylistListItem } from '@/components/media-list';
import { EmptyState } from '@/components/empty-state';
import { useAppTheme } from '@/lib/theme';
import { useSelection } from '@/hooks/use-selection';
import { useBatchActions } from '@/hooks/use-batch-actions';
import { BatchActionBar } from '@/components/batch-action-bar';
import { BatchPlaylistPicker } from '@/components/batch-playlist-picker';
import { filterPlaylists, filterAlbums, filterArtists } from '@/src/domain/utils/library-filtering';
import { matchesSearch } from '@/src/domain/utils/track-filtering';
import type { Track } from '@/src/domain/entities/track';

const BATCH_ACTION_BAR_PADDING = 120;
const DEFAULT_CONTENT_PADDING = 20;

export default function LibrarySearchScreen() {
	const { colors } = useAppTheme();
	const [searchQuery, setSearchQuery] = useState('');
	const [isPlaylistPickerOpen, setIsPlaylistPickerOpen] = useState(false);

	const allTracks = useAggregatedTracks();
	const allPlaylists = usePlaylists();
	const allAlbums = useAggregatedAlbums();
	const allArtists = useAggregatedArtists();

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

	const query = searchQuery.trim().toLowerCase();
	const hasQuery = query.length > 0;

	const filteredTracks = useMemo(() => {
		if (!hasQuery) return [];
		return allTracks.filter((track) => matchesSearch(track, query));
	}, [allTracks, query, hasQuery]);

	const filteredPlaylists = useMemo(() => {
		if (!hasQuery) return [];
		return filterPlaylists(allPlaylists, query);
	}, [allPlaylists, query, hasQuery]);

	const filteredAlbums = useMemo(() => {
		if (!hasQuery) return [];
		return filterAlbums(allAlbums, query);
	}, [allAlbums, query, hasQuery]);

	const filteredArtists = useMemo(() => {
		if (!hasQuery) return [];
		return filterArtists(allArtists, query);
	}, [allArtists, query, hasQuery]);

	const selectedTracks = useMemo(
		() => filteredTracks.filter((t) => selectedTrackIds.has(t.id.value)),
		[filteredTracks, selectedTrackIds]
	);

	const hasResults =
		filteredTracks.length > 0 ||
		filteredPlaylists.length > 0 ||
		filteredAlbums.length > 0 ||
		filteredArtists.length > 0;

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

	return (
		<PageLayout
			header={{
				title: 'Search Library',
				showBack: true,
				showBorder: false,
			}}
		>
			<View style={styles.searchContainer}>
				<View
					style={[
						styles.searchInputWrapper,
						{ backgroundColor: colors.secondaryContainer },
					]}
				>
					<TextInput
						value={searchQuery}
						onChangeText={setSearchQuery}
						style={[styles.searchInput, { color: colors.onSurface }]}
						placeholderTextColor={colors.onSurfaceVariant}
						placeholder="Search songs, playlists, albums, artists..."
						autoFocus
						autoCapitalize="none"
						autoCorrect={false}
						returnKeyType="search"
					/>
				</View>
			</View>
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
				{!hasQuery && (
					<View style={styles.emptyContainer}>
						<EmptyState
							icon={SearchIcon}
							title="Search your library"
							description="Find songs, playlists, albums, and artists"
						/>
					</View>
				)}

				{hasQuery && !hasResults && (
					<View style={styles.emptyContainer}>
						<EmptyState
							icon={SearchIcon}
							title="No results"
							description="Try a different search term"
						/>
					</View>
				)}

				{hasQuery && hasResults && (
					<View style={styles.resultsContainer}>
						{filteredTracks.length > 0 && (
							<ResultSection title="Songs" icon={MusicIcon}>
								{filteredTracks.map((track, index) => (
									<SelectableTrackListItem
										key={track.id.value}
										track={track}
										source="library"
										isSelectionMode={isSelectionMode}
										isSelected={selectedTrackIds.has(track.id.value)}
										onLongPress={handleLongPress}
										onSelectionToggle={handleSelectionToggle}
										queue={filteredTracks}
										queueIndex={index}
									/>
								))}
							</ResultSection>
						)}

						{filteredPlaylists.length > 0 && (
							<ResultSection title="Playlists" icon={ListMusicIcon}>
								{filteredPlaylists.map((playlist) => (
									<PlaylistListItem key={playlist.id} playlist={playlist} />
								))}
							</ResultSection>
						)}

						{filteredAlbums.length > 0 && (
							<ResultSection title="Albums" icon={DiscIcon}>
								{filteredAlbums.map((album) => (
									<AlbumListItem
										key={album.id}
										id={album.id}
										name={album.name}
										artistName={album.artistName}
										artworkUrl={album.artworkUrl}
										trackCount={album.trackCount}
									/>
								))}
							</ResultSection>
						)}

						{filteredArtists.length > 0 && (
							<ResultSection title="Artists" icon={UsersIcon}>
								{filteredArtists.map((artist) => (
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
					</View>
				)}
			</ScrollView>

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

interface ResultSectionProps {
	title: string;
	icon: typeof MusicIcon;
	children: React.ReactNode;
}

function ResultSection({ title, icon: IconComponent, children }: ResultSectionProps) {
	const { colors } = useAppTheme();

	return (
		<View style={styles.section}>
			<View style={styles.sectionHeader}>
				<Icon as={IconComponent} size={20} color={colors.primary} />
				<Text variant="titleSmall" style={{ color: colors.onSurface, fontWeight: '600' }}>
					{title}
				</Text>
			</View>
			<View style={styles.sectionContent}>{children}</View>
		</View>
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
	emptyContainer: {
		paddingHorizontal: 16,
		paddingTop: 32,
	},
	resultsContainer: {
		gap: 24,
	},
	section: {
		gap: 12,
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
