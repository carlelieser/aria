/**
 * WavyPlayButton Types
 *
 * Props interface for the wavy play button component.
 */

export interface WavyPlayButtonProps {
	readonly isLoading: boolean;
	readonly isPlaying: boolean;
	readonly onPress: () => void;
	readonly color: string;
	readonly iconColor: string;
	readonly size: 'sm' | 'md' | 'lg';
}
