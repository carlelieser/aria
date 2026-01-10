/**
 * AlbumScreenSkeleton Component
 *
 * Skeleton loading state for album screen header and track list.
 * Uses M3 theming.
 */

import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/components/ui/skeleton';
import { TrackListItemSkeleton } from './track-list-item-skeleton';

interface AlbumHeaderSkeletonProps {
	/** Whether to show the search button skeleton */
	showButton?: boolean;
}

export function AlbumHeaderSkeleton({ showButton = true }: AlbumHeaderSkeletonProps) {
	return (
		<View style={styles.headerContent}>
			<Skeleton width={160} height={160} rounded="lg" />

			<View style={styles.textContainer}>
				<Skeleton width={180} height={24} rounded="md" />
				<Skeleton width={120} height={16} rounded="sm" />
				<Skeleton width={60} height={14} rounded="sm" />
			</View>

			{showButton && <Skeleton width={140} height={40} rounded="full" />}
		</View>
	);
}

interface AlbumTrackListSkeletonProps {
	/** Number of track skeletons to show */
	count?: number;
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
		gap: 16,
	},
	textContainer: {
		alignItems: 'center',
		gap: 8,
	},
	trackList: {
		gap: 8,
	},
});
