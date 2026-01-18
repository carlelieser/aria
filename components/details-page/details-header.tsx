/**
 * DetailsHeader
 *
 * Reusable header component for detail pages showing artwork,
 * title, metadata, and optional action button.
 *
 * Supports scoped theming via colors prop for dynamic artwork-based styling.
 */

import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Text } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import { useAppTheme } from '@/lib/theme';
import type { M3ColorScheme } from '@/lib/theme/colors';
import type { DetailsHeaderInfo } from './types';

const DEFAULT_ARTWORK_SIZE = 160;
const CIRCULAR_ARTWORK_SIZE = 120;

interface DetailsHeaderProps {
	readonly info: DetailsHeaderInfo;
	readonly colors?: M3ColorScheme;
}

export function DetailsHeader({ info, colors: colorsProp }: DetailsHeaderProps) {
	const { colors: appColors } = useAppTheme();
	const colors = colorsProp ?? appColors;

	const isCircular = info.artworkShape === 'circular';
	const artworkSize =
		info.artworkSize ?? (isCircular ? CIRCULAR_ARTWORK_SIZE : DEFAULT_ARTWORK_SIZE);
	const borderRadius = isCircular ? artworkSize / 2 : 12;

	const artworkStyle = {
		width: artworkSize,
		height: artworkSize,
		borderRadius,
	};

	return (
		<View style={styles.container}>
			{info.artworkUrl ? (
				<Image
					source={{ uri: info.artworkUrl }}
					style={[styles.artwork, artworkStyle]}
					contentFit="cover"
					transition={200}
				/>
			) : (
				<View
					style={[
						styles.artwork,
						styles.placeholder,
						artworkStyle,
						{ backgroundColor: colors.surfaceContainerHighest },
					]}
				>
					<Icon
						as={info.placeholderIcon}
						size={isCircular ? 48 : 64}
						color={colors.onSurfaceVariant}
					/>
				</View>
			)}

			<View style={styles.textContainer}>
				<Text variant="headlineSmall" style={[styles.title, { color: colors.onSurface }]}>
					{info.title}
				</Text>

				{info.metadata && info.metadata.length > 0 && (
					<View style={styles.metadataContainer}>
						{info.metadata.map((line, index) => (
							<View key={index} style={styles.metadataLine}>
								{index > 0 && (
									<Text
										variant="bodySmall"
										style={{ color: colors.onSurfaceVariant }}
									>
										•
									</Text>
								)}
								<Text
									variant={
										line.variant === 'primary' ? 'bodyMedium' : 'bodySmall'
									}
									style={{ color: colors.onSurfaceVariant }}
								>
									{line.text}
								</Text>
							</View>
						))}
					</View>
				)}
			</View>

			{info.actionButton}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		gap: 16,
		paddingHorizontal: 16,
	},
	artwork: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	placeholder: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	textContainer: {
		alignItems: 'center',
		gap: 4,
	},
	title: {
		fontWeight: '700',
		textAlign: 'center',
	},
	metadataContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: 8,
	},
	metadataLine: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
});
