import { useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DiscIcon, SearchIcon } from 'lucide-react-native';
import { Text, Button, IconButton } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import { DetailsPage } from '@/components/details-page';
import { CollectionDownloadButton } from '@/components/collection-download-button';
import { useBatchActions } from '@/hooks/use-batch-actions';
import { TrackListItem } from '@/components/track-list-item';
import {
	AlbumHeaderSkeleton,
	AlbumTrackListSkeleton,
} from '@/components/skeletons/album-screen-skeleton';
import { useTracks } from '@/src/application/state/library-store';
import {
	useAlbumDetail,
	useAlbumLoading,
	useAlbumError,
} from '@/src/application/state/album-store';
import { albumService } from '@/src/application/services/album-service';
import { getArtworkUrl, getArtistNames } from '@/src/domain/entities/track';
import { useAppTheme } from '@/lib/theme';
import type { Track } from '@/src/domain/entities/track';
import type { Artwork } from '@/src/domain/value-objects/artwork';
import type { DetailsHeaderInfo, MetadataLine } from '@/components/details-page';

function enrichTracksWithAlbumArtwork(tracks: Track[], albumArtworkUrl?: string): Track[] {
	if (!albumArtworkUrl) return tracks;

	const fallbackArtwork: Artwork[] = [{ url: albumArtworkUrl }];

	return tracks.map((track) => {
		if (track.artwork && track.artwork.length > 0) {
			return track;
		}
		return { ...track, artwork: fallbackArtwork };
	});
}

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
	const { colors } = useAppTheme();
	const { downloadSelected, cancelDownload, isDownloading, downloadProgress } = useBatchActions();

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

	const enrichedTracks = useMemo(
		() => enrichTracksWithAlbumArtwork(displayTracks, albumInfo.artwork),
		[displayTracks, albumInfo.artwork]
	);

	const hasData = albumDetail.album !== null || libraryTracks.length > 0;
	const showHeaderSkeleton = isLoading && !hasData;

	const handleSearchAlbum = () => {
		router.push({
			pathname: '/search',
			params: { query: albumInfo.name },
		});
	};

	const handleDownloadAll = useCallback(async () => {
		if (enrichedTracks.length > 0) {
			await downloadSelected(enrichedTracks);
		}
	}, [enrichedTracks, downloadSelected]);

	const headerRightActions = (
		<>
			{enrichedTracks.length > 0 && (
				<CollectionDownloadButton
					tracks={enrichedTracks}
					isDownloading={isDownloading}
					progress={downloadProgress}
					onDownload={handleDownloadAll}
					onCancel={cancelDownload}
				/>
			)}
			<IconButton
				icon={() => <Icon as={SearchIcon} size={22} color={colors.onSurface} />}
				onPress={handleSearchAlbum}
			/>
		</>
	);

	const metadata: MetadataLine[] = [
		{ text: albumInfo.artists, variant: 'primary' },
		{ text: `${displayTracks.length} ${displayTracks.length === 1 ? 'track' : 'tracks'}` },
	];

	const headerInfo: DetailsHeaderInfo = {
		title: albumInfo.name,
		artworkUrl: albumInfo.artwork,
		artworkShape: 'square',
		placeholderIcon: DiscIcon,
		metadata,
	};

	const renderContent = () => {
		if (isLoading && !hasData) {
			return <AlbumTrackListSkeleton />;
		}

		if (error) {
			return (
				<View style={styles.emptyState}>
					<Text
						variant="bodyMedium"
						style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}
					>
						{error}
					</Text>
					<Button mode="text" onPress={handleSearchAlbum}>
						Search for tracks instead
					</Button>
				</View>
			);
		}

		if (enrichedTracks.length === 0) {
			return (
				<View style={styles.emptyState}>
					<Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
						No tracks found for this album
					</Text>
					<Button mode="text" onPress={handleSearchAlbum}>
						Search for tracks
					</Button>
				</View>
			);
		}

		return (
			<View style={styles.trackList}>
				{enrichedTracks.map((track, index) => (
					<TrackListItem
						key={`album-${index}-${track.id.value}`}
						track={track}
						source="search"
						queue={enrichedTracks}
						queueIndex={index}
					/>
				))}
			</View>
		);
	};

	return (
		<DetailsPage
			pageTitle="Album"
			headerInfo={headerInfo}
			headerRightActions={headerRightActions}
			isLoading={showHeaderSkeleton}
			loadingContent={<AlbumHeaderSkeleton />}
			scrollContentStyle={{ paddingBottom: insets.bottom + 80 }}
		>
			<View style={styles.content}>{renderContent()}</View>
		</DetailsPage>
	);
}

const styles = StyleSheet.create({
	content: {
		paddingHorizontal: 16,
	},
	trackList: {
		gap: 8,
	},
	emptyState: {
		paddingVertical: 48,
		alignItems: 'center',
	},
});
