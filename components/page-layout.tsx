/**
 * PageLayout
 *
 * Shared page layout component that provides consistent structure
 * for all screens including SafeAreaView, optional header with icon/title,
 * and themed backgrounds.
 */

import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Text, IconButton } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import { ChevronLeftIcon, type LucideIcon } from 'lucide-react-native';
import { useAppTheme } from '@/lib/theme';
import type { ReactNode } from 'react';

interface PageHeaderProps {
	/** Icon displayed before the title */
	icon?: LucideIcon;
	/** Page title */
	title: string;
	/** Show back button (navigates back) */
	showBack?: boolean;
	/** Custom back handler */
	onBack?: () => void;
	/** Right side actions */
	rightActions?: ReactNode;
	/** Show bottom border */
	showBorder?: boolean;
	/** Use smaller title variant (for detail pages) */
	compact?: boolean;
}

interface PageLayoutProps {
	/** Header configuration. Omit for headerless pages */
	header?: PageHeaderProps;
	/** SafeAreaView edges. Defaults to ['top'] */
	edges?: Edge[];
	/** Content padding. Set to false to disable */
	contentPadding?: boolean;
	/** Additional container style */
	style?: StyleProp<ViewStyle>;
	/** Additional content container style */
	contentStyle?: StyleProp<ViewStyle>;
	/** Page content */
	children: ReactNode;
}

export function PageLayout({
	header,
	edges = ['top'],
	contentPadding = false,
	style,
	contentStyle,
	children,
}: PageLayoutProps) {
	const { colors } = useAppTheme();

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor: colors.background }, style]}
			edges={edges}
		>
			{header && <PageHeader {...header} />}
			<View
				style={[
					styles.content,
					contentPadding && styles.contentPadding,
					contentStyle,
				]}
			>
				{children}
			</View>
		</SafeAreaView>
	);
}

function PageHeader({
	icon: IconComponent,
	title,
	showBack = false,
	onBack,
	rightActions,
	showBorder = true,
	compact = false,
}: PageHeaderProps) {
	const { colors } = useAppTheme();

	const handleBack = () => {
		if (onBack) {
			onBack();
		} else {
			router.back();
		}
	};

	return (
		<View
			style={[
				styles.header,
				showBorder && { borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
			]}
		>
			{showBack && (
				<IconButton
					icon={() => <Icon as={ChevronLeftIcon} size={24} color={colors.onSurface} />}
					onPress={handleBack}
				/>
			)}
			<View style={[styles.headerTitle]}>
				{IconComponent && !showBack && (
					<Icon as={IconComponent} size={28} color={colors.primary} />
				)}
				<Text
					variant={compact ? 'titleLarge' : 'headlineMedium'}
					style={{
						color: colors.onSurface,
						fontWeight: compact ? '600' : '700',
						flex: showBack ? 1 : undefined,
					}}
				>
					{title}
				</Text>
			</View>
			{rightActions && <View style={styles.rightActions}>{rightActions}</View>}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 16,
	},
	headerTitle: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		flex: 1,
	},
	rightActions: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	content: {
		flex: 1,
	},
	contentPadding: {
		paddingHorizontal: 16,
	},
});
