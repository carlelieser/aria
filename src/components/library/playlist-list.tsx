import { GenericListView } from '@/src/components/ui/generic-list-view';
import { PlaylistListItem } from '@/src/components/media-list';
import { PlaylistListSkeleton } from '@/src/components/skeletons';
import { ListMusicIcon } from 'lucide-react-native';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import type { Playlist } from '@/src/domain/entities/playlist';

interface PlaylistListProps {
	readonly playlists: Playlist[];
	readonly isLoading: boolean;
	readonly onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

export function PlaylistList({ playlists, isLoading, onScroll }: PlaylistListProps) {
	return (
		<GenericListView
			data={playlists}
			isLoading={isLoading}
			keyExtractor={(item) => item.id}
			renderItem={({ item }) => <PlaylistListItem playlist={item} />}
			loadingSkeleton={<PlaylistListSkeleton count={6} />}
			emptyState={{
				icon: ListMusicIcon,
				title: 'No playlists yet',
				description: 'Create a playlist to organize your favorite tracks',
			}}
			onScroll={onScroll}
		/>
	);
}
