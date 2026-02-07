/**
 * AlbumScreenSkeleton Component
 *
 * Skeleton loading state for album screen header and track list.
 * Uses M3 theming.
 */

import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/src/components/ui/skeleton';
import { TrackListItemSkeleton } from './track-list-item-skeleton';

export function AlbumHeaderSkeleton() {
	return (
		<View style={styles.headerContent}>
			<Skeleton width={120} height={24} rounded="md" />
			<Skeleton width={80} height={16} rounded="md" />
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
		height: 300,
		gap: 16,
		padding: 24,
		justifyContent: "flex-end"
	},
	textContainer: {
		alignItems: 'center',
		gap: 8,
	},
	trackList: {
		gap: 8,
	},
});
