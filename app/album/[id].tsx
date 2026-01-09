import { useEffect } from 'react';
import { View, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeftIcon, DiscIcon, SearchIcon } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { TrackListItem } from '@/components/track-list-item';
import { useTracks } from '@/src/application/state/library-store';
import {
	useAlbumDetail,
	useAlbumLoading,
	useAlbumError,
} from '@/src/application/state/album-store';
import { albumService } from '@/src/application/services/album-service';
import { getArtworkUrl, getArtistNames } from '@/src/domain/entities/track';
import type { Track } from '@/src/domain/entities/track';

function useLibraryAlbumTracks(albumId: string): Track[] {
	const tracks = useTracks();
	return tracks
		.filter((track) => track.album?.id === albumId)
		.sort((a, b) => {
			const trackNumA = a.metadata.trackNumber ?? 0;
			const trackNumB = b.metadata.trackNumber ?? 0;
			return trackNumA - trackNumB;
		});
}

function getAlbumInfo(tracks: Track[], albumId: string, fallbackName?: string) {
	const trackWithAlbum = tracks.find((t) => t.album?.id === albumId);
	return {
		name: trackWithAlbum?.album?.name ?? fallbackName ?? 'Unknown Album',
		artists: trackWithAlbum ? getArtistNames(trackWithAlbum) : 'Unknown Artist',
		artwork: trackWithAlbum ? getArtworkUrl(trackWithAlbum, 300) : undefined,
	};
}

export default function AlbumScreen() {
	const insets = useSafeAreaInsets();
	const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();

	const libraryTracks = useLibraryAlbumTracks(id);

	const albumDetail = useAlbumDetail(id);
	const isLoading = useAlbumLoading(id);
	const error = useAlbumError(id);

	useEffect(() => {
		albumService.getAlbumDetail(id);
	}, [id]);

	const displayTracks = albumDetail.tracks.length > 0 ? albumDetail.tracks : libraryTracks;

	const albumInfo = albumDetail.album
		? {
				name: albumDetail.album.name,
				artists:
					albumDetail.album.artists.map((a) => a.name).join(', ') || 'Unknown Artist',
				artwork: albumDetail.album.artwork?.[0]?.url,
			}
		: getAlbumInfo(libraryTracks, id, name);

	const handleSearchAlbum = () => {
		router.push({
			pathname: '/search',
			params: { query: albumInfo.name },
		});
	};

	return (
		<View className="flex-1 bg-background">
			{}
			<View
				className="px-4 pb-6 bg-secondary rounded-b-3xl"
				style={{ paddingTop: insets.top + 16 }}
			>
				<View className="flex-row items-center gap-3 mb-6">
					<Button
						className="opacity-50"
						size="icon"
						variant="secondary"
						onPress={() => router.back()}
					>
						<Icon as={ChevronLeftIcon} />
					</Button>
					<Text className="text-lg font-medium text-muted-foreground">Album</Text>
				</View>

				{}
				<View className="items-center gap-4">
					{albumInfo.artwork ? (
						<Image
							source={{ uri: albumInfo.artwork }}
							className="w-40 h-40 rounded-xl"
							resizeMode="cover"
						/>
					) : (
						<View className="w-40 h-40 rounded-xl bg-muted items-center justify-center">
							<Icon as={DiscIcon} size={64} className="text-muted-foreground" />
						</View>
					)}
					<View className="items-center gap-1">
						<Text className="text-2xl font-bold text-center">{albumInfo.name}</Text>
						<Text variant="muted">{albumInfo.artists}</Text>
						<Text variant="muted" className="text-sm">
							{displayTracks.length} {displayTracks.length === 1 ? 'track' : 'tracks'}
						</Text>
					</View>
					<Button variant="outline" onPress={handleSearchAlbum}>
						<Icon as={SearchIcon} size={16} className="mr-2" />
						<Text>Search for more</Text>
					</Button>
				</View>
			</View>

			{}
			<ScrollView
				contentContainerClassName="px-4 py-4 gap-2"
				contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
			>
				{isLoading ? (
					<View className="py-12 items-center">
						<ActivityIndicator size="large" />
						<Text variant="muted" className="mt-4">
							Loading album tracks...
						</Text>
					</View>
				) : error ? (
					<View className="py-12 items-center">
						<Text variant="muted" className="text-center">
							{error}
						</Text>
						<Button variant="link" onPress={handleSearchAlbum}>
							<Text className="text-primary">Search for tracks instead</Text>
						</Button>
					</View>
				) : displayTracks.length === 0 ? (
					<View className="py-12 items-center">
						<Text variant="muted">No tracks found for this album</Text>
						<Button variant="link" onPress={handleSearchAlbum}>
							<Text className="text-primary">Search for tracks</Text>
						</Button>
					</View>
				) : (
					displayTracks.map((track) => (
						<TrackListItem key={track.id.value} track={track} source="search" />
					))
				)}
			</ScrollView>
		</View>
	);
}
