/**
 * MediaListItemSkeleton Component
 *
 * Unified skeleton loading state for media list items.
 * Supports different artwork shapes, sizes, and text line configurations.
 * This is the base skeleton component used by all media list skeletons.
 */

import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/components/ui/skeleton';

type WidthValue = number | `${number}%`;

export interface MediaListItemSkeletonProps {
	/** Artwork shape */
	shape?: 'rounded' | 'circular';
	/** Artwork size (48 for tracks, 56 for albums/artists/playlists) */
	artworkSize?: 48 | 56;
	/** Number of text lines to show (1-3) */
	lines?: 1 | 2 | 3;
	/** Width of primary text line */
	primaryWidth?: WidthValue;
	/** Width of secondary text line */
	secondaryWidth?: WidthValue;
	/** Width of tertiary text line */
	tertiaryWidth?: WidthValue;
	/** Show right accessory placeholder */
	showAccessory?: boolean;
	/** Vertical padding (12 for compact, 16 for standard) */
	verticalPadding?: 12 | 16;
}

export function MediaListItemSkeleton({
	shape = 'rounded',
	artworkSize = 48,
	lines = 2,
	primaryWidth = '55%' as const,
	secondaryWidth = '35%' as const,
	tertiaryWidth = '25%' as const,
	showAccessory = false,
	verticalPadding = 12,
}: MediaListItemSkeletonProps) {
	const artworkRounded = shape === 'circular' ? 'full' : artworkSize === 56 ? 'lg' : 'sm';

	return (
		<View style={[styles.container, { paddingVertical: verticalPadding }]}>
			<Skeleton width={artworkSize} height={artworkSize} rounded={artworkRounded} />

			<View style={styles.textContainer}>
				<Skeleton width={primaryWidth} height={16} rounded="sm" />
				{lines >= 2 && <Skeleton width={secondaryWidth} height={14} rounded="sm" />}
				{lines >= 3 && <Skeleton width={tertiaryWidth} height={12} rounded="sm" />}
			</View>

			{showAccessory && <Skeleton width={32} height={14} rounded="sm" />}
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
	},
	textContainer: {
		flex: 1,
		gap: 6,
	},
});
