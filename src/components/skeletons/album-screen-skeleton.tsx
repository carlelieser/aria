/**
 * AlbumScreenSkeleton Component
 *
 * Skeleton loading state for album screen header and track list.
 * Mirrors the centered vertical stack layout of DetailsHeader.
 */

import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/src/components/ui/skeleton';
import { TrackListItemSkeleton } from './track-list-item-skeleton';

const ARTWORK_SKELETON_SIZE = 200;

export function AlbumHeaderSkeleton() {
	return (
		<View style={styles.headerContent}>
			<Skeleton width={ARTWORK_SKELETON_SIZE} height={ARTWORK_SKELETON_SIZE} rounded={'lg'} />
			<Skeleton width={160} height={24} rounded={'md'} />
			<Skeleton width={100} height={14} rounded={'md'} />
		</View>
	);
}

interface AlbumTrackListSkeletonProps {
	/** Number of track skeletons to show */
	readonly count?: number;
}

export function AlbumTrackListSkeleton({ count = 8 }: AlbumTrackListSkeletonProps) {
	return (
		<View style={styles.trackList}>
			{Array.from({ length: count }).map((_, index) => (
				<TrackListItemSkeleton key={index} />
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	headerContent: {
		alignItems: 'center',
		paddingVertical: 48,
		gap: 8,
	},
	trackList: {
		gap: 8,
	},
});
