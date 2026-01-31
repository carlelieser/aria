/**
 * PlaylistItemSkeleton Component
 *
 * Skeleton loading state for playlist list items.
 * Uses the unified MediaListItemSkeleton with playlist-specific configuration.
 */

import { MediaListItemSkeleton, MediaListSkeleton } from './media-list-item-skeleton';

export function PlaylistItemSkeleton() {
	return (
		<MediaListItemSkeleton
			shape="rounded"
			artworkSize={56}
			lines={2}
			primaryWidth={'60%' as const}
			secondaryWidth={'30%' as const}
			verticalPadding={16}
		/>
	);
}

interface PlaylistListSkeletonProps {
	count?: number;
}

export function PlaylistListSkeleton({ count = 5 }: PlaylistListSkeletonProps) {
	return (
		<MediaListSkeleton
			count={count}
			shape="rounded"
			artworkSize={56}
			lines={2}
			primaryWidth={'60%' as const}
			secondaryWidth={'30%' as const}
			verticalPadding={16}
		/>
	);
}
