import { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { TabsProvider, Tabs, TabScreen } from 'react-native-paper-tabs';
import { GenericListView } from '@/src/components/ui/generic-list-view';
import { PageLayout } from '@/src/components/ui/page-layout';
import { DownloadIcon, CheckCircle2Icon, AlertCircleIcon } from 'lucide-react-native';
import { DownloadListItem } from '@/src/components/downloads/download-list-item';
import { SelectableDownloadListItem } from '@/src/components/downloads/selectable-download-list-item';
import { BatchActionBar } from '@/src/components/selection/batch-action-bar';
import { useDownloadQueue } from '@/src/hooks/use-download-queue';
import { useDownloadActions } from '@/src/hooks/use-download-actions';
import { useSelection } from '@/src/hooks/use-selection';
import { useBatchActions } from '@/src/hooks/use-batch-actions';
import { useResolvedTracks } from '@/src/hooks/use-resolved-track';
import { useTabShadow } from '@/src/hooks/use-tab-shadow';
import { useAppTheme } from '@/lib/theme';
import type { Track } from '@/src/domain/entities/track';
import { createTrackFromDownloadInfo } from '@/src/domain/utils/create-track-from-download';
import type { DownloadInfo } from '@/src/domain/value-objects/download-state';

const BATCH_ACTION_BAR_PADDING = 120;
const DEFAULT_CONTENT_PADDING = 20;

export default function DownloadsScreen() {
	const [tabIndex, setTabIndex] = useState(0);
	const { colors } = useAppTheme();

	const { activeDownloads, completedDownloads, failedDownloads, stats } = useDownloadQueue();
	const { retryDownload } = useDownloadActions();

	const {
		isSelectionMode,
		selectedTrackIds,
		selectedCount,
		enterSelectionMode,
		exitSelectionMode,
		toggleTrackSelection,
	} = useSelection();

	const { addSelectedToLibrary, deleteSelectedDownloads, isDeleting } = useBatchActions();

	const { handleScroll, shadowStyle } = useTabShadow({ tabIndex });

	const completedTrackIds = useMemo(
		() => completedDownloads.map((d) => d.trackId),
		[completedDownloads]
	);

	const resolvedTracks = useResolvedTracks(completedTrackIds);

	const completedTracksQueue = useMemo(() => {
		return completedDownloads.map((downloadInfo) => {
			const resolved = resolvedTracks.get(downloadInfo.trackId);
			return resolved ?? createTrackFromDownloadInfo(downloadInfo);
		});
	}, [completedDownloads, resolvedTracks]);

	const handleLongPress = useCallback(
		(track: Track) => {
			if (tabIndex === 1) {
				enterSelectionMode(track.id.value);
			}
		},
		[tabIndex, enterSelectionMode]
	);

	const handleRetry = useCallback(
		(track: Track) => {
			retryDownload(track);
		},
		[retryDownload]
	);

	const handleSelectionToggle = useCallback(
		(track: Track) => {
			toggleTrackSelection(track.id.value);
		},
		[toggleTrackSelection]
	);

	const selectedTracks = useMemo(
		() => completedTracksQueue.filter((t) => selectedTrackIds.has(t.id.value)),
		[completedTracksQueue, selectedTrackIds]
	);

	const handleBatchAddToLibrary = useCallback(() => {
		addSelectedToLibrary(selectedTracks);
		exitSelectionMode();
	}, [selectedTracks, addSelectedToLibrary, exitSelectionMode]);

	const handleBatchDeleteDownloads = useCallback(async () => {
		const trackIds = Array.from(selectedTrackIds);
		await deleteSelectedDownloads(trackIds);
		exitSelectionMode();
	}, [selectedTrackIds, deleteSelectedDownloads, exitSelectionMode]);

	// Note: Labels must be static strings because react-native-paper-tabs uses them as React keys.
	// Dynamic labels (with counts) cause react-native-pager-view to fire onPageSelected incorrectly
	// when content changes. See: https://github.com/callstack/react-native-pager-view/issues/84
	const activeLabel = 'Active';
	const doneLabel = 'Done';
	const failedLabel = 'Failed';

	return (
		<PageLayout edges={[]}>
			<View style={styles.content}>
				<TabsProvider defaultIndex={tabIndex} onChangeIndex={setTabIndex}>
					<Tabs
						uppercase={false}
						mode={'fixed'}
						style={{ backgroundColor: colors.surface, ...shadowStyle }}
					>
						<TabScreen
							label={activeLabel}
							icon={'download'}
							badge={stats.activeCount || undefined}
						>
							<View style={styles.tabContent}>
								<ActiveDownloadsList
									downloads={activeDownloads}
									onScroll={handleScroll}
								/>
							</View>
						</TabScreen>
						<TabScreen
							label={doneLabel}
							icon={'check-circle'}
							badge={stats.completedCount || undefined}
						>
							<View style={styles.tabContent}>
								<CompletedDownloadsList
									downloads={completedDownloads}
									tracksQueue={completedTracksQueue}
									isSelectionMode={isSelectionMode}
									selectedTrackIds={selectedTrackIds}
									onLongPress={handleLongPress}
									onSelectionToggle={handleSelectionToggle}
									onScroll={handleScroll}
								/>
							</View>
						</TabScreen>
						<TabScreen
							label={failedLabel}
							icon={'alert-circle'}
							badge={stats.failedCount || undefined}
						>
							<View style={styles.tabContent}>
								<FailedDownloadsList
									downloads={failedDownloads}
									onRetry={handleRetry}
									onScroll={handleScroll}
								/>
							</View>
						</TabScreen>
					</Tabs>
				</TabsProvider>
			</View>

			<BatchActionBar
				context={'downloads'}
				selectedCount={selectedCount}
				onCancel={exitSelectionMode}
				onAddToLibrary={handleBatchAddToLibrary}
				onDeleteDownloads={handleBatchDeleteDownloads}
				isProcessing={isDeleting}
			/>
		</PageLayout>
	);
}

type ScrollHandler = (event: NativeSyntheticEvent<NativeScrollEvent>) => void;

interface ActiveDownloadsListProps {
	downloads: DownloadInfo[];
	onScroll?: ScrollHandler;
}

function ActiveDownloadsList({ downloads, onScroll }: ActiveDownloadsListProps) {
	return (
		<GenericListView
			data={downloads}
			isLoading={false}
			keyExtractor={(item) => item.trackId}
			renderItem={({ item }) => <DownloadListItem downloadInfo={item} />}
			loadingSkeleton={null}
			emptyState={{
				icon: DownloadIcon,
				title: 'No active downloads',
				description: 'No downloads in progress',
			}}
			contentContainerStyle={{ paddingBottom: DEFAULT_CONTENT_PADDING }}
			disablePlayerAwarePadding
			onScroll={onScroll}
		/>
	);
}

interface CompletedDownloadsListProps {
	downloads: DownloadInfo[];
	tracksQueue: Track[];
	isSelectionMode: boolean;
	selectedTrackIds: Set<string>;
	onLongPress: (track: Track) => void;
	onSelectionToggle: (track: Track) => void;
	onScroll?: ScrollHandler;
}

function CompletedDownloadsList({
	downloads,
	tracksQueue,
	isSelectionMode,
	selectedTrackIds,
	onLongPress,
	onSelectionToggle,
	onScroll,
}: CompletedDownloadsListProps) {
	return (
		<GenericListView
			data={downloads}
			isLoading={false}
			keyExtractor={(item) => item.trackId}
			renderItem={({ item, index }) => (
				<SelectableDownloadListItem
					downloadInfo={item}
					isSelectionMode={isSelectionMode}
					isSelected={selectedTrackIds.has(item.trackId)}
					onLongPress={onLongPress}
					onSelectionToggle={onSelectionToggle}
					queue={tracksQueue}
					queueIndex={index}
				/>
			)}
			loadingSkeleton={null}
			emptyState={{
				icon: CheckCircle2Icon,
				title: 'No completed downloads',
				description: 'Completed downloads will appear here',
			}}
			contentContainerStyle={{
				paddingBottom: isSelectionMode ? BATCH_ACTION_BAR_PADDING : DEFAULT_CONTENT_PADDING,
			}}
			extraData={isSelectionMode ? selectedTrackIds : undefined}
			onScroll={onScroll}
		/>
	);
}

interface FailedDownloadsListProps {
	downloads: DownloadInfo[];
	onRetry: (track: Track) => void;
	onScroll?: ScrollHandler;
}

function FailedDownloadsList({ downloads, onRetry, onScroll }: FailedDownloadsListProps) {
	return (
		<GenericListView
			data={downloads}
			isLoading={false}
			keyExtractor={(item) => item.trackId}
			renderItem={({ item }) => <DownloadListItem downloadInfo={item} onRetry={onRetry} />}
			loadingSkeleton={null}
			emptyState={{
				icon: AlertCircleIcon,
				title: 'No failed downloads',
				description: 'Failed downloads will appear here',
			}}
			contentContainerStyle={{ paddingBottom: DEFAULT_CONTENT_PADDING }}
			disablePlayerAwarePadding
			onScroll={onScroll}
		/>
	);
}

const styles = StyleSheet.create({
	content: {
		flex: 1,
	},
	tabContent: {
		flex: 1,
		paddingHorizontal: 16,
	},
});
