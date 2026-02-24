/**
 * QueueSheet Component
 *
 * Bottom sheet displaying the current playback queue.
 * Supports drag-to-reorder, remove, skip-to-track, and clear.
 */

import { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, type LayoutChangeEvent } from 'react-native';
import DraggableFlatList, {
	type RenderItemParams,
	type DragEndParams,
} from 'react-native-draggable-flatlist';
import { Divider } from 'react-native-paper';
import { ListMusic } from 'lucide-react-native';
import { ManagedBottomSheet } from '@/src/components/ui/managed-bottom-sheet';
import { EmptyState } from '@/src/components/ui/empty-state';
import { ConfirmationDialog } from '@/src/components/ui/confirmation-dialog';
import {
	useQueue,
	useQueueIndex,
	useIsPlaying,
	usePlayerStore,
} from '@/src/application/state/player-store';
import { playbackService } from '@/src/application/services/playback-service';
import { TrackListSkeleton } from '@/src/components/skeletons/track-list-item-skeleton';
import { useAppTheme } from '@/lib/theme';
import { useDeferredMount } from '@/src/hooks/use-deferred-mount';
import { QueueHeader } from './queue-header';
import { QueueTrackItem } from './queue-track-item';
import type { QueueSheetProps } from './types';
import type { Track } from '@/src/domain/entities/track';

export type { QueueSheetProps } from './types';

const SNAP_POINTS = ['55%', '90%'];

export function QueueSheet({ isOpen, onClose }: QueueSheetProps) {
	const queue = useQueue();
	const queueIndex = useQueueIndex();
	const isPlaying = useIsPlaying();
	const { colors } = useAppTheme();
	const [clearDialogVisible, setClearDialogVisible] = useState(false);
	const [listHeight, setListHeight] = useState<number | undefined>(undefined);

	// Defer the heavy DraggableFlatList until after the sheet open animation
	// settles, avoiding an ~823ms synchronous mount that blocks the UI thread.
	const isContentReady = useDeferredMount(isOpen);

	const snapPoints = useMemo(() => SNAP_POINTS, []);

	const keyExtractor = useCallback(
		(item: Track, index: number) => `${item.id.value}-${index}`,
		[]
	);

	const handleDragEnd = useCallback(({ from, to }: DragEndParams<Track>) => {
		usePlayerStore.getState().moveInQueue(from, to);
	}, []);

	const handleRemove = useCallback((index: number) => {
		const state = usePlayerStore.getState();
		const wasPlaying = index === state.queueIndex;
		state.removeFromQueue(index);
		if (wasPlaying) {
			const next = usePlayerStore.getState().currentTrack;
			if (next) {
				playbackService.play(next);
			}
		}
	}, []);

	const handlePlay = useCallback((index: number) => {
		const state = usePlayerStore.getState();
		const track = state.queue[index];
		if (!track) return;
		state.setQueue(state.queue, index);
		playbackService.play(track);
	}, []);

	const handleClear = useCallback(() => {
		setClearDialogVisible(true);
	}, []);

	const handleConfirmClear = useCallback(() => {
		setClearDialogVisible(false);
		playbackService.stop();
		usePlayerStore.getState().setQueue([]);
		onClose();
	}, [onClose]);

	const handleCancelClear = useCallback(() => {
		setClearDialogVisible(false);
	}, []);

	const handleListContainerLayout = useCallback((e: LayoutChangeEvent) => {
		setListHeight(e.nativeEvent.layout.height);
	}, []);

	const renderItem = useCallback(
		({ item, drag, isActive: isDragging, getIndex }: RenderItemParams<Track>) => {
			const index = getIndex() ?? 0;
			return (
				<QueueTrackItem
					track={item}
					index={index}
					isActive={index === queueIndex}
					isPlaying={index === queueIndex && isPlaying}
					drag={drag}
					isDragging={isDragging}
					onRemove={handleRemove}
					onPlay={handlePlay}
				/>
			);
		},
		[queueIndex, isPlaying, handleRemove, handlePlay]
	);

	const loadingPlaceholder = (
		<View style={styles.loadingContainer}>
			<TrackListSkeleton count={8} />
		</View>
	);

	const emptyState = (
		<EmptyState
			icon={ListMusic}
			title={'Your queue is empty'}
			description={'Play a track to start building your queue.'}
		/>
	);

	const queueList = (
		<View style={styles.listContainer} onLayout={handleListContainerLayout}>
			<DraggableFlatList
				data={queue}
				keyExtractor={keyExtractor}
				renderItem={renderItem}
				onDragEnd={handleDragEnd}
				autoscrollThreshold={80}
				containerStyle={[styles.list, listHeight != null && { maxHeight: listHeight }]}
				contentContainerStyle={styles.listContent}
				showsVerticalScrollIndicator={false}
			/>
		</View>
	);

	const listContent = !isContentReady
		? loadingPlaceholder
		: queue.length === 0
			? emptyState
			: queueList;

	return (
		<>
			<ManagedBottomSheet
				portalName={'queue-sheet'}
				isOpen={isOpen}
				onClose={onClose}
				snapPoints={snapPoints}
				enableContentPanningGesture={false}
			>
				<QueueHeader trackCount={queue.length} onClear={handleClear} />
				<Divider style={{ backgroundColor: colors.outlineVariant }} />
				{listContent}
			</ManagedBottomSheet>

			<ConfirmationDialog
				visible={clearDialogVisible}
				title={'Clear queue'}
				message={'This will stop playback and remove all tracks from the queue.'}
				confirmLabel={'Clear'}
				destructive
				onConfirm={handleConfirmClear}
				onCancel={handleCancelClear}
			/>
		</>
	);
}

const styles = StyleSheet.create({
	loadingContainer: {
		flex: 1,
		padding: 16,
	},
	listContainer: {
		flex: 1,
		marginTop: 16,
	},
	list: {
		flex: 1,
	},
	listContent: {
		paddingBottom: 124,
	},
});
