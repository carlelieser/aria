/**
 * PageLayout Types
 *
 * Props interfaces for PageLayout and PageHeader components.
 */

import type { ViewStyle, TextStyle, StyleProp } from 'react-native';
import type { AnimatedStyle } from 'react-native-reanimated';
import type { Edge } from 'react-native-safe-area-context';
import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';

export interface PageHeaderProps {
	readonly icon?: LucideIcon;
	readonly title?: string;
	/** Animated style applied to the title wrapper, e.g. to fade it in on scroll. */
	readonly titleStyle?: StyleProp<AnimatedStyle<ViewStyle>>;
	/** Static style applied to the title text itself, e.g. to override its size. */
	readonly titleTextStyle?: StyleProp<TextStyle>;
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
