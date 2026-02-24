/**
 * SettingsItem Component
 *
 * A reusable settings row with icon, title, subtitle, and optional chevron.
 * Built on react-native-paper's List.Item for M3 compliance.
 */

import { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { List } from 'react-native-paper';
import { ChevronRightIcon, type LucideIcon } from 'lucide-react-native';
import { Icon } from '@/src/components/ui/icon';
import { useAppTheme } from '@/lib/theme';

interface SettingsItemProps {
	readonly icon: LucideIcon;
	readonly iconUrl?: string;
	readonly title: string;
	readonly subtitle?: string;
	readonly subtitleElement?: React.ReactNode;
	readonly onPress?: () => void;
	readonly destructive?: boolean;
	readonly showChevron?: boolean;
	readonly rightElement?: React.ReactNode;
}

export const SettingsItem = memo(function SettingsItem({
	icon: IconComponent,
	iconUrl,
	title,
	subtitle,
	subtitleElement,
	onPress,
	destructive = false,
	showChevron = false,
	rightElement,
}: SettingsItemProps) {
	const { colors } = useAppTheme();

	const textColor = destructive ? colors.error : colors.onSurface;
	const iconBgColor = destructive ? `${colors.error}1A` : colors.surfaceContainerHighest;

	const renderLeft = useCallback(
		() => (
			<View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
				{iconUrl ? (
					<Image
						source={{ uri: iconUrl }}
						style={styles.iconImage}
						contentFit={'contain'}
						cachePolicy={'memory-disk'}
					/>
				) : (
					<Icon as={IconComponent} size={20} color={textColor} />
				)}
			</View>
		),
		[IconComponent, iconUrl, iconBgColor, textColor]
	);

	const renderRight = useCallback(() => {
		if (!rightElement && !showChevron) return null;
		return (
			<View style={styles.rightContainer}>
				{rightElement}
				{showChevron && (
					<Icon as={ChevronRightIcon} size={20} color={colors.onSurfaceVariant} />
				)}
			</View>
		);
	}, [rightElement, showChevron, colors.onSurfaceVariant]);

	const renderDescription = subtitleElement ? () => subtitleElement : subtitle || undefined;

	return (
		<List.Item
			title={title}
			description={renderDescription}
			left={renderLeft}
			right={renderRight}
			onPress={onPress}
			titleStyle={[styles.title, { color: textColor, includeFontPadding: false }]}
			descriptionStyle={{ color: colors.onSurfaceVariant, includeFontPadding: false }}
			descriptionNumberOfLines={2}
			style={styles.item}
		/>
	);
});

const styles = StyleSheet.create({
	item: {
		paddingVertical: 6,
		paddingHorizontal: 16,
	},
	iconContainer: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
	},
	iconImage: {
		width: 28,
		height: 28,
	},
	rightContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	title: {
		fontWeight: '500',
	},
});
