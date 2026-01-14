/**
 * PlaylistScreen
 *
 * Display playlist details and tracks with CRUD operations.
 * Uses M3 theming.
 */

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
	Trash2Icon,
	PencilIcon,
	GripVerticalIcon,
	MoreVerticalIcon,
	CheckIcon,
} from 'lucide-react-native';
import { Text, IconButton, Button, Menu } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import { PageLayout } from '@/components/page-layout';
import { SelectableTrackListItem } from '@/components/selectable-track-list-item';
import { BatchActionBar } from '@/components/batch-action-bar';
import { EmptyState } from '@/components/empty-state';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { InputDialog } from '@/components/ui/input-dialog';
import { usePlaylist, useLibraryStore } from '@/src/application/state/library-store';
import { usePlayer } from '@/hooks/use-player';
import { useToast } from '@/hooks/use-toast';
import { useSelection } from '@/hooks/use-selection';
import { useBatchActions } from '@/hooks/use-batch-actions';
import { useAppTheme, M3Shapes } from '@/lib/theme';
import { getPlaylistDuration, type PlaylistTrack } from '@/src/domain/entities/playlist';
import { getBestArtwork } from '@/src/domain/value-objects/artwork';
import { getArtistNames, type Track } from '@/src/domain/entities/track';

function formatDuration(ms: number): string {
	const totalMinutes = Math.floor(ms / 60000);
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;

	if (hours > 0) {
		return `${hours} hr ${minutes} min`;
	}
	return `${minutes} min`;
}

export default function PlaylistScreen() {
	const insets = useSafeAreaInsets();
	const { id } = useLocalSearchParams<{ id: string }>();
	const { colors } = useAppTheme();
	const { playQueue } = usePlayer();
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

	const { addSelectedToQueue, removeSelectedFromPlaylist } = useBatchActions();

	const tracks = useMemo(() => playlist?.tracks.map((pt) => pt.track) ?? [], [playlist?.tracks]);
	const totalDuration = playlist ? getPlaylistDuration(playlist) : 0;
	const artworkUrl = playlist?.artwork?.[0]?.url ?? tracks[0]?.artwork?.[0]?.url;

	const handlePlayAll = useCallback(() => {
		if (tracks.length > 0) {
			playQueue(tracks, 0);
			router.push('/player');
		}
	}, [tracks, playQueue]);

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

		// Map selected track IDs to their positions in the playlist
		const positions = playlist.tracks
			.filter((pt) => selectedTrackIds.has(pt.track.id.value))
			.map((pt) => pt.position);

		removeSelectedFromPlaylist(playlist.id, positions);
		exitSelectionMode();
	}, [playlist, selectedTrackIds, removeSelectedFromPlaylist, exitSelectionMode]);

	// Memoized render function for FlatList virtualization
	const renderTrackItem = useCallback(
		({ item, index }: { item: PlaylistTrack; index: number }) => (
			<SelectableTrackListItem
				track={item.track}
				source="playlist"
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
						<IconButton
							icon={() => (
								<Icon
									as={GripVerticalIcon}
									size={20}
									color={colors.onSurfaceVariant}
								/>
							)}
							onPress={drag}
							size={20}
						/>
						<Image
							source={{ uri: artwork?.url }}
							style={styles.draggableArtwork}
							contentFit="cover"
						/>
						<View style={styles.draggableInfo}>
							<Text
								variant="bodyLarge"
								numberOfLines={1}
								style={{ color: colors.onSurface }}
							>
								{item.track.title}
							</Text>
							<Text
								variant="bodyMedium"
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
		return (
			<PageLayout
				header={{
					title: 'Playlist',
					showBack: true,
					backgroundColor: colors.surfaceContainerHigh,
					borderRadius: 24,
					extended: true,
					compact: true,
				}}
			>
				<EmptyState
					icon={ListMusicIcon}
					title="Playlist not found"
					description="This playlist may have been deleted"
				/>
			</PageLayout>
		);
	}

	const headerRightActions = isEditMode ? (
		<IconButton
			icon={() => <Icon as={CheckIcon} size={22} color={colors.primary} />}
			onPress={toggleEditMode}
		/>
	) : (
		<Menu
			visible={menuVisible}
			onDismiss={() => setMenuVisible(false)}
			anchor={
				<IconButton
					icon={() => <Icon as={MoreVerticalIcon} size={22} color={colors.onSurface} />}
					onPress={() => setMenuVisible(true)}
				/>
			}
			contentStyle={{ backgroundColor: colors.surfaceContainerHigh }}
		>
			<Menu.Item
				leadingIcon={() => (
					<Icon as={GripVerticalIcon} size={20} color={colors.onSurface} />
				)}
				onPress={toggleEditMode}
				title="Reorder Tracks"
				titleStyle={{ color: colors.onSurface }}
				disabled={tracks.length < 2}
			/>
			<Menu.Item
				leadingIcon={() => <Icon as={PencilIcon} size={20} color={colors.onSurface} />}
				onPress={() => {
					setMenuVisible(false);
					setRenameDialogVisible(true);
				}}
				title="Rename Playlist"
				titleStyle={{ color: colors.onSurface }}
			/>
			<Menu.Item
				leadingIcon={() => <Icon as={Trash2Icon} size={20} color={colors.error} />}
				onPress={() => {
					setMenuVisible(false);
					setDeleteDialogVisible(true);
				}}
				title="Delete Playlist"
				titleStyle={{ color: colors.error }}
			/>
		</Menu>
	);

	const headerContent = (
		<View style={styles.playlistInfo}>
			{artworkUrl ? (
				<Image
					source={{ uri: artworkUrl }}
					style={styles.playlistArtwork}
					contentFit="cover"
				/>
			) : (
				<View
					style={[
						styles.playlistArtwork,
						{ backgroundColor: colors.surfaceContainerHighest },
					]}
				>
					<Icon as={ListMusicIcon} size={64} color={colors.onSurfaceVariant} />
				</View>
			)}
			<View style={styles.playlistText}>
				<Text
					variant="headlineSmall"
					style={{
						color: colors.onSurface,
						fontWeight: '700',
						textAlign: 'center',
					}}
				>
					{playlist.name}
				</Text>
				{playlist.description && (
					<Text
						variant="bodyMedium"
						style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}
					>
						{playlist.description}
					</Text>
				)}
				<Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
					{tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
					{totalDuration > 0 && ` · ${formatDuration(totalDuration)}`}
				</Text>
			</View>
			{tracks.length > 0 && (
				<Button
					mode="contained"
					icon={() => <Icon as={PlayIcon} size={18} color={colors.onPrimary} />}
					onPress={handlePlayAll}
				>
					Play All
				</Button>
			)}
		</View>
	);

	return (
		<PageLayout
			header={{
				title: 'Playlist',
				showBack: true,
				backgroundColor: colors.surfaceContainerHigh,
				borderRadius: 24,
				belowTitle: headerContent,
				rightActions: headerRightActions,
				extended: true,
				compact: true,
			}}
		>
			{isEditMode ? (
				<View style={styles.editModeContainer}>
					<View
						style={[
							styles.editModeHeader,
							{ backgroundColor: colors.primaryContainer },
						]}
					>
						<Text variant="bodyMedium" style={{ color: colors.onPrimaryContainer }}>
							Drag tracks to reorder
						</Text>
					</View>
					<DraggableFlatList
						data={playlist.tracks}
						keyExtractor={(item) => `${item.track.id.value}-${item.position}`}
						renderItem={renderDraggableItem}
						onDragEnd={handleDragEnd}
						contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
					/>
				</View>
			) : (
				<FlatList
					data={playlist.tracks}
					renderItem={renderTrackItem}
					keyExtractor={keyExtractor}
					contentContainerStyle={[
						styles.scrollContent,
						{
							paddingBottom: isSelectionMode
								? insets.bottom + 140
								: insets.bottom + 80,
						},
					]}
					ListEmptyComponent={
						<EmptyState
							icon={ListMusicIcon}
							title="No tracks yet"
							description="Add tracks to this playlist from the track options menu"
						/>
					}
					// Performance optimizations
					removeClippedSubviews
					maxToRenderPerBatch={10}
					windowSize={5}
					initialNumToRender={15}
					extraData={isSelectionMode ? selectedTrackIds : undefined}
				/>
			)}

			<BatchActionBar
				context="playlist"
				selectedCount={selectedCount}
				onCancel={exitSelectionMode}
				onAddToQueue={handleBatchAddToQueue}
				onRemoveFromPlaylist={handleBatchRemoveFromPlaylist}
			/>

			<ConfirmationDialog
				visible={deleteDialogVisible}
				title="Delete Playlist"
				message={`Are you sure you want to delete "${playlist.name}"? This action cannot be undone.`}
				confirmLabel="Delete"
				destructive
				onConfirm={handleDeletePlaylist}
				onCancel={() => setDeleteDialogVisible(false)}
			/>

			<InputDialog
				visible={renameDialogVisible}
				title="Rename Playlist"
				placeholder="Playlist name"
				initialValue={playlist.name}
				confirmLabel="Rename"
				onConfirm={handleRenamePlaylist}
				onCancel={() => setRenameDialogVisible(false)}
			/>
		</PageLayout>
	);
}

const styles = StyleSheet.create({
	playlistInfo: {
		alignItems: 'center',
		gap: 16,
		paddingHorizontal: 16,
	},
	playlistArtwork: {
		width: 160,
		height: 160,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	playlistText: {
		alignItems: 'center',
		gap: 4,
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingVertical: 16,
		gap: 8,
	},
	editModeContainer: {
		flex: 1,
	},
	editModeHeader: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		alignItems: 'center',
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
