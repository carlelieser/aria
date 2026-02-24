/**
 * Shared Lyrics Types
 *
 * Lyrics data structures used across layers:
 * plugins (providers), application (services), and presentation (display).
 */

import type { TrackId } from '@/src/domain/value-objects/track-id';

export interface LyricsLine {
	readonly startTime: number;

	readonly endTime?: number;

	readonly text: string;
}

export interface Lyrics {
	readonly trackId: TrackId;

	readonly language?: string;

	readonly syncedLyrics?: LyricsLine[];

	readonly plainLyrics?: string;

	readonly source?: string;

	readonly isVerified?: boolean;

	readonly attribution?: string;
}
