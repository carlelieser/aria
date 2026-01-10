/**
 * Button Component
 *
 * M3-compliant button using React Native Paper.
 * Maintains similar API to the previous implementation for easier migration.
 */

import React from 'react';
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Button as PaperButton, IconButton as PaperIconButton } from 'react-native-paper';
import { useAppTheme } from '@/lib/theme';

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

interface ButtonProps {
	/** Button variant style */
	variant?: ButtonVariant;
	/** Button size */
	size?: ButtonSize;
	/** Button content (children) */
	children?: React.ReactNode;
	/** Press handler */
	onPress?: () => void;
	/** Disabled state */
	disabled?: boolean;
	/** Loading state */
	loading?: boolean;
	/** Icon to display (for icon buttons or leading icon) */
	icon?: string | React.ReactNode;
	/** Additional style */
	style?: ViewStyle;
	/** Additional label style */
	labelStyle?: TextStyle;
	/** Content description for accessibility */
	accessibilityLabel?: string;
	/** Compact mode (less padding) */
	compact?: boolean;
}

/**
 * Map our variants to Paper button modes
 */
function getButtonMode(
	variant: ButtonVariant
): 'text' | 'outlined' | 'contained' | 'elevated' | 'contained-tonal' {
	switch (variant) {
		case 'default':
			return 'contained';
		case 'destructive':
			return 'contained';
		case 'outline':
			return 'outlined';
		case 'secondary':
			return 'contained-tonal';
		case 'ghost':
			return 'text';
		case 'link':
			return 'text';
		default:
			return 'contained';
	}
}

/**
 * Get button size styles
 */
function getSizeStyles(size: ButtonSize): {
	contentStyle: ViewStyle;
	labelStyle: TextStyle;
} {
	switch (size) {
		case 'sm':
			return {
				contentStyle: { height: 32, paddingHorizontal: 12 },
				labelStyle: { fontSize: 13 },
			};
		case 'lg':
			return {
				contentStyle: { height: 48, paddingHorizontal: 24 },
				labelStyle: { fontSize: 16 },
			};
		case 'icon':
			return {
				contentStyle: { width: 48, height: 48, padding: 0 },
				labelStyle: {},
			};
		default:
			return {
				contentStyle: { height: 40, paddingHorizontal: 16 },
				labelStyle: { fontSize: 14 },
			};
	}
}

export function Button({
	variant = 'default',
	size = 'default',
	children,
	onPress,
	disabled = false,
	loading = false,
	icon,
	style,
	labelStyle,
	accessibilityLabel,
	compact = false,
}: ButtonProps) {
	const { colors } = useAppTheme();

	// For icon-only buttons, use IconButton
	if (size === 'icon' && icon && !children) {
		const iconSize = 24;
		const iconColor =
			variant === 'destructive'
				? colors.error
				: variant === 'ghost' || variant === 'link'
					? colors.onSurface
					: colors.primary;

		return (
			<PaperIconButton
				icon={typeof icon === 'string' ? icon : () => icon}
				iconColor={iconColor}
				size={iconSize}
				onPress={onPress}
				disabled={disabled}
				style={[styles.iconButton, style]}
				accessibilityLabel={accessibilityLabel}
				mode={variant === 'outline' ? 'outlined' : 'contained-tonal'}
			/>
		);
	}

	const mode = getButtonMode(variant);
	const sizeStyles = getSizeStyles(size);

	// Get variant-specific colors
	let buttonColor: string | undefined;
	let textColor: string | undefined;

	if (variant === 'destructive') {
		buttonColor = colors.error;
		textColor = colors.onError;
	}

	return (
		<PaperButton
			mode={mode}
			onPress={onPress}
			disabled={disabled}
			loading={loading}
			icon={icon ? (typeof icon === 'string' ? icon : () => icon) : undefined}
			buttonColor={buttonColor}
			textColor={textColor}
			compact={compact}
			contentStyle={[sizeStyles.contentStyle, style]}
			labelStyle={[sizeStyles.labelStyle, labelStyle]}
			accessibilityLabel={accessibilityLabel}
			style={variant === 'link' ? styles.linkButton : undefined}
		>
			{children}
		</PaperButton>
	);
}

const styles = StyleSheet.create({
	iconButton: {
		margin: 0,
	},
	linkButton: {
		minWidth: 0,
	},
});

export type { ButtonProps, ButtonVariant, ButtonSize };
