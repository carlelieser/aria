import { GenericListView } from '@/src/components/ui/generic-list-view';
import { AlbumListItem } from '@/src/components/media-list/album-list-item';
import { AlbumListSkeleton } from '@/src/components/skeletons';
import { DiscIcon } from 'lucide-react-native';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import type { UniqueAlbum } from '@/src/application/state/library-store';

function renderAlbumItem({ item }: { item: UniqueAlbum }) {
	return (
		<AlbumListItem
			id={item.id}
			name={item.name}
			artistName={item.artistName}
			artworkUrl={item.artworkUrl}
			trackCount={item.trackCount}
		/>
	);
}

interface AlbumListProps {
	readonly albums: UniqueAlbum[];
	readonly isLoading: boolean;
	readonly onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

export function AlbumList({ albums, isLoading, onScroll }: AlbumListProps) {
	return (
		<GenericListView
			data={albums}
			isLoading={isLoading}
			keyExtractor={(item) => item.id}
			renderItem={renderAlbumItem}
			loadingSkeleton={<AlbumListSkeleton count={6} />}
			emptyState={{
				icon: DiscIcon,
				title: 'No albums yet',
				description: 'Add some music to see your albums here',
			}}
			onScroll={onScroll}
		/>
	);
}
