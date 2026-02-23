import { useEffect, useMemo, useCallback } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DiscIcon, SearchIcon } from 'lucide-react-native';
import { Text, Button, IconButton } from 'react-native-paper';
import { Icon } from '@/src/components/ui/icon';
import { DetailsPage, useDetailsPageHeaderColors } from '@/src/components/details-page';
import { CollectionDownloadButton } from '@/src/components/downloads/collection-download-button';
import { useBatchActions } from '@/src/hooks/use-batch-actions';
import { TrackListItem } from '@/src/components/media-list/track-list-item';
import {
	AlbumHeaderSkeleton,
	AlbumTrackListSkeleton,
} from '@/src/components/skeletons/album-screen-skeleton';
import { useLibraryAlbumTracks } from '@/src/hooks/use-library-album-tracks';
import { enrichTracksWithAlbumArtwork, getAlbumInfo } from '@/src/domain/utils/album-utils';
import {
	useAlbumDetail,
	useAlbumLoading,
	useAlbumError,
} from '@/src/application/state/album-store';
import { albumService } from '@/src/application/services/album-service';
import { useAppTheme } from '@/lib/theme';
import type { Track } from '@/src/domain/entities/track';
import type { ReactNode } from 'react';
import type { DetailsHeaderInfo, MetadataLine } from '@/src/components/details-page';

export default function AlbumScreen() {
	const insets = useSafeAreaInsets();
	const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
	const { colors } = useAppTheme();
	const { downloadSelected, cancelDownload, isDownloading } = useBatchActions();

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

	const enrichedTracks = useMemo(() => {
		const enriched = enrichTracksWithAlbumArtwork(displayTracks, albumInfo.artwork);
		const seen = new Set<string>();
		return enriched.filter((track) => {
			if (seen.has(track.id.value)) return false;
			seen.add(track.id.value);
			return true;
		});
	}, [displayTracks, albumInfo.artwork]);

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
					onDownload={handleDownloadAll}
					onCancel={cancelDownload}
				/>
			)}
			<SearchAction onPress={handleSearchAlbum} />
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

	const errorTextStyle = useMemo(
		() => ({ color: colors.onSurfaceVariant, textAlign: 'center' as const }),
		[colors.onSurfaceVariant]
	);

	const emptyTextStyle = useMemo(
		() => ({ color: colors.onSurfaceVariant }),
		[colors.onSurfaceVariant]
	);

	const renderTrackItem = useCallback(
		({ item, index }: { item: Track; index: number }) => (
			<View style={styles.trackItem}>
				<TrackListItem
					track={item}
					source={'search'}
					queue={enrichedTracks}
					queueIndex={index}
				/>
			</View>
		),
		[enrichedTracks]
	);

	const keyExtractor = useCallback((item: Track) => item.id.value, []);

	const renderContent = ({
		ListHeaderComponent,
		onScroll,
	}: {
		ListHeaderComponent: ReactNode;
		onScroll: (e: any) => void;
	}) => {
		if (error) {
			return (
				<View>
					{ListHeaderComponent}
					<View style={styles.emptyState}>
						<Text variant={'bodyMedium'} style={errorTextStyle}>
							{error}
						</Text>
						<Button mode={'text'} onPress={handleSearchAlbum}>
							Search for tracks instead
						</Button>
					</View>
				</View>
			);
		}

		if (isLoading) {
			return (
				<View>
					{ListHeaderComponent}
					<View style={styles.loadingContainer}>
						<AlbumTrackListSkeleton />
					</View>
				</View>
			);
		}

		if (enrichedTracks.length === 0) {
			return (
				<View>
					{ListHeaderComponent}
					<View style={styles.emptyState}>
						<Text variant={'bodyMedium'} style={emptyTextStyle}>
							No tracks found for this album
						</Text>
						<Button mode={'text'} onPress={handleSearchAlbum}>
							Search for tracks
						</Button>
					</View>
				</View>
			);
		}

		return (
			<FlatList
				data={enrichedTracks}
				renderItem={renderTrackItem}
				keyExtractor={keyExtractor}
				ListHeaderComponent={<>{ListHeaderComponent}</>}
				contentContainerStyle={{
					paddingBottom: insets.bottom + 80,
				}}
				onScroll={onScroll}
				scrollEventThrottle={16}
				removeClippedSubviews
				maxToRenderPerBatch={10}
				windowSize={5}
				initialNumToRender={15}
			/>
		);
	};

	return (
		<DetailsPage
			headerInfo={headerInfo}
			headerRightActions={headerRightActions}
			isLoading={isLoading}
			loadingContent={<AlbumHeaderSkeleton />}
			disableScroll
			renderContent={renderContent}
		/>
	);
}

function SearchAction({ onPress }: { readonly onPress: () => void }) {
	const colors = useDetailsPageHeaderColors();
	return (
		<IconButton
			icon={() => <Icon as={SearchIcon} size={22} color={colors.onSurface} />}
			onPress={onPress}
		/>
	);
}

const styles = StyleSheet.create({
	trackItem: {
		paddingHorizontal: 24,
	},
	emptyState: {
		paddingVertical: 48,
		alignItems: 'center',
		paddingHorizontal: 24,
	},
	loadingContainer: {
		paddingHorizontal: 24,
	},
});
