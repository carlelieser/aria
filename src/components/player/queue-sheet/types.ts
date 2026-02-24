/**
 * Queue Sheet Types
 *
 * Shared prop interfaces for the queue sheet component family.
 */

import type { Track } from '@/src/domain/entities/track';

export interface QueueSheetProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
}

export interface QueueHeaderProps {
	readonly trackCount: number;
	readonly onClear: () => void;
}

export interface QueueTrackItemProps {
	readonly track: Track;
	readonly index: number;
	readonly isActive: boolean;
	readonly isPlaying: boolean;
	readonly drag: () => void;
	readonly isDragging: boolean;
	readonly onRemove: (index: number) => void;
	readonly onPlay: (index: number) => void;
}
