/**
 * PageLayout Types
 *
 * Props interfaces for PageLayout and PageHeader components.
 */

import type { ViewStyle, StyleProp } from 'react-native';
import type { Edge } from 'react-native-safe-area-context';
import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';

export interface PageHeaderProps {
	readonly icon?: LucideIcon;
	readonly title?: string;
	readonly showBack?: boolean;
	readonly onBack?: () => void;
	readonly rightActions?: ReactNode;
	readonly showBorder?: boolean;
	readonly backgroundColor?: string;
	readonly tintColor?: string;
	readonly transparent?: boolean;
	/** Element rendered behind the header when transparent (e.g. animated background) */
	readonly transparentBackground?: ReactNode;
	readonly borderRadius?: number;
	readonly belowTitle?: ReactNode;
	readonly extended?: boolean;
	readonly topInset?: number;
}

export interface PageLayoutProps {
	readonly header?: PageHeaderProps;
	readonly edges?: Edge[];
	readonly contentPadding?: boolean;
	readonly style?: StyleProp<ViewStyle>;
	readonly contentStyle?: StyleProp<ViewStyle>;
	readonly children: ReactNode;
}
