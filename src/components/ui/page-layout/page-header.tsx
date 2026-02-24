/**
 * PageHeader Component
 *
 * Header bar with optional back button, title, icon, and right actions.
 */

import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { Text, IconButton } from 'react-native-paper';
import { Icon } from '@/src/components/ui/icon';
import { ChevronLeftIcon } from 'lucide-react-native';
import { useAppTheme, resolveDisplayFont } from '@/lib/theme';
import type { PageHeaderProps } from './types';

export function PageHeader({
	icon: IconComponent,
	title,
	showBack = false,
	onBack,
	rightActions,
	showBorder = false,
	backgroundColor,
	tintColor,
	transparent = false,
	borderRadius,
	belowTitle,
	extended = false,
	topInset = 0,
}: PageHeaderProps) {
	const { colors } = useAppTheme();
	const iconColor = tintColor ?? colors.primary;
	const titleColor = tintColor ?? colors.onSurface;

	const handleBack = () => {
		if (onBack) {
			onBack();
		} else {
			router.back();
		}
	};

	const effectiveBg = transparent ? undefined : backgroundColor;

	const headerContainerStyle: StyleProp<ViewStyle> = [
		styles.headerContainer,
		effectiveBg ? { backgroundColor: effectiveBg } : undefined,
		borderRadius
			? { borderBottomLeftRadius: borderRadius, borderBottomRightRadius: borderRadius }
			: undefined,
		!effectiveBg && showBorder
			? { borderBottomWidth: 1, borderBottomColor: colors.outlineVariant }
			: undefined,
		extended ? { paddingTop: topInset } : undefined,
	];

	return (
		<View
			style={[
				headerContainerStyle,
				effectiveBg ? { backgroundColor: effectiveBg } : undefined,
			]}
		>
			<View style={styles.header}>
				{showBack && (
					<IconButton
						icon={() => <Icon as={ChevronLeftIcon} size={24} color={iconColor} />}
						onPress={handleBack}
						style={styles.iconButtonCircle}
					/>
				)}
				<View style={[styles.headerTitle]}>
					{IconComponent && !showBack && (
						<View
							style={[styles.iconCircle, { backgroundColor: `${colors.primary}10` }]}
						>
							<Icon as={IconComponent} size={24} color={colors.primary} />
						</View>
					)}
					{title && (
						<Text
							variant={'headlineMedium'}
							style={{
								fontFamily: resolveDisplayFont('700'),
								flex: showBack ? 1 : undefined,
								color: titleColor,
							}}
						>
							{title}
						</Text>
					)}
				</View>
				{rightActions && <View style={styles.rightActions}>{rightActions}</View>}
			</View>
			{belowTitle}
		</View>
	);
}

const styles = StyleSheet.create({
	headerContainer: {
		paddingTop: 4,
		paddingBottom: 16,
		gap: 14,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingTop: 16,
	},
	headerTitle: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 16,
		flex: 1,
	},
	iconButtonCircle: {
		marginRight: 8,
	},
	iconCircle: {
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: 'center',
		justifyContent: 'center',
	},
	rightActions: {
		flexDirection: 'row',
		alignItems: 'center',
	},
});
