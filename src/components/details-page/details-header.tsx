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
import { Icon } from '@/src/components/ui/icon';
import { useAppTheme } from '@/lib/theme';
import type { M3ColorScheme } from '@/lib/theme/colors';
import type { DetailsHeaderInfo } from './types';

interface DetailsHeaderProps {
	readonly info: DetailsHeaderInfo;
	readonly colors?: M3ColorScheme;
}

export function DetailsHeader({ info, colors: colorsProp }: DetailsHeaderProps) {
	const { colors: appColors } = useAppTheme();
	const colors = colorsProp ?? appColors;


	return (
		<View style={styles.container}>
			{info.artworkUrl ? (
				<Image
					source={{ uri: info.artworkUrl }}
					style={[styles.artwork]}
					contentFit="cover"
					transition={200}
				/>
			) : (
				<View
					style={[
						styles.artwork,
						styles.placeholder,
						{ backgroundColor: colors.surfaceContainerHighest },
					]}
				>
					<Icon as={info.placeholderIcon} size={48} color={colors.onSurfaceVariant} />
				</View>
			)}

			<View style={[styles.textContainer, {backgroundColor: `${colors.surfaceContainerLow}80`}]}>
				<Text variant="displayLarge" style={[styles.title, { color: colors.onSurface }]}>
					{info.title}
				</Text>

				{info.metadata && info.metadata.length > 0 && (
					<View style={styles.metadataContainer}>
						{info.metadata.map((line, index) => (
							<View key={index} style={styles.metadataLine}>
								{index > 0 && (
									<Text
										variant="bodySmall"
										style={{
											textAlign: 'center',
											color: colors.onSurfaceVariant,
										}}
									>
										•
									</Text>
								)}
								<Text
									variant={'bodySmall'}
									style={{ textAlign: 'center', color: colors.onSurfaceVariant }}
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
		height: 300,
		alignItems: 'flex-start',
		justifyContent: 'flex-end',
		gap: 16,
	},
	artwork: {
		width: '100%',
		height: '100%',
		position: 'absolute',
		alignItems: 'center',
		justifyContent: 'center',
	},
	placeholder: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	textContainer: {
		width: "100%",
		height: "100%",
		alignItems: 'flex-start',
		justifyContent: 'flex-end',
		padding: 24,
		gap: 4,
	},
	title: {
		fontWeight: '700',
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
