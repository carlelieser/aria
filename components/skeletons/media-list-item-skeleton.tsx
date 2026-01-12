/**
 * MediaListItemSkeleton Component
 *
 * Unified skeleton loading state for media list items.
 * Supports different artwork shapes and text line configurations.
 */

import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/components/ui/skeleton';

export interface MediaListItemSkeletonProps {
	/** Artwork shape */
	shape?: 'rounded' | 'circular';
	/** Number of text lines to show (1-3) */
	lines?: 1 | 2 | 3;
	/** Show right accessory placeholder */
	showAccessory?: boolean;
}

export function MediaListItemSkeleton({
	shape = 'rounded',
	lines = 2,
	showAccessory = false,
}: MediaListItemSkeletonProps) {
	return (
		<View style={styles.container}>
			<Skeleton
				width={48}
				height={48}
				rounded={shape === 'circular' ? 'full' : 'sm'}
			/>

			<View style={styles.textContainer}>
				<Skeleton width="55%" height={16} rounded="sm" />
				{lines >= 2 && <Skeleton width="35%" height={14} rounded="sm" />}
				{lines >= 3 && <Skeleton width="25%" height={12} rounded="sm" />}
			</View>

			{showAccessory && (
				<Skeleton width={32} height={14} rounded="sm" />
			)}
		</View>
	);
}

interface MediaListSkeletonProps extends MediaListItemSkeletonProps {
	count?: number;
}

export function MediaListSkeleton({ count = 5, ...itemProps }: MediaListSkeletonProps) {
	return (
		<View>
			{Array.from({ length: count }).map((_, index) => (
				<MediaListItemSkeleton key={index} {...itemProps} />
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
		paddingVertical: 12,
	},
	textContainer: {
		flex: 1,
		gap: 6,
	},
});
