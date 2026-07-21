import { describe, it, expect, beforeEach } from 'vitest';
import { TrackId } from '@domain/value-objects/track-id';
import type { Lyrics } from '@shared/types/lyrics';

import { LyricsService } from '@/src/application/services/lyrics-service';

describe('LyricsService', () => {
	let service: LyricsService;

	beforeEach(() => {
		service = new LyricsService();
	});

	describe('findCurrentLineIndex', () => {
		const lyricsTrackId = TrackId.create('youtube-music', 'lyrics-test');
		const lyrics: Lyrics = {
			trackId: lyricsTrackId,
			plainLyrics: 'line 1\nline 2\nline 3',
			syncedLyrics: [
				{ text: 'line 1', startTime: 0, endTime: 1000 },
				{ text: 'line 2', startTime: 1000, endTime: 2000 },
				{ text: 'line 3', startTime: 2000, endTime: 3000 },
			],
		};

		it('should return -1 when synced lyrics are empty', () => {
			const emptyLyrics: Lyrics = {
				trackId: lyricsTrackId,
				plainLyrics: 'text',
				syncedLyrics: [],
			};
			const result = service.findCurrentLineIndex(emptyLyrics, 500);

			expect(result).toBe(-1);
		});

		it('should return -1 when synced lyrics are undefined', () => {
			const noSyncLyrics: Lyrics = { trackId: lyricsTrackId, plainLyrics: 'text' };
			const result = service.findCurrentLineIndex(noSyncLyrics, 500);

			expect(result).toBe(-1);
		});

		it('should return first line index when position is at the start', () => {
			const result = service.findCurrentLineIndex(lyrics, 0);

			expect(result).toBe(0);
		});

		it('should return correct line index for a mid-line position', () => {
			const result = service.findCurrentLineIndex(lyrics, 1500);

			expect(result).toBe(1);
		});

		it('should return last line index when position is at the end', () => {
			const result = service.findCurrentLineIndex(lyrics, 2500);

			expect(result).toBe(2);
		});

		it('should return -1 when position is before all lines', () => {
			const lyricsWithOffset: Lyrics = {
				trackId: lyricsTrackId,
				plainLyrics: 'text',
				syncedLyrics: [{ text: 'line 1', startTime: 5000, endTime: 6000 }],
			};
			const result = service.findCurrentLineIndex(lyricsWithOffset, 100);

			expect(result).toBe(-1);
		});

		it('should return correct index at exact boundary between lines', () => {
			const result = service.findCurrentLineIndex(lyrics, 1000);

			expect(result).toBe(1);
		});

		it('should resolve to the exact line when position is a line start (as after a tap-to-seek)', () => {
			expect(service.findCurrentLineIndex(lyrics, 2000)).toBe(2);
		});
	});
});
