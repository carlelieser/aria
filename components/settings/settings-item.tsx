/**
 * SettingsItem Component
 *
 * A reusable settings row with icon, title, subtitle, and optional chevron.
 * Uses M3 theming.
 */

import { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { RectButton } from 'react-native-gesture-handler';
import { Text } from 'react-native-paper';
import { ChevronRightIcon, type LucideIcon } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { useAppTheme } from '@/lib/theme';

interface SettingsItemProps {
	icon: LucideIcon;
	title: string;
	subtitle?: string;
	subtitleElement?: React.ReactNode;
	onPress?: () => void;
	destructive?: boolean;
	showChevron?: boolean;
	rightElement?: React.ReactNode;
}

export const SettingsItem = memo(function SettingsItem({
	icon: IconComponent,
	title,
	subtitle,
	subtitleElement,
	onPress,
	destructive = false,
	showChevron = false,
	rightElement,
}: SettingsItemProps) {
	const { colors } = useAppTheme();

	// Memoize dynamic style to prevent object recreation on every render
	const iconContainerStyle = useMemo(
		() => [
			styles.iconContainer,
			{
				backgroundColor: destructive
					? `${colors.error}1A`
					: colors.surfaceContainerHighest,
			},
		],
		[destructive, colors.error, colors.surfaceContainerHighest]
	);

	const content = (
		<View style={styles.container}>
			<View style={iconContainerStyle}>
				<Icon
					as={IconComponent}
					size={20}
					color={destructive ? colors.error : colors.onSurface}
				/>
			</View>
			<View style={styles.content}>
				<Text
					variant="bodyMedium"
					style={[styles.title, { color: destructive ? colors.error : colors.onSurface }]}
				>
					{title}
				</Text>
				{subtitleElement ??
					(subtitle && (
						<Text
							variant="bodySmall"
							numberOfLines={1}
							style={{ color: colors.onSurfaceVariant }}
						>
							{subtitle}
						</Text>
					))}
			</View>
			{rightElement}
			{showChevron && (
				<Icon as={ChevronRightIcon} size={20} color={colors.onSurfaceVariant} />
			)}
		</View>
	);

	if (onPress) {
		return (
			<RectButton onPress={onPress} style={styles.button}>
				{content}
			</RectButton>
		);
	}

	return content;
});

const styles = StyleSheet.create({
	button: {
		backgroundColor: 'transparent',
	},
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 16,
		paddingVertical: 14,
		paddingHorizontal: 16,
	},
	iconContainer: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	content: {
		flex: 1,
	},
	title: {
		fontWeight: '500',
	},
});
