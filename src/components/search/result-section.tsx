import { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Icon } from '@/src/components/ui/icon';
import { useAppTheme } from '@/lib/theme';
import type { LucideIcon } from 'lucide-react-native';

interface ResultSectionProps {
	readonly title: string;
	readonly icon: LucideIcon;
	readonly children: React.ReactNode;
	readonly maxItems?: number;
}

export const ResultSection = memo(function ResultSection({
	title,
	icon: IconComponent,
	children,
}: ResultSectionProps) {
	const { colors } = useAppTheme();

	const titleStyle = useMemo(
		() => ({ color: colors.onSurface, fontWeight: '600' as const }),
		[colors.onSurface]
	);

	return (
		<View style={styles.section}>
			<View style={styles.sectionHeader}>
				<Icon as={IconComponent} size={18} color={colors.primary} />
				<Text variant={'titleSmall'} style={titleStyle}>
					{title}
				</Text>
			</View>
			<View style={styles.sectionContent}>{children}</View>
		</View>
	);
});

const styles = StyleSheet.create({
	section: {
		gap: 8,
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 16,
	},
	sectionContent: {
		paddingHorizontal: 16,
		gap: 4,
	},
});
