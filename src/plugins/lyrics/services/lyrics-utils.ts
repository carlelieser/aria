import type { Lyrics } from '../../core/interfaces/metadata-provider';

export function findCurrentLineIndex(lyrics: Lyrics, positionMs: number): number {
	if (!lyrics.syncedLyrics || lyrics.syncedLyrics.length === 0) {
		return -1;
	}

	const lines = lyrics.syncedLyrics;

	// Binary search for the current line
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
			// Position is past this line's end, but before next line
			// This can happen in gaps between lines
			return result;
		}
	}

	return result;
}
