import type { Lyrics } from '@shared/types/lyrics';

/**
 * Stateless helpers for working with fetched lyrics. Lyrics fetching itself
 * lives in the lyrics plugin (see LyricsOrchestrator); this service only
 * provides pure line-matching used by the playback UI.
 */
export class LyricsService {
	findCurrentLineIndex(lyrics: Lyrics, positionMs: number): number {
		if (!lyrics.syncedLyrics || lyrics.syncedLyrics.length === 0) {
			return -1;
		}

		const lines = lyrics.syncedLyrics;

		// The active line is the last one whose start is at or before the position.
		let left = 0;
		let right = lines.length - 1;
		let result = -1;

		while (left <= right) {
			const mid = Math.floor((left + right) / 2);
			const line = lines[mid];

			if (line.startTime <= positionMs) {
				result = mid;
				left = mid + 1;
			} else {
				right = mid - 1;
			}
		}

		// Verify the line is still active (check endTime if available)
		if (result >= 0) {
			const line = lines[result];
			if (line.endTime !== undefined && positionMs > line.endTime) {
				// Position is past this line's end, but before the next line
				// (this can happen in gaps between lines).
				return result;
			}
		}

		return result;
	}
}

export const lyricsService = new LyricsService();
