/**
 * MediaListItem Component
 *
 * Shared layout for media list items (tracks, albums, artists, playlists).
 * Provides consistent styling with customizable content.
 */

import { memo } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import type { LucideIcon } from 'lucide-react-native';

import { useAppTheme } from '@/lib/theme';
import { MediaArtwork } from './media-artwork';

export interface MediaListItemProps {
	/** Primary text (title/name) */
	title: string;
	/** Secondary text (subtitle) */
	subtitle?: string;
	/** Tertiary text (additional info) */
	tertiaryText?: string;
	/** Press handler */
	onPress?: () => void;
	/** Long press handler */
	onLongPress?: () => void;
	/** Disabled state */
	disabled?: boolean;
	/** Artwork configuration */
	artwork: {
		url?: string;
		shape?: 'rounded' | 'circular';
		fallbackIcon: LucideIcon;
		recyclingKey?: string;
	};
	/** Right-side accessory content (duration, options menu, etc.) */
	accessory?: React.ReactNode;
}

export const MediaListItem = memo(function MediaListItem({
	title,
	subtitle,
	tertiaryText,
	onPress,
	onLongPress,
	disabled = false,
	artwork,
	accessory,
}: MediaListItemProps) {
	const { colors } = useAppTheme();

	return (
		<TouchableOpacity
			style={styles.container}
			onPress={onPress}
			onLongPress={onLongPress}
			activeOpacity={0.7}
			disabled={disabled || !onPress}
		>
			<MediaArtwork
				url={artwork.url}
				shape={artwork.shape}
				fallbackIcon={artwork.fallbackIcon}
				recyclingKey={artwork.recyclingKey}
			/>

			<View style={styles.infoContainer}>
				<Text variant="bodyLarge" numberOfLines={1} style={{ color: colors.onSurface }}>
					{title}
				</Text>
				{subtitle && (
					<Text
						variant="bodyMedium"
						numberOfLines={1}
						style={{ color: colors.onSurfaceVariant }}
					>
						{subtitle}
					</Text>
				)}
				{tertiaryText && (
					<Text
						variant="bodySmall"
						numberOfLines={1}
						style={{ color: colors.onSurfaceVariant }}
					>
						{tertiaryText}
					</Text>
				)}
			</View>

			{accessory && <View style={styles.accessory}>{accessory}</View>}
		</TouchableOpacity>
	);
});

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		width: '100%',
		gap: 16,
		paddingVertical: 12,
	},
	infoContainer: {
		flex: 1,
		flexDirection: 'column',
	},
	accessory: {
		flexShrink: 0,
	},
});
