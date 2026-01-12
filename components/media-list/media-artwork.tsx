/**
 * MediaArtwork Component
 *
 * Shared artwork display for media list items.
 * Handles image loading with fallback icon.
 */

import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import type { LucideIcon } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { useAppTheme, M3Shapes } from '@/lib/theme';

const DEFAULT_SIZE = 48;

export interface MediaArtworkProps {
	/** Artwork URL (optional - shows fallback icon if missing) */
	url?: string;
	/** Size in pixels (default: 48) */
	size?: number;
	/** Shape variant */
	shape?: 'rounded' | 'circular';
	/** Fallback icon when no artwork */
	fallbackIcon: LucideIcon;
	/** Unique key for image recycling (for FlashList optimization) */
	recyclingKey?: string;
}

export const MediaArtwork = memo(function MediaArtwork({
	url,
	size = DEFAULT_SIZE,
	shape = 'rounded',
	fallbackIcon,
	recyclingKey,
}: MediaArtworkProps) {
	const { colors } = useAppTheme();
	const borderRadius = shape === 'circular' ? size / 2 : M3Shapes.small;

	return (
		<View
			style={[
				styles.container,
				{
					width: size,
					height: size,
					borderRadius,
					backgroundColor: colors.surfaceContainerHighest,
				},
			]}
		>
			{url ? (
				<Image
					source={{ uri: url }}
					style={[styles.image, { width: size, height: size, borderRadius }]}
					contentFit="cover"
					transition={200}
					cachePolicy="memory-disk"
					recyclingKey={recyclingKey}
				/>
			) : (
				<Icon as={fallbackIcon} size={24} color={colors.onSurfaceVariant} />
			)}
		</View>
	);
});

const styles = StyleSheet.create({
	container: {
		justifyContent: 'center',
		alignItems: 'center',
		overflow: 'hidden',
	},
	image: {
		position: 'absolute',
	},
});
