/**
 * TrackListItemSkeleton Component
 *
 * Skeleton loading state for track list items.
 * Uses M3 theming.
 */

import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/components/ui/skeleton';

export function TrackListItemSkeleton() {
	return (
		<View style={styles.container}>
			<Skeleton width={48} height={48} rounded="lg" />

			<View style={styles.textContainer}>
				<Skeleton width="70%" height={16} rounded="sm" />
				<Skeleton width="50%" height={14} rounded="sm" />
			</View>

			<Skeleton width={36} height={14} rounded="sm" />
			<Skeleton width={24} height={24} rounded="full" />
		</View>
	);
}

interface TrackListSkeletonProps {
	count?: number;
}

export function TrackListSkeleton({ count = 6 }: TrackListSkeletonProps) {
	return (
		<View>
			{Array.from({ length: count }).map((_, index) => (
				<TrackListItemSkeleton key={index} />
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		width: '100%',
		gap: 16,
		paddingVertical: 16,
	},
	textContainer: {
		flex: 1,
		gap: 8,
	},
});
