/**
 * TrackOptionsSheet Types
 *
 * Shared types for the TrackOptionsSheet component family.
 */

import type { LucideIcon } from 'lucide-react-native';
import type {
	useTrackOptionsTrack,
	useTrackOptionsSource,
} from '@/src/application/state/track-options-store';
import type { useAppTheme } from '@/lib/theme';

export interface ActionItem {
	readonly id: string;
	readonly label: string;
	readonly icon?: LucideIcon;
	readonly variant?: 'default' | 'destructive';
	readonly disabled?: boolean;
	readonly checked?: boolean;
	readonly iconFill?: boolean;
}

export interface TrackOptionsContentProps {
	readonly track: NonNullable<ReturnType<typeof useTrackOptionsTrack>>;
	readonly source: ReturnType<typeof useTrackOptionsSource>;
	readonly playlistId?: string;
	readonly trackPosition?: number;
	readonly onClose: () => void;
}

export type ThemeColors = ReturnType<typeof useAppTheme>['colors'];
