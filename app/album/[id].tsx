/**
 * AlbumScreen
 *
 * Display album details and tracks.
 * Uses M3 theming.
 */

import { useEffect, useMemo, useCallback } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { PlayerAwareScrollView } from '@/components/ui/player-aware-scroll-view';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DiscIcon, SearchIcon, DownloadIcon } from 'lucide-react-native';
import { Text, Button, IconButton } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import { PageLayout } from '@/components/page-layout';
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
	const { downloadSelected, isDownloading } = useBatchActions();

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
			pathname: '/explore',
			params: { query: albumInfo.name },
		});
	};

	const handleDownloadAll = useCallback(async () => {
		if (enrichedTracks.length > 0) {
			await downloadSelected(enrichedTracks);
		}
	}, [enrichedTracks, downloadSelected]);

	const headerRightActions = enrichedTracks.length > 0 && (
		<IconButton
			icon={() => (
				<Icon
					as={DownloadIcon}
					size={22}
					color={isDownloading ? colors.outline : colors.onSurface}
				/>
			)}
			onPress={handleDownloadAll}
			disabled={isDownloading}
		/>
	);

	const headerContent = showHeaderSkeleton ? (
		<AlbumHeaderSkeleton />
	) : (
		<View style={styles.albumInfo}>
			{albumInfo.artwork ? (
				<Image source={{ uri: albumInfo.artwork }} style={styles.albumArtwork} />
			) : (
				<View
					style={[
						styles.albumArtwork,
						{ backgroundColor: colors.surfaceContainerHighest },
					]}
				>
					<Icon as={DiscIcon} size={64} color={colors.onSurfaceVariant} />
				</View>
			)}
			<View style={styles.albumText}>
				<Text
					variant="headlineSmall"
					style={{
						color: colors.onSurface,
						fontWeight: '700',
						textAlign: 'center',
					}}
				>
					{albumInfo.name}
				</Text>
				<View style={styles.albumMeta}>
					<Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
						{albumInfo.artists}
					</Text>
					<Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
						•
					</Text>
					<Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
						{displayTracks.length} {displayTracks.length === 1 ? 'track' : 'tracks'}
					</Text>
				</View>
			</View>
			<Button
				mode="outlined"
				icon={() => <Icon as={SearchIcon} size={16} color={colors.primary} />}
				onPress={handleSearchAlbum}
			>
				Search for more
			</Button>
		</View>
	);

	return (
		<PageLayout
			header={{
				title: 'Album',
				showBack: true,
				backgroundColor: colors.surfaceContainerHigh,
				borderRadius: 24,
				belowTitle: headerContent,
				rightActions: headerRightActions,
				extended: true,
			}}
			style={{
				gap: 12,
			}}
		>
			<PlayerAwareScrollView
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingBottom: insets.bottom + 80 },
				]}
			>
				{isLoading ? (
					<AlbumTrackListSkeleton />
				) : error ? (
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
				) : enrichedTracks.length === 0 ? (
					<View style={styles.emptyState}>
						<Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
							No tracks found for this album
						</Text>
						<Button mode="text" onPress={handleSearchAlbum}>
							Search for tracks
						</Button>
					</View>
				) : (
					enrichedTracks.map((track, index) => (
						<TrackListItem
							key={`album-${index}-${track.id.value}`}
							track={track}
							source="search"
							queue={enrichedTracks}
							queueIndex={index}
						/>
					))
				)}
			</PlayerAwareScrollView>
		</PageLayout>
	);
}

const styles = StyleSheet.create({
	albumInfo: {
		alignItems: 'center',
		gap: 16,
		paddingHorizontal: 16,
	},
	albumArtwork: {
		width: 160,
		height: 160,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	albumText: {
		alignItems: 'center',
		gap: 4,
	},
	albumMeta: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingVertical: 16,
		gap: 8,
	},
	emptyState: {
		paddingVertical: 48,
		alignItems: 'center',
	},
});
