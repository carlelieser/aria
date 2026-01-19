/**
 * ArtistItemSkeleton Component
 *
 * Skeleton loading state for artist list items.
 * Uses the unified MediaListItemSkeleton with artist-specific configuration.
 */

import { MediaListItemSkeleton, MediaListSkeleton } from './media-list-item-skeleton';

export function ArtistItemSkeleton() {
	return (
		<MediaListItemSkeleton
			shape="circular"
			artworkSize={56}
			lines={2}
			primaryWidth={'55%' as const}
			secondaryWidth={'25%' as const}
			verticalPadding={16}
		/>
	);
}

interface ArtistListSkeletonProps {
	count?: number;
}

export function ArtistListSkeleton({ count = 5 }: ArtistListSkeletonProps) {
	return (
		<MediaListSkeleton
			count={count}
			shape="circular"
			artworkSize={56}
			lines={2}
			primaryWidth={'55%' as const}
			secondaryWidth={'25%' as const}
			verticalPadding={16}
		/>
	);
}
