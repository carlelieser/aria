import type { TrackId } from '@domain/value-objects/track-id';
import type { Lyrics, LyricsLine } from '../../../core/interfaces/metadata-provider';
import type { LrcLibLyricsResponse } from './client';

const LRC_LINE_REGEX = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

export function parseSyncedLyrics(syncedLyricsText: string): LyricsLine[] {
	const lines: LyricsLine[] = [];

	for (const line of syncedLyricsText.split('\n')) {
		const match = line.match(LRC_LINE_REGEX);
		if (!match) continue;

		const [, minutes, seconds, milliseconds, text] = match;
		const msMultiplier = milliseconds.length === 2 ? 10 : 1;

		const startTime =
			parseInt(minutes, 10) * 60 * 1000 +
			parseInt(seconds, 10) * 1000 +
			parseInt(milliseconds, 10) * msMultiplier;

		const trimmedText = text.trim();
		if (trimmedText) {
			lines.push({
				startTime,
				text: trimmedText,
			});
		}
	}

	// Add end times based on next line's start time
	for (let i = 0; i < lines.length - 1; i++) {
		lines[i] = {
			...lines[i],
			endTime: lines[i + 1].startTime,
		};
	}

	return lines;
}

export function mapLrcLibResponseToLyrics(
	response: LrcLibLyricsResponse,
	trackId: TrackId
): Lyrics {
	const syncedLyrics = response.syncedLyrics
		? parseSyncedLyrics(response.syncedLyrics)
		: undefined;

	return {
		trackId,
		syncedLyrics,
		plainLyrics: response.plainLyrics ?? undefined,
		source: 'lrclib',
		attribution: `Lyrics from LRCLIB (ID: ${response.id})`,
	};
}
