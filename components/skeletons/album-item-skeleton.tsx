/**
 * AlbumItemSkeleton Component
 *
 * Skeleton loading state for album list items.
 * Uses the unified MediaListItemSkeleton with album-specific configuration.
 */

import { MediaListItemSkeleton, MediaListSkeleton } from './media-list-item-skeleton';

export function AlbumItemSkeleton() {
	return (
		<MediaListItemSkeleton
			shape="rounded"
			artworkSize={56}
			lines={2}
			primaryWidth={'55%' as const}
			secondaryWidth={'40%' as const}
			verticalPadding={16}
		/>
	);
}

interface AlbumListSkeletonProps {
	count?: number;
}

export function AlbumListSkeleton({ count = 5 }: AlbumListSkeletonProps) {
	return (
		<MediaListSkeleton
			count={count}
			shape="rounded"
			artworkSize={56}
			lines={2}
			primaryWidth={'55%' as const}
			secondaryWidth={'40%' as const}
			verticalPadding={16}
		/>
	);
}
