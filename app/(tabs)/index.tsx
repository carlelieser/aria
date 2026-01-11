/**
 * HomeScreen
 *
 * Main library screen with tabs for songs, playlists, and artists.
 * Uses M3 theming.
 */

import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { Text, SegmentedButtons } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import { PageLayout } from '@/components/page-layout';
import { EmptyState } from '@/components/empty-state';
import { MusicIcon, ListMusicIcon, UsersIcon, DiscIcon } from 'lucide-react-native';
import { useState, useCallback, memo } from 'react';
import { Image } from 'expo-image';
import {
	useTracks,
	usePlaylists,
	useIsLibraryLoading,
	useUniqueArtists,
	useUniqueAlbums,
	type UniqueArtist,
	type UniqueAlbum,
} from '@/src/application/state/library-store';
import { TrackListItem } from '@/components/track-list-item';
import {
	TrackListSkeleton,
	PlaylistListSkeleton,
	ArtistListSkeleton,
	AlbumListSkeleton,
} from '@/components/skeletons';
import { ActiveFiltersBar, SortFilterFAB, LibrarySortFilterSheet } from '@/components/library';
import { useLibraryFilter } from '@/hooks/use-library-filter';
import { useUniqueFilterOptions } from '@/hooks/use-unique-filter-options';
import { useAppTheme } from '@/lib/theme';
import type { Track } from '@/src/domain/entities/track';
import type { Playlist } from '@/src/domain/entities/playlist';

type ChipType = 'playlists' | 'albums' | 'artists' | 'songs';

export default function HomeScreen() {
	const [selected, setSelected] = useState<ChipType>('playlists');
	const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
	const allTracks = useTracks();
	const playlists = usePlaylists();
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

	const artists = useUniqueArtists();
	const albums = useUniqueAlbums();

	const handleOpenFilterSheet = useCallback(() => {
		setIsFilterSheetOpen(true);
	}, []);

	const handleCloseFilterSheet = useCallback(() => {
		setIsFilterSheetOpen(false);
	}, []);

	const isSongsTab = selected === 'songs';
	const showActiveFilters = isSongsTab && hasFilters;

	const segmentedButtons = [
		{ value: 'playlists', label: 'Playlists', icon: 'playlist-music' },
		{ value: 'albums', label: 'Albums', icon: 'album' },
		{ value: 'artists', label: 'Artists', icon: 'account-music' },
		{ value: 'songs', label: 'Songs', icon: 'music-note' },
	];

	return (
		<PageLayout header={{ icon: MusicIcon, title: 'Library', showBorder: false }}>
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
					/>
				)}
				{selected === 'playlists' && (
					<PlaylistsList playlists={playlists} isLoading={isLoading} />
				)}
				{selected === 'albums' && <AlbumsList albums={albums} isLoading={isLoading} />}
				{selected === 'artists' && <ArtistsList artists={artists} isLoading={isLoading} />}
			</View>

			{isSongsTab && (
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
		</PageLayout>
	);
}

function SongsList({
	tracks,
	isLoading,
	hasFilters,
}: {
	tracks: Track[];
	isLoading: boolean;
	hasFilters: boolean;
}) {
	if (isLoading) {
		return <TrackListSkeleton count={8} />;
	}

	if (tracks.length === 0) {
		if (hasFilters) {
			return (
				<EmptyState
					icon={MusicIcon}
					title="No matches"
					description="Try adjusting your search or filters"
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
				<TrackListItem track={item} queue={tracks} queueIndex={index} />
			)}
			showsVerticalScrollIndicator={false}
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
			renderItem={({ item }) => <PlaylistItem playlist={item} />}
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
			renderItem={({ item }) => <ArtistItem artist={item} />}
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
			renderItem={({ item }) => <AlbumItem album={item} />}
			showsVerticalScrollIndicator={false}
		/>
	);
}

const PlaylistItem = memo(function PlaylistItem({ playlist }: { playlist: Playlist }) {
	const { colors } = useAppTheme();
	const trackCount = playlist.tracks.length;
	const artworkUrl = playlist.artwork?.[0]?.url ?? playlist.tracks[0]?.track.artwork?.[0]?.url;

	const handlePress = () => {
		router.push({
			pathname: '/playlist/[id]',
			params: { id: playlist.id },
		});
	};

	return (
		<TouchableOpacity style={styles.listItem} activeOpacity={0.7} onPress={handlePress}>
			{artworkUrl ? (
				<Image
					source={{ uri: artworkUrl }}
					style={styles.playlistArtwork}
					contentFit="cover"
					transition={200}
					cachePolicy="memory-disk"
					recyclingKey={playlist.id}
				/>
			) : (
				<View
					style={[
						styles.playlistArtwork,
						{ backgroundColor: colors.surfaceContainerHighest },
					]}
				>
					<Icon as={ListMusicIcon} color={colors.onSurfaceVariant} />
				</View>
			)}

			<View style={styles.listItemText}>
				<Text variant="bodyLarge" numberOfLines={1} style={{ color: colors.onSurface }}>
					{playlist.name}
				</Text>
				<Text
					variant="bodySmall"
					numberOfLines={1}
					style={{ color: colors.onSurfaceVariant }}
				>
					{trackCount} {trackCount === 1 ? 'track' : 'tracks'}
				</Text>
			</View>
		</TouchableOpacity>
	);
});

const ArtistItem = memo(function ArtistItem({ artist }: { artist: UniqueArtist }) {
	const { colors } = useAppTheme();

	return (
		<TouchableOpacity style={styles.listItem} activeOpacity={0.7}>
			{artist.artworkUrl ? (
				<Image
					source={{ uri: artist.artworkUrl }}
					style={styles.artistArtwork}
					contentFit="cover"
					transition={200}
					cachePolicy="memory-disk"
					recyclingKey={artist.id}
				/>
			) : (
				<View
					style={[
						styles.artistArtwork,
						{ backgroundColor: colors.surfaceContainerHighest },
					]}
				>
					<Icon as={UsersIcon} color={colors.onSurfaceVariant} />
				</View>
			)}

			<View style={styles.listItemText}>
				<Text variant="bodyLarge" numberOfLines={1} style={{ color: colors.onSurface }}>
					{artist.name}
				</Text>
				<Text
					variant="bodySmall"
					numberOfLines={1}
					style={{ color: colors.onSurfaceVariant }}
				>
					{artist.trackCount} {artist.trackCount === 1 ? 'track' : 'tracks'}
				</Text>
			</View>
		</TouchableOpacity>
	);
});

const AlbumItem = memo(function AlbumItem({ album }: { album: UniqueAlbum }) {
	const { colors } = useAppTheme();

	const handlePress = () => {
		router.push({
			pathname: '/album/[id]',
			params: { id: album.id },
		});
	};

	return (
		<TouchableOpacity style={styles.listItem} activeOpacity={0.7} onPress={handlePress}>
			{album.artworkUrl ? (
				<Image
					source={{ uri: album.artworkUrl }}
					style={styles.albumArtwork}
					contentFit="cover"
					transition={200}
					cachePolicy="memory-disk"
					recyclingKey={album.id}
				/>
			) : (
				<View
					style={[
						styles.albumArtwork,
						{ backgroundColor: colors.surfaceContainerHighest },
					]}
				>
					<Icon as={DiscIcon} color={colors.onSurfaceVariant} />
				</View>
			)}

			<View style={styles.listItemText}>
				<Text variant="bodyLarge" numberOfLines={1} style={{ color: colors.onSurface }}>
					{album.name}
				</Text>
				<Text
					variant="bodySmall"
					numberOfLines={1}
					style={{ color: colors.onSurfaceVariant }}
				>
					{album.artistName} · {album.trackCount}{' '}
					{album.trackCount === 1 ? 'track' : 'tracks'}
				</Text>
			</View>
		</TouchableOpacity>
	);
});

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
	listItem: {
		flexDirection: 'row',
		alignItems: 'center',
		width: '100%',
		gap: 16,
		paddingVertical: 16,
	},
	playlistArtwork: {
		width: 56,
		height: 56,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
	artistArtwork: {
		width: 56,
		height: 56,
		borderRadius: 28,
		alignItems: 'center',
		justifyContent: 'center',
	},
	albumArtwork: {
		width: 56,
		height: 56,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
	listItemText: {
		flex: 1,
		gap: 4,
	},
});
