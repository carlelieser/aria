/**
 * Text Component Types
 *
 * Typography variant definitions and props interfaces.
 */

import type React from 'react';
import type { TextStyle } from 'react-native';

/**
 * Legacy variant names mapped to M3 typography
 */
export type LegacyVariant =
	| 'default'
	| 'h1'
	| 'h2'
	| 'h3'
	| 'h4'
	| 'p'
	| 'blockquote'
	| 'code'
	| 'lead'
	| 'large'
	| 'small'
	| 'muted';

/**
 * M3 Typography variants from Paper
 */
export type M3Variant =
	| 'displayLarge'
	| 'displayMedium'
	| 'displaySmall'
	| 'headlineLarge'
	| 'headlineMedium'
	| 'headlineSmall'
	| 'titleLarge'
	| 'titleMedium'
	| 'titleSmall'
	| 'bodyLarge'
	| 'bodyMedium'
	| 'bodySmall'
	| 'labelLarge'
	| 'labelMedium'
	| 'labelSmall';

export type TextVariant = LegacyVariant | M3Variant;

export interface TextProps {
	/** Typography variant */
	readonly variant?: TextVariant;
	/** Text content */
	readonly children?: React.ReactNode;
	/** Additional style */
	readonly style?: TextStyle;
	/** Number of lines before truncation */
	readonly numberOfLines?: number;
	/** Ellipsis mode */
	readonly ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
	/** Text alignment */
	readonly align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
	/** Accessibility role */
	readonly accessibilityRole?: 'text' | 'header' | 'link' | 'none';
	/** Selectable text */
	readonly selectable?: boolean;
	/** Press handler (makes text tappable) */
	readonly onPress?: () => void;
}
