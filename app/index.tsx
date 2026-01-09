import { View, FlatList, TouchableOpacity } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import {
	CompassIcon,
	MusicIcon,
	ListMusicIcon,
	UsersIcon,
	SettingsIcon,
	DownloadIcon,
	type LucideIcon,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useState, useMemo, useRef, useCallback, memo } from 'react';
import { Image } from 'expo-image';
import {
	useTracks,
	usePlaylists,
	useIsLibraryLoading,
	useUniqueArtists,
	type UniqueArtist,
} from '@/src/application/state/library-store';
import { TrackListItem } from '@/components/track-list-item';
import {
	TrackListSkeleton,
	PlaylistListSkeleton,
	ArtistListSkeleton,
} from '@/components/skeletons';
import {
	LibrarySearchBar,
	ActiveFiltersBar,
	SortFilterFAB,
	LibrarySortFilterSheet,
} from '@/components/library';
import { useLibraryFilter } from '@/hooks/use-library-filter';
import { useUniqueFilterOptions } from '@/hooks/use-unique-filter-options';
import type { Track } from '@/src/domain/entities/track';
import type { Playlist } from '@/src/domain/entities/playlist';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';

const chips = ['playlists', 'artists', 'songs'] as const;
type ChipType = (typeof chips)[number];

const TRACK_ITEM_HEIGHT = 80;
const PLAYLIST_ITEM_HEIGHT = 88;
const ARTIST_ITEM_HEIGHT = 88;

export default function HomeScreen() {
	const [selected, setSelected] = useState<ChipType>('playlists');
	const [isSearchExpanded, setIsSearchExpanded] = useState(false);
	const allTracks = useTracks();
	const playlists = usePlaylists();
	const isLoading = useIsLibraryLoading();
	const sheetRef = useRef<BottomSheetMethods>(null);

	const {
		tracks: filteredTracks,
		searchQuery,
		setSearchQuery,
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
		clearFilters,
		clearAll,
	} = useLibraryFilter();

	const { artists: filterArtists, albums: filterAlbums } = useUniqueFilterOptions(allTracks);

	const artists = useUniqueArtists();

	const handleSettingsPress = () => {
		router.navigate('/settings' as const);
	};

	const handleOpenFilterSheet = useCallback(() => {
		sheetRef.current?.snapToIndex(0);
	}, []);

	const handleToggleSearch = useCallback(() => {
		setIsSearchExpanded((prev) => !prev);
	}, []);

	const isSongsTab = selected === 'songs';
	const showActiveFilters = isSongsTab && hasFilters;

	const filteredPlaylists = useMemo(() => {
		if (!searchQuery.trim()) return playlists;
		const query = searchQuery.toLowerCase();
		return playlists.filter((p) => p.name.toLowerCase().includes(query));
	}, [playlists, searchQuery]);

	const filteredArtists = useMemo(() => {
		if (!searchQuery.trim()) return artists;
		const query = searchQuery.toLowerCase();
		return artists.filter((a) => a.name.toLowerCase().includes(query));
	}, [artists, searchQuery]);

	return (
		<SafeAreaView className={'bg-background flex-1'}>
			{/* Header */}
			<View className={'flex-row items-center justify-between p-4'}>
				<Text className="text-2xl font-bold">Library</Text>
				<View className={'flex-row gap-1'}>
					<Button
						variant={'ghost'}
						size={'icon'}
						onPress={() => router.navigate('/search')}
					>
						<Icon as={CompassIcon} />
					</Button>
					<Button
						variant={'ghost'}
						size={'icon'}
						onPress={() => router.navigate('/downloads')}
					>
						<Icon as={DownloadIcon} />
					</Button>
					<Button variant={'ghost'} size={'icon'} onPress={handleSettingsPress}>
						<Icon as={SettingsIcon} />
					</Button>
				</View>
			</View>

			{/* Tabs row with search */}
			<View className={'flex-row items-center justify-between px-4 mb-2'} style={{ zIndex: 10 }}>
				<View className={'flex-row gap-2'}>
					{chips.map((chip) => {
						const variant = chip === selected ? 'default' : 'secondary';
						return (
							<Button key={chip} variant={variant} onPress={() => setSelected(chip)}>
								<Text className={'capitalize'}>{chip}</Text>
							</Button>
						);
					})}
				</View>
				<LibrarySearchBar
					value={searchQuery}
					onChangeText={setSearchQuery}
					isExpanded={isSearchExpanded}
					onToggle={handleToggleSearch}
				/>
			</View>

			{}
			{showActiveFilters && (
				<View className="mb-2">
					<ActiveFiltersBar
						activeFilters={activeFilters}
						artists={filterArtists}
						albums={filterAlbums}
						onToggleArtist={toggleArtistFilter}
						onToggleAlbum={toggleAlbumFilter}
						onToggleFavorites={toggleFavoritesOnly}
						onClearAll={clearFilters}
					/>
				</View>
			)}

			{}
			<View className="flex-1 px-4">
				{selected === 'songs' && (
					<SongsList
						tracks={filteredTracks}
						isLoading={isLoading}
						hasFilters={hasFilters || searchQuery.length > 0}
					/>
				)}
				{selected === 'playlists' && (
					<PlaylistsList
						playlists={filteredPlaylists}
						isLoading={isLoading}
						hasSearchQuery={searchQuery.length > 0}
					/>
				)}
				{selected === 'artists' && (
					<ArtistsList
						artists={filteredArtists}
						isLoading={isLoading}
						hasSearchQuery={searchQuery.length > 0}
					/>
				)}
			</View>

			{}
			{isSongsTab && (
				<SortFilterFAB filterCount={filterCount} onPress={handleOpenFilterSheet} />
			)}

			{}
			<LibrarySortFilterSheet
				ref={sheetRef}
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
				onClearAll={clearAll}
			/>
		</SafeAreaView>
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
		<FlatList
			data={tracks}
			keyExtractor={(item) => item.id.value}
			renderItem={({ item }) => <TrackListItem track={item} />}
			getItemLayout={(_, index) => ({
				length: TRACK_ITEM_HEIGHT,
				offset: TRACK_ITEM_HEIGHT * index,
				index,
			})}
			showsVerticalScrollIndicator={false}
		/>
	);
}

function PlaylistsList({
	playlists,
	isLoading,
	hasSearchQuery,
}: {
	playlists: Playlist[];
	isLoading: boolean;
	hasSearchQuery: boolean;
}) {
	if (isLoading) {
		return <PlaylistListSkeleton count={6} />;
	}

	if (playlists.length === 0) {
		if (hasSearchQuery) {
			return (
				<EmptyState
					icon={ListMusicIcon}
					title="No matches"
					description="Try a different search term"
				/>
			);
		}
		return (
			<EmptyState
				icon={ListMusicIcon}
				title="No playlists yet"
				description="Create a playlist to organize your favorite tracks"
			/>
		);
	}

	return (
		<FlatList
			data={playlists}
			keyExtractor={(item) => item.id}
			renderItem={({ item }) => <PlaylistItem playlist={item} />}
			getItemLayout={(_, index) => ({
				length: PLAYLIST_ITEM_HEIGHT,
				offset: PLAYLIST_ITEM_HEIGHT * index,
				index,
			})}
			showsVerticalScrollIndicator={false}
		/>
	);
}

function ArtistsList({
	artists,
	isLoading,
	hasSearchQuery,
}: {
	artists: UniqueArtist[];
	isLoading: boolean;
	hasSearchQuery: boolean;
}) {
	if (isLoading) {
		return <ArtistListSkeleton count={6} />;
	}

	if (artists.length === 0) {
		if (hasSearchQuery) {
			return (
				<EmptyState
					icon={UsersIcon}
					title="No matches"
					description="Try a different search term"
				/>
			);
		}
		return (
			<EmptyState
				icon={UsersIcon}
				title="No artists yet"
				description="Add some music to see your favorite artists here"
			/>
		);
	}

	return (
		<FlatList
			data={artists}
			keyExtractor={(item) => item.id}
			renderItem={({ item }) => <ArtistItem artist={item} />}
			getItemLayout={(_, index) => ({
				length: ARTIST_ITEM_HEIGHT,
				offset: ARTIST_ITEM_HEIGHT * index,
				index,
			})}
			showsVerticalScrollIndicator={false}
		/>
	);
}

const PlaylistItem = memo(function PlaylistItem({ playlist }: { playlist: Playlist }) {
	const trackCount = playlist.tracks.length;
	const artworkUrl = playlist.artwork?.[0]?.url;

	return (
		<TouchableOpacity
			className="flex flex-row items-center w-full gap-4 py-4"
			activeOpacity={0.7}
		>
			{artworkUrl ? (
				<Image
					source={{ uri: artworkUrl }}
					style={{
						width: 56,
						height: 56,
						borderRadius: 8,
					}}
					contentFit="cover"
					transition={200}
					cachePolicy="memory-disk"
					recyclingKey={playlist.id}
				/>
			) : (
				<View
					className="bg-muted items-center justify-center"
					style={{ width: 56, height: 56, borderRadius: 8 }}
				>
					<Icon as={ListMusicIcon} className="text-muted-foreground" />
				</View>
			)}

			<View className="flex flex-col gap-1 flex-1">
				<Text numberOfLines={1} className="font-medium">
					{playlist.name}
				</Text>
				<Text variant="muted" numberOfLines={1}>
					{trackCount} {trackCount === 1 ? 'track' : 'tracks'}
				</Text>
			</View>
		</TouchableOpacity>
	);
});

const ArtistItem = memo(function ArtistItem({ artist }: { artist: UniqueArtist }) {
	return (
		<TouchableOpacity
			className="flex flex-row items-center w-full gap-4 py-4"
			activeOpacity={0.7}
		>
			{artist.artworkUrl ? (
				<Image
					source={{ uri: artist.artworkUrl }}
					style={{
						width: 56,
						height: 56,
						borderRadius: 28,
					}}
					contentFit="cover"
					transition={200}
					cachePolicy="memory-disk"
					recyclingKey={artist.id}
				/>
			) : (
				<View
					className="bg-muted items-center justify-center"
					style={{ width: 56, height: 56, borderRadius: 28 }}
				>
					<Icon as={UsersIcon} className="text-muted-foreground" />
				</View>
			)}

			<View className="flex flex-col gap-1 flex-1">
				<Text numberOfLines={1} className="font-medium">
					{artist.name}
				</Text>
				<Text variant="muted" numberOfLines={1}>
					{artist.trackCount} {artist.trackCount === 1 ? 'track' : 'tracks'}
				</Text>
			</View>
		</TouchableOpacity>
	);
});

export function EmptyState({
	icon: IconComponent,
	title,
	description,
}: {
	icon: LucideIcon;
	title: string;
	description: string;
}) {
	return (
		<View className="flex-1 items-center justify-center py-16">
			<View className="bg-muted rounded-full p-6 mb-4">
				<Icon as={IconComponent} size={48} className="text-muted-foreground" />
			</View>
			<Text className="text-xl font-semibold mb-2">{title}</Text>
			<Text variant="muted" className="text-center px-8">
				{description}
			</Text>
		</View>
	);
}
