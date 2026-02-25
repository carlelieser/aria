/**
 * DetailsHeader
 *
 * YouTube Music-inspired header with a localized blur glow behind the
 * cover art and centered vertical content stack.
 *
 * The glow is created by rendering the artwork inside a larger container
 * and applying a BlurView over it. The blur naturally diffuses the image
 * into the surrounding page background at the edges.
 */

import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/src/components/ui/icon';
import { useAppTheme } from '@/lib/theme';
import type { M3ColorScheme } from '@/lib/theme/colors';
import type { DetailsHeaderInfo } from './types';

const ARTWORK_SIZE_SQUARE = 200;
const ARTWORK_SIZE_CIRCULAR = 160;
/** Approximate height of the PageHeader bar below the safe area inset */
const PAGE_HEADER_HEIGHT = 84;
const BLUR_INTENSITY = 80;

interface DetailsHeaderProps {
	readonly info: DetailsHeaderInfo;
	readonly colors?: M3ColorScheme;
	readonly topFadeColor?: string;
	readonly fadeColor?: string;
}

export function DetailsHeader({
	info,
	colors: colorsProp,
	topFadeColor,
	fadeColor,
}: DetailsHeaderProps) {
	const { colors: appColors } = useAppTheme();
	const colors = colorsProp ?? appColors;
	const insets = useSafeAreaInsets();

	const isCircular = info.artworkShape === 'circular';
	const artworkSize =
		info.artworkSize ?? (isCircular ? ARTWORK_SIZE_CIRCULAR : ARTWORK_SIZE_SQUARE);

	const topPadding = insets.top + PAGE_HEADER_HEIGHT;

	return (
		<View style={styles.container}>
			{/* Background layer: glow image + blur */}
			{info.artworkUrl && (
				<View style={styles.backgroundLayer}>
					<Image
						source={{ uri: info.artworkUrl }}
						style={StyleSheet.absoluteFill}
						contentFit={'contain'}
					/>
					<BlurView
						intensity={BLUR_INTENSITY}
						experimentalBlurMethod={'dimezisBlurView'}
						style={StyleSheet.absoluteFill}
						tint={'dark'}
					/>
				</View>
			)}

			{/* Gradient layers: top-down from artwork color, bottom-up into page background */}
			{topFadeColor && (
				<LinearGradient
					colors={[topFadeColor, 'transparent']}
					style={StyleSheet.absoluteFill}
					locations={[0, 0.5]}
				/>
			)}
			{fadeColor && (
				<LinearGradient
					colors={['transparent', fadeColor]}
					style={StyleSheet.absoluteFill}
				/>
			)}

			{/* Foreground layer: artwork, text, actions */}
			<View style={[styles.foreground, { paddingTop: topPadding }]}>
				{info.artworkUrl ? (
					<Image
						source={{ uri: info.artworkUrl }}
						style={[
							{ width: artworkSize, height: artworkSize },
							isCircular ? { borderRadius: artworkSize / 2 } : styles.squareArtwork,
						]}
						contentFit={'contain'}
						transition={200}
					/>
				) : (
					<View
						style={[
							{ width: artworkSize, height: artworkSize },
							isCircular ? { borderRadius: artworkSize / 2 } : styles.squareArtwork,
							styles.placeholder,
							{ backgroundColor: colors.surfaceContainerHighest },
						]}
					>
						<Icon as={info.placeholderIcon} size={48} color={colors.onSurfaceVariant} />
					</View>
				)}

				<View style={styles.textContent}>
					<Text
						variant={'headlineMedium'}
						style={[styles.title, { color: colors.onSurface }]}
						numberOfLines={2}
					>
						{info.title}
					</Text>

					{info.metadata && info.metadata.length > 0 && (
						<View style={styles.metadataContainer}>
							{info.metadata.map((line, index) => (
								<View key={index} style={styles.metadataLine}>
									{index > 0 && (
										<Text
											variant={'bodySmall'}
											style={{ color: colors.onSurfaceVariant }}
										>
											•
										</Text>
									)}
									<Text
										variant={'bodySmall'}
										style={{
											color: colors.onSurfaceVariant,
											textAlign: 'center',
										}}
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
		</View>
	);
}

const styles = StyleSheet.create({
	container: {},
	backgroundLayer: {
		...StyleSheet.absoluteFillObject,
	},
	foreground: {
		alignItems: 'center',
		paddingVertical: 24,
		paddingHorizontal: 24,
		gap: 12,
	},
	textContent: {
		marginTop: 12,
		alignItems: 'center',
		gap: 2,
	},
	squareArtwork: {
		borderRadius: 12,
	},
	placeholder: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	title: {
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
