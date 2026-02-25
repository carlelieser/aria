import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ListMusicIcon, PlayIcon, Shuffle, BookmarkIcon, BookmarkCheckIcon } from 'lucide-react-native';
import { Text, Button, IconButton } from 'react-native-paper';
import { Icon } from '@/src/components/ui/icon';
import { DetailsPage, useDetailsPageHeaderColors } from '@/src/components/details-page';
import { CollectionDownloadButton } from '@/src/components/downloads/collection-download-button';
import { TrackListItem } from '@/src/components/media-list/track-list-item';
import { TrackListItemSkeleton } from '@/src/components/skeletons/track-list-item-skeleton';
import { useBatchActions } from '@/src/hooks/use-batch-actions';
import { usePlayer } from '@/src/hooks/use-player';
import { homeFeedService } from '@/src/application/services/home-feed-service';
import { libraryService } from '@/src/application/services/library-service';
import { usePlaylist } from '@/src/application/state/library-store';
import { useAppTheme } from '@/lib/theme';
import type { Track } from '@/src/domain/entities/track';
import type { ReactNode } from 'react';
import type { DetailsHeaderInfo, MetadataLine } from '@/src/components/details-page';

export default function RemotePlaylistScreen() {
	const insets = useSafeAreaInsets();
	const { id, name, artwork } = useLocalSearchParams<{
		id: string;
		name?: string;
		artwork?: string;
	}>();
	const { colors } = useAppTheme();
	const headerColors = useDetailsPageHeaderColors();
	const { playQueue, shufflePlay } = usePlayer();
	const { downloadSelected, cancelDownload, isDownloading } = useBatchActions();

	const libraryPlaylistId = `remote_${id}`;
	const savedPlaylist = usePlaylist(libraryPlaylistId);

	const [tracks, setTracks] = useState<Track[]>([]);
	const [hasMore, setHasMore] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function load() {
			setIsLoading(true);
			setError(null);
			const result = await homeFeedService.getPlaylistTracks(id);
			if (cancelled) return;

			if (result.success) {
				setTracks(result.data.tracks);
				setHasMore(result.data.hasMore);
			} else {
				setError(result.error.message);
			}
			setIsLoading(false);
		}

		load();
		return () => {
			cancelled = true;
		};
	}, [id]);

	const handleLoadMore = useCallback(async () => {
		if (isLoadingMore || !hasMore) return;

		setIsLoadingMore(true);
		const result = await homeFeedService.loadMorePlaylistTracks();

		if (result.success) {
			setTracks((prev) => [...prev, ...result.data.tracks]);
			setHasMore(result.data.hasMore);
		}
		setIsLoadingMore(false);
	}, [isLoadingMore, hasMore]);

	const handlePlayAll = useCallback(() => {
		if (tracks.length > 0) {
			playQueue(tracks, 0);
		}
	}, [tracks, playQueue]);

	const handleShufflePlay = useCallback(() => {
		shufflePlay(tracks);
	}, [tracks, shufflePlay]);

	const handleDownloadAll = useCallback(async () => {
		if (tracks.length > 0) {
			await downloadSelected(tracks);
		}
	}, [tracks, downloadSelected]);

	const handleSaveToLibrary = useCallback(() => {
		if (savedPlaylist) {
			libraryService.removePlaylist(libraryPlaylistId);
			return;
		}

		const now = new Date();
		libraryService.addPlaylist({
			id: libraryPlaylistId,
			name: name ?? 'Playlist',
			artwork: artwork ? [{ url: artwork }] : undefined,
			tracks: tracks.map((track, index) => ({
				track,
				addedAt: now,
				position: index,
			})),
			createdAt: now,
			updatedAt: now,
			isSmartPlaylist: false,
		});
	}, [savedPlaylist, libraryPlaylistId, name, artwork, tracks]);

	const headerRightActions =
		tracks.length > 0 ? (
			<View style={styles.headerActions}>
				<IconButton
					icon={() => (
						<Icon
							as={savedPlaylist ? BookmarkCheckIcon : BookmarkIcon}
							size={22}
							color={savedPlaylist ? headerColors.primary : headerColors.onSurface}
						/>
					)}
					onPress={handleSaveToLibrary}
					accessibilityLabel={savedPlaylist ? 'Remove from library' : 'Save to library'}
				/>
				<CollectionDownloadButton
					tracks={tracks}
					isDownloading={isDownloading}
					onDownload={handleDownloadAll}
					onCancel={cancelDownload}
				/>
			</View>
		) : undefined;

	const trackCountLabel = hasMore
		? `${tracks.length}+ tracks`
		: `${tracks.length} ${tracks.length === 1 ? 'track' : 'tracks'}`;
	const metadata: MetadataLine[] = isLoading ? [] : [{ text: trackCountLabel }];

	const actionButton =
		tracks.length > 0 ? (
			<View style={styles.actionButtons}>
				<Button
					mode={'contained'}
					icon={() => <Icon as={PlayIcon} size={18} color={colors.onPrimary} />}
					onPress={handlePlayAll}
				>
					Play All
				</Button>
				<Button
					mode={'contained-tonal'}
					icon={() => <Icon as={Shuffle} size={18} color={colors.onSecondaryContainer} />}
					onPress={handleShufflePlay}
					accessibilityLabel={'Shuffle play'}
				>
					Shuffle
				</Button>
			</View>
		) : undefined;

	const headerInfo: DetailsHeaderInfo = {
		title: name ?? 'Playlist',
		artworkUrl: artwork,
		artworkShape: 'square',
		placeholderIcon: ListMusicIcon,
		metadata,
		actionButton,
	};

	const errorTextStyle = useMemo(
		() => ({ color: colors.onSurfaceVariant, textAlign: 'center' as const }),
		[colors.onSurfaceVariant]
	);

	const renderTrackItem = useCallback(
		({ item, index }: { item: Track; index: number }) => (
			<View style={styles.trackItem}>
				<TrackListItem track={item} source={'search'} queue={tracks} queueIndex={index} />
			</View>
		),
		[tracks]
	);

	const keyExtractor = useCallback((item: Track) => item.id.value, []);

	const listFooter = useMemo(() => {
		if (!hasMore) return null;
		return (
			<View style={styles.showMoreContainer}>
				{isLoadingMore ? (
					<ActivityIndicator size={'small'} color={colors.primary} />
				) : (
					<Button mode={'text'} onPress={handleLoadMore}>
						Show more
					</Button>
				)}
			</View>
		);
	}, [hasMore, isLoadingMore, colors.primary, handleLoadMore]);

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
					</View>
				</View>
			);
		}

		if (isLoading) {
			return (
				<View>
					{ListHeaderComponent}
					<View style={styles.loadingContainer}>
						{Array.from({ length: 8 }, (_, i) => (
							<TrackListItemSkeleton key={i} />
						))}
					</View>
				</View>
			);
		}

		if (tracks.length === 0) {
			return (
				<View>
					{ListHeaderComponent}
					<View style={styles.emptyState}>
						<Text variant={'bodyMedium'} style={{ color: colors.onSurfaceVariant }}>
							No tracks found in this playlist
						</Text>
					</View>
				</View>
			);
		}

		return (
			<FlatList
				data={tracks}
				renderItem={renderTrackItem}
				keyExtractor={keyExtractor}
				ListHeaderComponent={<>{ListHeaderComponent}</>}
				ListFooterComponent={listFooter}
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
			disableScroll
			renderContent={renderContent}
		/>
	);
}

const styles = StyleSheet.create({
	headerActions: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	actionButtons: {
		flexDirection: 'row',
		gap: 12,
	},
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
		gap: 8,
	},
	showMoreContainer: {
		alignItems: 'center',
		paddingVertical: 16,
	},
});
