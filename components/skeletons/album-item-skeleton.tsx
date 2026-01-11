/**
 * AlbumItemSkeleton Component
 *
 * Skeleton loading state for album list items.
 * Uses M3 theming.
 */

import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/components/ui/skeleton';

export function AlbumItemSkeleton() {
	return (
		<View style={styles.container}>
			<Skeleton width={56} height={56} rounded="lg" />

			<View style={styles.textContainer}>
				<Skeleton width="55%" height={16} rounded="sm" />
				<Skeleton width="40%" height={14} rounded="sm" />
			</View>
		</View>
	);
}

interface AlbumListSkeletonProps {
	count?: number;
}

export function AlbumListSkeleton({ count = 5 }: AlbumListSkeletonProps) {
	return (
		<View>
			{Array.from({ length: count }).map((_, index) => (
				<AlbumItemSkeleton key={index} />
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
