import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ListMusicIcon, PlayIcon, Shuffle } from 'lucide-react-native';
import { Text, Button } from 'react-native-paper';
import { Icon } from '@/src/components/ui/icon';
import { DetailsPage } from '@/src/components/details-page';
import { CollectionDownloadButton } from '@/src/components/downloads/collection-download-button';
import { TrackListItem } from '@/src/components/media-list/track-list-item';
import { TrackListItemSkeleton } from '@/src/components/skeletons/track-list-item-skeleton';
import { useBatchActions } from '@/src/hooks/use-batch-actions';
import { usePlayer } from '@/src/hooks/use-player';
import { homeFeedService } from '@/src/application/services/home-feed-service';
import { useAppTheme } from '@/lib/theme';
import type { Track } from '@/src/domain/entities/track';
import type { DetailsHeaderInfo, MetadataLine } from '@/src/components/details-page';

export default function RemotePlaylistScreen() {
	const insets = useSafeAreaInsets();
	const { id, name, artwork } = useLocalSearchParams<{
		id: string;
		name?: string;
		artwork?: string;
	}>();
	const { colors } = useAppTheme();
	const { playQueue, shufflePlay } = usePlayer();
	const { downloadSelected, cancelDownload, isDownloading, downloadProgress } = useBatchActions();

	const [tracks, setTracks] = useState<Track[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function load() {
			setIsLoading(true);
			setError(null);
			const result = await homeFeedService.getPlaylistTracks(id);
			if (cancelled) return;

			if (result.success) {
				setTracks(result.data);
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

	const headerRightActions =
		tracks.length > 0 ? (
			<CollectionDownloadButton
				tracks={tracks}
				isDownloading={isDownloading}
				progress={downloadProgress}
				onDownload={handleDownloadAll}
				onCancel={cancelDownload}
			/>
		) : undefined;

	const metadata: MetadataLine[] = isLoading
		? []
		: [{ text: `${tracks.length} ${tracks.length === 1 ? 'track' : 'tracks'}` }];

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

	const renderContent = () => {
		if (error) {
			return (
				<View style={styles.emptyState}>
					<Text variant={'bodyMedium'} style={errorTextStyle}>
						{error}
					</Text>
				</View>
			);
		}

		if (isLoading) {
			return (
				<View style={styles.trackList}>
					{Array.from({ length: 8 }, (_, i) => (
						<TrackListItemSkeleton key={i} />
					))}
				</View>
			);
		}

		if (tracks.length === 0) {
			return (
				<View style={styles.emptyState}>
					<Text variant={'bodyMedium'} style={{ color: colors.onSurfaceVariant }}>
						No tracks found in this playlist
					</Text>
				</View>
			);
		}

		return (
			<View style={styles.trackList}>
				{tracks.map((track, index) => (
					<TrackListItem
						key={track.id.value}
						track={track}
						source={'search'}
						queue={tracks}
						queueIndex={index}
					/>
				))}
			</View>
		);
	};

	return (
		<DetailsPage
			headerInfo={headerInfo}
			headerRightActions={headerRightActions}
			isLoading={isLoading}
			scrollContentStyle={{ paddingBottom: insets.bottom + 80 }}
		>
			<View style={styles.content}>{renderContent()}</View>
		</DetailsPage>
	);
}

const styles = StyleSheet.create({
	actionButtons: {
		flexDirection: 'row',
		gap: 12,
	},
	content: {
		paddingHorizontal: 24,
	},
	trackList: {
		gap: 8,
	},
	emptyState: {
		paddingVertical: 48,
		alignItems: 'center',
	},
});
