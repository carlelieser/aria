import { useCallback, useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import DraggableFlatList, {
	ScaleDecorator,
	type RenderItemParams,
} from 'react-native-draggable-flatlist';
import {
	ListMusicIcon,
	PlayIcon,
	Shuffle,
	Trash2Icon,
	PencilIcon,
	GripVerticalIcon,
	MoreVerticalIcon,
	CheckIcon,
} from 'lucide-react-native';
import { Text, IconButton, Button, Menu } from 'react-native-paper';
import { Icon } from '@/src/components/ui/icon';
import { DetailsPage, useDetailsPageHeaderColors } from '@/src/components/details-page';
import { CollectionDownloadButton } from '@/src/components/downloads/collection-download-button';
import { SelectableTrackListItem } from '@/src/components/media-list/selectable-track-list-item';
import { BatchActionBar } from '@/src/components/selection/batch-action-bar';
import { EmptyState } from '@/src/components/ui/empty-state';
import { ConfirmationDialog } from '@/src/components/ui/confirmation-dialog';
import { InputDialog } from '@/src/components/ui/input-dialog';
import { usePlaylist, useLibraryStore } from '@/src/application/state/library-store';
import { usePlayer } from '@/src/hooks/use-player';
import { useToast } from '@/src/hooks/use-toast';
import { useSelection } from '@/src/hooks/use-selection';
import { useBatchActions } from '@/src/hooks/use-batch-actions';
import { useAppTheme, M3Shapes } from '@/lib/theme';
import { formatDuration } from '@/src/domain/utils/formatting';
import { getPlaylistDuration, type PlaylistTrack } from '@/src/domain/entities/playlist';
import { getBestArtwork } from '@/src/domain/value-objects/artwork';
import { getArtistNames, type Track } from '@/src/domain/entities/track';
import type { DetailsHeaderInfo, MetadataLine } from '@/src/components/details-page';
import type { ReactNode } from 'react';

export default function PlaylistScreen() {
	const insets = useSafeAreaInsets();
	const { id } = useLocalSearchParams<{ id: string }>();
	const { colors } = useAppTheme();
	const { playQueue, shufflePlay } = usePlayer();
	const { success } = useToast();

	const [menuVisible, setMenuVisible] = useState(false);
	const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
	const [renameDialogVisible, setRenameDialogVisible] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false);

	const playlist = usePlaylist(id);
	const removePlaylist = useLibraryStore((state) => state.removePlaylist);
	const renamePlaylist = useLibraryStore((state) => state.renamePlaylist);
	const reorderPlaylistTracks = useLibraryStore((state) => state.reorderPlaylistTracks);

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
		removeSelectedFromPlaylist,
		downloadSelected,
		cancelDownload,
		isDownloading,
	} = useBatchActions();

	const tracks = useMemo(() => playlist?.tracks.map((pt) => pt.track) ?? [], [playlist?.tracks]);
	const totalDuration = playlist ? getPlaylistDuration(playlist) : 0;
	const artworkUrl = playlist?.artwork?.[0]?.url ?? tracks[0]?.artwork?.[0]?.url;

	const handlePlayAll = useCallback(() => {
		if (tracks.length > 0) {
			playQueue(tracks, 0);
		}
	}, [tracks, playQueue]);

	const handleShufflePlay = useCallback(() => {
		shufflePlay(tracks);
	}, [tracks, shufflePlay]);

	const handleDeletePlaylist = useCallback(() => {
		if (playlist) {
			removePlaylist(playlist.id);
			success('Playlist deleted', playlist.name);
			router.back();
		}
	}, [playlist, removePlaylist, success]);

	const handleRenamePlaylist = useCallback(
		(newName: string) => {
			if (playlist) {
				renamePlaylist(playlist.id, newName);
				success('Playlist renamed', newName);
				setRenameDialogVisible(false);
			}
		},
		[playlist, renamePlaylist, success]
	);

	const handleDragEnd = useCallback(
		({ from, to }: { from: number; to: number }) => {
			if (playlist && from !== to) {
				reorderPlaylistTracks(playlist.id, from, to);
			}
		},
		[playlist, reorderPlaylistTracks]
	);

	const toggleEditMode = useCallback(() => {
		setIsEditMode((prev) => !prev);
		setMenuVisible(false);
		exitSelectionMode();
	}, [exitSelectionMode]);

	const handleLongPress = useCallback(
		(track: Track) => {
			if (!isEditMode) {
				enterSelectionMode(track.id.value);
			}
		},
		[isEditMode, enterSelectionMode]
	);

	const handleSelectionToggle = useCallback(
		(track: Track) => {
			toggleTrackSelection(track.id.value);
		},
		[toggleTrackSelection]
	);

	const selectedTracks = useMemo(
		() => tracks.filter((t) => selectedTrackIds.has(t.id.value)),
		[tracks, selectedTrackIds]
	);

	const handleBatchAddToQueue = useCallback(() => {
		addSelectedToQueue(selectedTracks);
		exitSelectionMode();
	}, [selectedTracks, addSelectedToQueue, exitSelectionMode]);

	const handleBatchRemoveFromPlaylist = useCallback(() => {
		if (!playlist) return;

		const positions = playlist.tracks
			.filter((pt) => selectedTrackIds.has(pt.track.id.value))
			.map((pt) => pt.position);

		removeSelectedFromPlaylist(playlist.id, positions);
		exitSelectionMode();
	}, [playlist, selectedTrackIds, removeSelectedFromPlaylist, exitSelectionMode]);

	const handleDownloadAll = useCallback(async () => {
		if (tracks.length > 0) {
			await downloadSelected(tracks);
		}
	}, [tracks, downloadSelected]);

	const renderTrackItem = useCallback(
		({ item, index }: { item: PlaylistTrack; index: number }) => (
			<SelectableTrackListItem
				style={{
					paddingHorizontal: 24,
				}}
				track={item.track}
				source={'playlist'}
				isSelectionMode={isSelectionMode}
				isSelected={selectedTrackIds.has(item.track.id.value)}
				onLongPress={handleLongPress}
				onSelectionToggle={handleSelectionToggle}
				queue={tracks}
				queueIndex={index}
			/>
		),
		[tracks, isSelectionMode, selectedTrackIds, handleLongPress, handleSelectionToggle]
	);

	const keyExtractor = useCallback(
		(item: PlaylistTrack, index: number) => `${playlist?.id}-${index}-${item.track.id.value}`,
		[playlist?.id]
	);

	const renderDraggableItem = useCallback(
		({ item, drag, isActive }: RenderItemParams<PlaylistTrack>) => {
			const artwork = getBestArtwork(item.track.artwork, 48);
			const artistNames = getArtistNames(item.track);

			return (
				<ScaleDecorator>
					<TouchableOpacity
						onLongPress={drag}
						disabled={isActive}
						style={[
							styles.draggableItem,
							{
								backgroundColor: isActive
									? colors.surfaceContainerHighest
									: colors.background,
							},
						]}
						activeOpacity={0.7}
					>
						<Icon
							as={GripVerticalIcon}
							size={20}
							color={colors.onSurfaceVariant}
							style={{
								paddingHorizontal: 24,
							}}
						/>
						<Image
							source={{ uri: artwork?.url }}
							style={styles.draggableArtwork}
							contentFit={'cover'}
						/>
						<View style={styles.draggableInfo}>
							<Text
								variant={'bodyLarge'}
								numberOfLines={1}
								style={{ color: colors.onSurface }}
							>
								{item.track.title}
							</Text>
							<Text
								variant={'bodyMedium'}
								numberOfLines={1}
								style={{ color: colors.onSurfaceVariant }}
							>
								{artistNames}
							</Text>
						</View>
					</TouchableOpacity>
				</ScaleDecorator>
			);
		},
		[colors]
	);

	if (!playlist) {
		const emptyHeaderInfo: DetailsHeaderInfo = {
			title: 'Playlist',
			placeholderIcon: ListMusicIcon,
			artworkShape: 'square',
		};

		return (
			<DetailsPage headerInfo={emptyHeaderInfo}>
				<EmptyState
					icon={ListMusicIcon}
					title={'Playlist not found'}
					description={'This playlist may have been deleted'}
				/>
			</DetailsPage>
		);
	}

	const headerRightActions = (
		<PlaylistHeaderActions
			isEditMode={isEditMode}
			menuVisible={menuVisible}
			trackCount={tracks.length}
			isDownloading={isDownloading}
			tracks={tracks}
			onToggleEditMode={toggleEditMode}
			onShowMenu={() => setMenuVisible(true)}
			onDismissMenu={() => setMenuVisible(false)}
			onDownloadAll={handleDownloadAll}
			onCancelDownload={cancelDownload}
			onRename={() => {
				setMenuVisible(false);
				setRenameDialogVisible(true);
			}}
			onDelete={() => {
				setMenuVisible(false);
				setDeleteDialogVisible(true);
			}}
		/>
	);

	const metadata: MetadataLine[] = [
		{
			text: `${tracks.length} ${tracks.length === 1 ? 'track' : 'tracks'}${totalDuration > 0 ? ` · ${formatDuration(totalDuration)}` : ''}`,
		},
	];

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
		title: playlist.name,
		artworkUrl,
		artworkShape: 'square',
		placeholderIcon: ListMusicIcon,
		metadata: playlist.description
			? [{ text: playlist.description, variant: 'primary' }, ...metadata]
			: metadata,
		actionButton,
	};

	const bottomContent = (
		<>
			<BatchActionBar
				context={'playlist'}
				selectedCount={selectedCount}
				onCancel={exitSelectionMode}
				onAddToQueue={handleBatchAddToQueue}
				onRemoveFromPlaylist={handleBatchRemoveFromPlaylist}
			/>

			<ConfirmationDialog
				visible={deleteDialogVisible}
				title={'Delete playlist'}
				message={`Are you sure you want to delete "${playlist.name}"? This action cannot be undone.`}
				confirmLabel={'Delete'}
				destructive
				onConfirm={handleDeletePlaylist}
				onCancel={() => setDeleteDialogVisible(false)}
			/>

			<InputDialog
				visible={renameDialogVisible}
				title={'Rename playlist'}
				placeholder={'Playlist name'}
				initialValue={playlist.name}
				confirmLabel={'Rename'}
				onConfirm={handleRenamePlaylist}
				onCancel={() => setRenameDialogVisible(false)}
			/>
		</>
	);

	const renderContent = ({
		ListHeaderComponent,
		onScroll,
	}: {
		ListHeaderComponent: ReactNode;
		onScroll: (e: any) => void;
	}) => {
		if (isEditMode) {
			return (
				<View style={styles.editModeContainer}>
					{ListHeaderComponent}
					<DraggableFlatList
						data={playlist.tracks}
						keyExtractor={(item) => `${item.track.id.value}-${item.position}`}
						renderItem={renderDraggableItem}
						onDragEnd={handleDragEnd}
						contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
					/>
				</View>
			);
		}

		return (
			<FlatList
				data={playlist.tracks}
				renderItem={renderTrackItem}
				keyExtractor={keyExtractor}
				ListHeaderComponent={<>{ListHeaderComponent}</>}
				contentContainerStyle={[
					styles.scrollContent,
					{
						paddingBottom: isSelectionMode ? insets.bottom + 140 : insets.bottom + 80,
					},
				]}
				ListEmptyComponent={
					<EmptyState
						icon={ListMusicIcon}
						title={'No tracks yet'}
						description={'Add tracks to this playlist from the track options menu'}
					/>
				}
				onScroll={onScroll}
				scrollEventThrottle={16}
				removeClippedSubviews
				maxToRenderPerBatch={10}
				windowSize={5}
				initialNumToRender={15}
				extraData={isSelectionMode ? selectedTrackIds : undefined}
			/>
		);
	};

	return (
		<DetailsPage
			headerInfo={headerInfo}
			headerRightActions={headerRightActions}
			bottomContent={bottomContent}
			disableScroll
			renderContent={renderContent}
		/>
	);
}

interface PlaylistHeaderActionsProps {
	readonly isEditMode: boolean;
	readonly menuVisible: boolean;
	readonly trackCount: number;
	readonly isDownloading: boolean;
	readonly tracks: readonly Track[];
	readonly onToggleEditMode: () => void;
	readonly onShowMenu: () => void;
	readonly onDismissMenu: () => void;
	readonly onDownloadAll: () => void;
	readonly onCancelDownload: () => void;
	readonly onRename: () => void;
	readonly onDelete: () => void;
}

function PlaylistHeaderActions({
	isEditMode,
	menuVisible,
	trackCount,
	isDownloading,
	tracks,
	onToggleEditMode,
	onShowMenu,
	onDismissMenu,
	onDownloadAll,
	onCancelDownload,
	onRename,
	onDelete,
}: PlaylistHeaderActionsProps) {
	const colors = useDetailsPageHeaderColors();

	if (isEditMode) {
		return (
			<IconButton
				icon={() => <Icon as={CheckIcon} size={22} color={colors.primary} />}
				onPress={onToggleEditMode}
			/>
		);
	}

	return (
		<View style={styles.headerActions}>
			{trackCount > 0 && (
				<CollectionDownloadButton
					tracks={tracks}
					isDownloading={isDownloading}
					onDownload={onDownloadAll}
					onCancel={onCancelDownload}
				/>
			)}
			<Menu
				visible={menuVisible}
				onDismiss={onDismissMenu}
				anchor={
					<IconButton
						icon={() => (
							<Icon as={MoreVerticalIcon} size={22} color={colors.onSurface} />
						)}
						onPress={onShowMenu}
					/>
				}
				contentStyle={{ backgroundColor: colors.surfaceContainerHigh }}
			>
				<Menu.Item
					leadingIcon={() => (
						<Icon as={GripVerticalIcon} size={20} color={colors.onSurface} />
					)}
					onPress={onToggleEditMode}
					title={'Reorder tracks'}
					titleStyle={{ color: colors.onSurface }}
					disabled={trackCount < 2}
				/>
				<Menu.Item
					leadingIcon={() => <Icon as={PencilIcon} size={20} color={colors.onSurface} />}
					onPress={onRename}
					title={'Rename playlist'}
					titleStyle={{ color: colors.onSurface }}
				/>
				<Menu.Item
					leadingIcon={() => <Icon as={Trash2Icon} size={20} color={colors.error} />}
					onPress={onDelete}
					title={'Delete playlist'}
					titleStyle={{ color: colors.error }}
				/>
			</Menu>
		</View>
	);
}

const styles = StyleSheet.create({
	actionButtons: {
		flexDirection: 'row',
		gap: 12,
	},
	headerActions: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	scrollContent: {
		gap: 8,
	},
	editModeContainer: {
		flex: 1,
		gap: 12,
	},
	draggableItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingRight: 16,
		paddingVertical: 8,
	},
	draggableArtwork: {
		width: 48,
		height: 48,
		borderRadius: M3Shapes.small,
	},
	draggableInfo: {
		flex: 1,
		marginLeft: 12,
	},
});
