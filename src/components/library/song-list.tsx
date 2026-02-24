import { useCallback } from 'react';
import { GenericListView } from '@/src/components/ui/generic-list-view';
import { SelectableTrackListItem } from '@/src/components/media-list/selectable-track-list-item';
import { TrackListSkeleton } from '@/src/components/skeletons';
import { MusicIcon } from 'lucide-react-native';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import type { Track } from '@/src/domain/entities/track';

interface SongListProps {
	readonly tracks: Track[];
	readonly isLoading: boolean;
	readonly hasFilters: boolean;
	readonly isSelectionMode: boolean;
	readonly selectedTrackIds: Set<string>;
	readonly onLongPress: (track: Track) => void;
	readonly onSelectionToggle: (track: Track) => void;
	readonly onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

export function SongList({
	tracks,
	isLoading,
	hasFilters,
	isSelectionMode,
	selectedTrackIds,
	onLongPress,
	onSelectionToggle,
	onScroll,
}: SongListProps) {
	const renderItem = useCallback(
		({ item, index }: { item: Track; index: number }) => (
			<SelectableTrackListItem
				track={item}
				source={'library'}
				isSelectionMode={isSelectionMode}
				isSelected={selectedTrackIds.has(item.id.value)}
				onLongPress={onLongPress}
				onSelectionToggle={onSelectionToggle}
				queue={tracks}
				queueIndex={index}
			/>
		),
		[isSelectionMode, selectedTrackIds, onLongPress, onSelectionToggle, tracks]
	);

	return (
		<GenericListView
			data={tracks}
			isLoading={isLoading}
			keyExtractor={(item) => item.id.value}
			renderItem={renderItem}
			loadingSkeleton={<TrackListSkeleton count={8} />}
			emptyState={{
				icon: MusicIcon,
				title: 'No songs yet',
				description: 'Search for music or add local files to build your library',
			}}
			filteredEmptyState={{
				icon: MusicIcon,
				title: 'No matches',
				description: 'Try adjusting your filters',
			}}
			hasFilters={hasFilters}
			extraData={isSelectionMode ? selectedTrackIds : undefined}
			onScroll={onScroll}
		/>
	);
}
