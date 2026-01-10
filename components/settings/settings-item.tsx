/**
 * SettingsItem Component
 *
 * A reusable settings row with icon, title, subtitle, and optional chevron.
 * Uses M3 theming.
 */

import { View, Pressable, StyleSheet } from 'react-native';
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

export function SettingsItem({
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

	const content = (
		<View style={styles.container}>
			<View
				style={[
					styles.iconContainer,
					{
						backgroundColor: destructive
							? `${colors.error}1A`
							: colors.surfaceContainerHighest,
					},
				]}
			>
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
			<Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
				{content}
			</Pressable>
		);
	}

	return content;
}

const styles = StyleSheet.create({
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
	pressed: {
		opacity: 0.7,
	},
});
