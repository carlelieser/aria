import { GenericListView } from '@/src/components/ui/generic-list-view';
import { ArtistListItem } from '@/src/components/media-list/artist-list-item';
import { ArtistListSkeleton } from '@/src/components/skeletons';
import { UsersIcon } from 'lucide-react-native';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import type { UniqueArtist } from '@/src/application/state/library-store';

function renderArtistItem({ item }: { item: UniqueArtist }) {
	return (
		<ArtistListItem
			id={item.id}
			name={item.name}
			artworkUrl={item.artworkUrl}
			trackCount={item.trackCount}
		/>
	);
}

interface ArtistListProps {
	readonly artists: UniqueArtist[];
	readonly isLoading: boolean;
	readonly onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

export function ArtistList({ artists, isLoading, onScroll }: ArtistListProps) {
	return (
		<GenericListView
			data={artists}
			isLoading={isLoading}
			keyExtractor={(item) => item.id}
			renderItem={renderArtistItem}
			loadingSkeleton={<ArtistListSkeleton count={6} />}
			emptyState={{
				icon: UsersIcon,
				title: 'No artists yet',
				description: 'Add some music to see your favorite artists here',
			}}
			onScroll={onScroll}
		/>
	);
}
