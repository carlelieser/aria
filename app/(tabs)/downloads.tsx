import { useState, useMemo, useCallback, memo } from 'react';
import { View, StyleSheet, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { Freeze } from 'react-freeze';
import { TabsProvider, Tabs, TabScreen } from 'react-native-paper-tabs';
import { GenericListView } from '@/src/components/ui/generic-list-view';
import { PageLayout } from '@/src/components/ui/page-layout';
import { DownloadIcon, CheckCircle2Icon, AlertCircleIcon } from 'lucide-react-native';
import { DownloadListItem } from '@/src/components/downloads/download-list-item';
import { SelectableDownloadListItem } from '@/src/components/downloads/selectable-download-list-item';
import { BatchActionBar } from '@/src/components/selection/batch-action-bar';
import {
	useDownloadStore,
	useActiveDownloadsList,
	useCompletedDownloadsList,
	useFailedDownloadsList,
	useDownloadStats,
} from '@/src/application/state/download-store';
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

	const stats = useDownloadStats();
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

	const handleBatchAddToLibrary = useCallback(() => {
		const state = useDownloadStore.getState();
		const completedInfos: DownloadInfo[] = [];
		for (const info of state.downloads.values()) {
			if (info.status === 'completed' && selectedTrackIds.has(info.trackId)) {
				completedInfos.push(info);
			}
		}
		const tracks = completedInfos.map(createTrackFromDownloadInfo);
		addSelectedToLibrary(tracks);
		exitSelectionMode();
	}, [selectedTrackIds, addSelectedToLibrary, exitSelectionMode]);

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
							<Freeze freeze={tabIndex !== 0}>
								<View style={styles.tabContent}>
									<ActiveDownloadsList onScroll={handleScroll} />
								</View>
							</Freeze>
						</TabScreen>
						<TabScreen
							label={doneLabel}
							icon={'check-circle'}
							badge={stats.completedCount || undefined}
						>
							<Freeze freeze={tabIndex !== 1}>
								<View style={styles.tabContent}>
									<CompletedDownloadsList
										isSelectionMode={isSelectionMode}
										selectedTrackIds={selectedTrackIds}
										onLongPress={handleLongPress}
										onSelectionToggle={handleSelectionToggle}
										onScroll={handleScroll}
									/>
								</View>
							</Freeze>
						</TabScreen>
						<TabScreen
							label={failedLabel}
							icon={'alert-circle'}
							badge={stats.failedCount || undefined}
						>
							<Freeze freeze={tabIndex !== 2}>
								<View style={styles.tabContent}>
									<FailedDownloadsList
										onRetry={handleRetry}
										onScroll={handleScroll}
									/>
								</View>
							</Freeze>
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
	onScroll?: ScrollHandler;
}

const ACTIVE_EMPTY_STATE = {
	icon: DownloadIcon,
	title: 'No active downloads',
	description: 'No downloads in progress',
};

const ACTIVE_CONTENT_STYLE = { paddingBottom: DEFAULT_CONTENT_PADDING };

const activeKeyExtractor = (item: DownloadInfo) => item.trackId;

const ActiveDownloadsList = memo(function ActiveDownloadsList({
	onScroll,
}: ActiveDownloadsListProps) {
	const downloads = useActiveDownloadsList();

	const renderItem = useCallback(
		({ item }: { item: DownloadInfo }) => <DownloadListItem downloadInfo={item} />,
		[]
	);

	return (
		<GenericListView
			data={downloads}
			isLoading={false}
			keyExtractor={activeKeyExtractor}
			renderItem={renderItem}
			loadingSkeleton={null}
			emptyState={ACTIVE_EMPTY_STATE}
			contentContainerStyle={ACTIVE_CONTENT_STYLE}
			disablePlayerAwarePadding
			onScroll={onScroll}
		/>
	);
});

interface CompletedDownloadsListProps {
	isSelectionMode: boolean;
	selectedTrackIds: Set<string>;
	onLongPress: (track: Track) => void;
	onSelectionToggle: (track: Track) => void;
	onScroll?: ScrollHandler;
}

const COMPLETED_EMPTY_STATE = {
	icon: CheckCircle2Icon,
	title: 'No completed downloads',
	description: 'Completed downloads will appear here',
};

const COMPLETED_CONTENT_STYLE = { paddingBottom: DEFAULT_CONTENT_PADDING };
const COMPLETED_SELECTION_CONTENT_STYLE = { paddingBottom: BATCH_ACTION_BAR_PADDING };

const completedKeyExtractor = (item: DownloadInfo) => item.trackId;

const CompletedDownloadsList = memo(function CompletedDownloadsList({
	isSelectionMode,
	selectedTrackIds,
	onLongPress,
	onSelectionToggle,
	onScroll,
}: CompletedDownloadsListProps) {
	const downloads = useCompletedDownloadsList();

	const completedTrackIds = useMemo(() => downloads.map((d) => d.trackId), [downloads]);

	const resolvedTracks = useResolvedTracks(completedTrackIds);

	const tracksQueue = useMemo(() => {
		return downloads.map((downloadInfo) => {
			const resolved = resolvedTracks.get(downloadInfo.trackId);
			return resolved ?? createTrackFromDownloadInfo(downloadInfo);
		});
	}, [downloads, resolvedTracks]);

	const renderItem = useCallback(
		({ item, index }: { item: DownloadInfo; index: number }) => (
			<SelectableDownloadListItem
				downloadInfo={item}
				isSelectionMode={isSelectionMode}
				isSelected={selectedTrackIds.has(item.trackId)}
				onLongPress={onLongPress}
				onSelectionToggle={onSelectionToggle}
				queue={tracksQueue}
				queueIndex={index}
			/>
		),
		[isSelectionMode, selectedTrackIds, onLongPress, onSelectionToggle, tracksQueue]
	);

	const contentStyle = isSelectionMode
		? COMPLETED_SELECTION_CONTENT_STYLE
		: COMPLETED_CONTENT_STYLE;

	return (
		<GenericListView
			data={downloads}
			isLoading={false}
			keyExtractor={completedKeyExtractor}
			renderItem={renderItem}
			loadingSkeleton={null}
			emptyState={COMPLETED_EMPTY_STATE}
			contentContainerStyle={contentStyle}
			extraData={isSelectionMode ? selectedTrackIds : undefined}
			onScroll={onScroll}
		/>
	);
});

interface FailedDownloadsListProps {
	onRetry: (track: Track) => void;
	onScroll?: ScrollHandler;
}

const FAILED_EMPTY_STATE = {
	icon: AlertCircleIcon,
	title: 'No failed downloads',
	description: 'Failed downloads will appear here',
};

const FAILED_CONTENT_STYLE = { paddingBottom: DEFAULT_CONTENT_PADDING };

const failedKeyExtractor = (item: DownloadInfo) => item.trackId;

const FailedDownloadsList = memo(function FailedDownloadsList({
	onRetry,
	onScroll,
}: FailedDownloadsListProps) {
	const downloads = useFailedDownloadsList();

	const renderItem = useCallback(
		({ item }: { item: DownloadInfo }) => (
			<DownloadListItem downloadInfo={item} onRetry={onRetry} />
		),
		[onRetry]
	);

	return (
		<GenericListView
			data={downloads}
			isLoading={false}
			keyExtractor={failedKeyExtractor}
			renderItem={renderItem}
			loadingSkeleton={null}
			emptyState={FAILED_EMPTY_STATE}
			contentContainerStyle={FAILED_CONTENT_STYLE}
			disablePlayerAwarePadding
			onScroll={onScroll}
		/>
	);
});

const styles = StyleSheet.create({
	content: {
		flex: 1,
	},
	tabContent: {
		flex: 1,
		paddingHorizontal: 16,
	},
});
