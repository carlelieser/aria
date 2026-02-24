/**
 * AccentColorPicker Types
 *
 * Shared types, interfaces, and color preset data.
 */

import { SEED_COLOR } from '@/lib/theme/colors';
import type { useAppTheme } from '@/lib/theme';

export const CUSTOM_COLORS = [
	{ value: '#7C3AED', label: 'Violet' },
	{ value: '#2563EB', label: 'Blue' },
	{ value: '#0891B2', label: 'Cyan' },
	{ value: '#059669', label: 'Emerald' },
	{ value: '#16A34A', label: 'Green' },
	{ value: '#CA8A04', label: 'Yellow' },
	{ value: '#EA580C', label: 'Orange' },
	{ value: '#DC2626', label: 'Red' },
	{ value: '#DB2777', label: 'Pink' },
	{ value: '#9333EA', label: 'Purple' },
	{ value: '#4F46E5', label: 'Indigo' },
	{ value: '#64748B', label: 'Slate' },
] as const;

// null = dynamic/Material You colors (wallpaper-extracted on Android 12+)
export const DYNAMIC_COLOR = { value: null, label: 'Dynamic', color: SEED_COLOR } as const;

export const ALL_COLORS = [...CUSTOM_COLORS.map((c) => ({ ...c, color: c.value })), DYNAMIC_COLOR];

export interface AccentColorPickerProps {
	readonly value: string | null;
	readonly onValueChange: (color: string | null) => void;
}

export type ThemeColors = ReturnType<typeof useAppTheme>['colors'];
