/**
 * ProgressStylePicker Types
 *
 * Props interfaces for the progress style picker and its subcomponents.
 */

import type { useAppTheme } from '@/lib/theme';
import type { ProgressBarStyle } from '@/src/application/state/settings-store';

export interface StyleCardProps {
	readonly style: ProgressBarStyle;
	readonly label: string;
	readonly isSelected: boolean;
	readonly onSelect: (style: ProgressBarStyle) => void;
	readonly colors: ReturnType<typeof useAppTheme>['colors'];
}

export interface ProgressStylePickerProps {
	readonly value: ProgressBarStyle;
	readonly onValueChange: (style: ProgressBarStyle) => void;
}

export const PREVIEW_PROGRESS = 0.4;

export const STYLE_OPTIONS: readonly { value: ProgressBarStyle; label: string }[] = [
	{ value: 'expressive', label: 'M3 Expressive' },
	{ value: 'expressive-variant', label: 'M3 Expressive (variant)' },
	{ value: 'basic', label: 'Basic' },
] as const;
