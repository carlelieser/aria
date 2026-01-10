/**
 * ArtistItemSkeleton Component
 *
 * Skeleton loading state for artist list items.
 * Uses M3 theming.
 */

import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/components/ui/skeleton';

export function ArtistItemSkeleton() {
	return (
		<View style={styles.container}>
			<Skeleton width={56} height={56} rounded="full" />

			<View style={styles.textContainer}>
				<Skeleton width="55%" height={16} rounded="sm" />
				<Skeleton width="25%" height={14} rounded="sm" />
			</View>
		</View>
	);
}

interface ArtistListSkeletonProps {
	count?: number;
}

export function ArtistListSkeleton({ count = 5 }: ArtistListSkeletonProps) {
	return (
		<View>
			{Array.from({ length: count }).map((_, index) => (
				<ArtistItemSkeleton key={index} />
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
