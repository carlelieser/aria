import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Text, IconButton } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import { ChevronLeftIcon, type LucideIcon } from 'lucide-react-native';
import { useAppTheme } from '@/lib/theme';
import type { ReactNode } from 'react';

interface PageHeaderProps {
	icon?: LucideIcon;
	title: string;
	showBack?: boolean;
	onBack?: () => void;
	rightActions?: ReactNode;
	showBorder?: boolean;
	compact?: boolean;
	backgroundColor?: string;
	borderRadius?: number;
	belowTitle?: ReactNode;
	extended?: boolean;
	topInset?: number;
}

interface PageLayoutProps {
	header?: PageHeaderProps;
	edges?: Edge[];
	contentPadding?: boolean;
	style?: StyleProp<ViewStyle>;
	contentStyle?: StyleProp<ViewStyle>;
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
	const insets = useSafeAreaInsets();

	const isExtended = header?.extended ?? false;
	const effectiveEdges = isExtended ? edges.filter((e) => e !== 'top') : edges;

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor: colors.background }, style]}
			edges={effectiveEdges}
		>
			{header && <PageHeader {...header} topInset={isExtended ? insets.top : 0} />}
			<View style={[styles.content, contentPadding && styles.contentPadding, contentStyle]}>
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
	backgroundColor,
	borderRadius,
	belowTitle,
	extended = false,
	topInset = 0,
}: PageHeaderProps) {
	const { colors } = useAppTheme();

	const handleBack = () => {
		if (onBack) {
			onBack();
		} else {
			router.back();
		}
	};

	const headerContainerStyle: StyleProp<ViewStyle> = [
		styles.headerContainer,
		backgroundColor ? { backgroundColor } : undefined,
		borderRadius
			? { borderBottomLeftRadius: borderRadius, borderBottomRightRadius: borderRadius }
			: undefined,
		!backgroundColor && showBorder
			? { borderBottomWidth: 1, borderBottomColor: colors.outlineVariant }
			: undefined,
		extended ? { paddingTop: topInset } : undefined,
	];

	return (
		<View style={[headerContainerStyle, { backgroundColor }]}>
			<View style={styles.header}>
				{showBack && (
					<IconButton
						icon={() => <Icon as={ChevronLeftIcon} size={24} color={colors.primary} />}
						onPress={handleBack}
						style={styles.iconButtonCircle}
					/>
				)}
				<View style={[styles.headerTitle]}>
					{IconComponent && !showBack && (
						<View
							style={[styles.iconCircle, { backgroundColor: `${colors.primary}20` }]}
						>
							<Icon as={IconComponent} size={24} color={colors.primary} />
						</View>
					)}
					<Text
						variant={compact ? 'titleLarge' : 'headlineSmall'}
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
			{belowTitle}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	headerContainer: {
		paddingTop: 4,
		paddingBottom: 16,
		gap: 14,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
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
	content: {
		flex: 1,
	},
	contentPadding: {
		paddingHorizontal: 16,
	},
});
