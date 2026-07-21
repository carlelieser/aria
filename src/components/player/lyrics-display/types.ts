/**
 * LyricsDisplay Types
 *
 * Props interfaces for the lyrics display and its subcomponents.
 */

export interface LyricsDisplayProps {
	readonly maxHeight?: number;
	readonly onLineTap?: (timeMs: number) => void;
}

export interface LyricLineProps {
	readonly text: string;
	readonly startTime: number;
	readonly isActive: boolean;
	readonly isPast: boolean;
	readonly onSeek: (startTime: number) => void;
}
