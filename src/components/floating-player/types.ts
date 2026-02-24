/**
 * FloatingPlayer Types
 *
 * Props interfaces for the floating player subcomponents.
 */

export interface PlayerContentProps {
	readonly artworkUrl: string | undefined;
	readonly trackId: string | undefined;
	readonly title: string | undefined;
	readonly artistNames: string;
	readonly isPlaying: boolean;
	readonly showLoadingIndicator: boolean;
	readonly isLoading: boolean;
	readonly onPlayPause: () => void;
	readonly onSkipPrevious: () => void;
	readonly onSkipNext: () => void;
	readonly onOpenQueue: () => void;
}
