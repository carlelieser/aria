import { describe, it, expect } from 'vitest';
import {
	sortTracks,
	compareTracks,
	filterTracks,
	matchesSearch,
	matchesFilters,
	hasActiveFilters,
	countActiveFilters,
	DEFAULT_FILTERS,
	type LibraryFilters,
} from '@domain/utils/track-filtering';
import { createTrack } from '@domain/entities/track';
import { TrackId } from '@domain/value-objects/track-id';
import { Duration } from '@domain/value-objects/duration';
import type { Track } from '@domain/entities/track';

function makeTrack(
	overrides: {
		id?: string;
		title?: string;
		artistName?: string;
		artistId?: string;
		albumId?: string;
		albumName?: string;
		durationMs?: number;
		addedAt?: Date;
	} = {}
): Track {
	const id = overrides.id ?? 'track-1';
	const track = createTrack({
		id: TrackId.create('youtube-music', id),
		title: overrides.title ?? 'Test Track',
		artists: [{ id: overrides.artistId ?? 'a1', name: overrides.artistName ?? 'Artist A' }],
		album: overrides.albumId
			? { id: overrides.albumId, name: overrides.albumName ?? 'Album' }
			: undefined,
		duration: Duration.fromMilliseconds(overrides.durationMs ?? 180_000),
		source: { type: 'streaming', sourcePlugin: 'youtube-music', sourceId: id },
	});
	if (overrides.addedAt) {
		return { ...track, addedAt: overrides.addedAt };
	}
	return track;
}

describe('track-filtering', () => {
	describe('DEFAULT_FILTERS', () => {
		it('should have default values', () => {
			expect(DEFAULT_FILTERS.artistIds).toEqual([]);
			expect(DEFAULT_FILTERS.albumIds).toEqual([]);
			expect(DEFAULT_FILTERS.favoritesOnly).toBe(false);
			expect(DEFAULT_FILTERS.downloadedOnly).toBe(false);
		});
	});

	describe('sortTracks', () => {
		it('should sort by title in ascending order', () => {
			const tracks = [
				makeTrack({ id: '1', title: 'Charlie' }),
				makeTrack({ id: '2', title: 'Alpha' }),
				makeTrack({ id: '3', title: 'Bravo' }),
			];

			const result = sortTracks(tracks, 'title', 'asc');

			expect(result[0].title).toBe('Alpha');
			expect(result[1].title).toBe('Bravo');
			expect(result[2].title).toBe('Charlie');
		});

		it('should sort by title in descending order', () => {
			const tracks = [
				makeTrack({ id: '1', title: 'Alpha' }),
				makeTrack({ id: '2', title: 'Charlie' }),
			];

			const result = sortTracks(tracks, 'title', 'desc');

			expect(result[0].title).toBe('Charlie');
			expect(result[1].title).toBe('Alpha');
		});

		it('should sort by artist name', () => {
			const tracks = [
				makeTrack({ id: '1', artistName: 'Zara' }),
				makeTrack({ id: '2', artistName: 'Alice' }),
			];

			const result = sortTracks(tracks, 'artist', 'asc');

			expect(result[0].artists[0].name).toBe('Alice');
			expect(result[1].artists[0].name).toBe('Zara');
		});

		it('should sort by duration', () => {
			const tracks = [
				makeTrack({ id: '1', durationMs: 300_000 }),
				makeTrack({ id: '2', durationMs: 120_000 }),
			];

			const result = sortTracks(tracks, 'duration', 'asc');

			expect(result[0].duration.totalMilliseconds).toBe(120_000);
			expect(result[1].duration.totalMilliseconds).toBe(300_000);
		});

		it('should sort by dateAdded', () => {
			const earlier = new Date(2023, 0, 1);
			const later = new Date(2024, 0, 1);
			const tracks = [
				makeTrack({ id: '1', addedAt: later }),
				makeTrack({ id: '2', addedAt: earlier }),
			];

			const result = sortTracks(tracks, 'dateAdded', 'asc');

			expect(result[0].addedAt).toEqual(earlier);
			expect(result[1].addedAt).toEqual(later);
		});

		it('should not mutate the original array', () => {
			const tracks = [makeTrack({ id: '1', title: 'B' }), makeTrack({ id: '2', title: 'A' })];
			const originalFirst = tracks[0];

			sortTracks(tracks, 'title', 'asc');

			expect(tracks[0]).toBe(originalFirst);
		});
	});

	describe('compareTracks', () => {
		it('should return negative when first track title comes before second', () => {
			const a = makeTrack({ title: 'Alpha' });
			const b = makeTrack({ title: 'Bravo' });

			const result = compareTracks(a, b, 'title');

			expect(result).toBeLessThan(0);
		});

		it('should return 0 for equal titles', () => {
			const a = makeTrack({ title: 'Same' });
			const b = makeTrack({ title: 'Same' });

			const result = compareTracks(a, b, 'title');

			expect(result).toBe(0);
		});

		it('should handle tracks with undefined addedAt', () => {
			const a = makeTrack({ id: '1' });
			const b = makeTrack({ id: '2', addedAt: new Date() });

			const result = compareTracks(a, b, 'dateAdded');

			expect(result).toBe(1);
		});

		it('should return 0 when both addedAt are undefined', () => {
			const a = makeTrack({ id: '1' });
			const b = makeTrack({ id: '2' });

			const result = compareTracks(a, b, 'dateAdded');

			expect(result).toBe(0);
		});
	});

	describe('filterTracks', () => {
		it('should return all tracks when no search query and no filters', () => {
			const tracks = [makeTrack({ id: '1' }), makeTrack({ id: '2' })];

			const result = filterTracks(tracks, '', DEFAULT_FILTERS, new Set());

			expect(result).toHaveLength(2);
		});

		it('should filter by search query matching title', () => {
			const tracks = [
				makeTrack({ id: '1', title: 'Hello World' }),
				makeTrack({ id: '2', title: 'Goodbye World' }),
			];

			const result = filterTracks(tracks, 'hello', DEFAULT_FILTERS, new Set());

			expect(result).toHaveLength(1);
			expect(result[0].title).toBe('Hello World');
		});

		it('should filter by search query matching artist', () => {
			const tracks = [
				makeTrack({ id: '1', artistName: 'Alice' }),
				makeTrack({ id: '2', artistName: 'Bob' }),
			];

			const result = filterTracks(tracks, 'alice', DEFAULT_FILTERS, new Set());

			expect(result).toHaveLength(1);
		});

		it('should trim and lowercase search query', () => {
			const tracks = [makeTrack({ id: '1', title: 'Hello' })];

			const result = filterTracks(tracks, '  HELLO  ', DEFAULT_FILTERS, new Set());

			expect(result).toHaveLength(1);
		});

		it('should combine search query with filters', () => {
			const tracks = [
				makeTrack({ id: '1', title: 'Hello', artistId: 'a1' }),
				makeTrack({ id: '2', title: 'Hello', artistId: 'a2' }),
			];
			const filters: LibraryFilters = { ...DEFAULT_FILTERS, artistIds: ['a1'] };

			const result = filterTracks(tracks, 'hello', filters, new Set());

			expect(result).toHaveLength(1);
		});
	});

	describe('matchesSearch', () => {
		it('should match by title', () => {
			const track = makeTrack({ title: 'Bohemian Rhapsody' });

			const result = matchesSearch(track, 'bohemian');

			expect(result).toBe(true);
		});

		it('should match by artist name', () => {
			const track = makeTrack({ artistName: 'Queen' });

			const result = matchesSearch(track, 'queen');

			expect(result).toBe(true);
		});

		it('should match by album name', () => {
			const track = makeTrack({ albumId: 'a1', albumName: 'A Night at the Opera' });

			const result = matchesSearch(track, 'opera');

			expect(result).toBe(true);
		});

		it('should return false when nothing matches', () => {
			const track = makeTrack({ title: 'Song', artistName: 'Artist' });

			const result = matchesSearch(track, 'xyz');

			expect(result).toBe(false);
		});

		it('should be case insensitive', () => {
			const track = makeTrack({ title: 'HELLO WORLD' });

			const result = matchesSearch(track, 'hello');

			expect(result).toBe(true);
		});
	});

	describe('matchesFilters', () => {
		it('should return true when no filters are active', () => {
			const track = makeTrack();

			const result = matchesFilters(track, DEFAULT_FILTERS, new Set());

			expect(result).toBe(true);
		});

		it('should filter by favorites', () => {
			const track = makeTrack({ id: '1' });
			const filters: LibraryFilters = { ...DEFAULT_FILTERS, favoritesOnly: true };

			const result = matchesFilters(track, filters, new Set(['youtube-music:1']));

			expect(result).toBe(true);
		});
	});

	describe('hasActiveFilters', () => {
		it('should return false when no filters are active', () => {
			const result = hasActiveFilters(DEFAULT_FILTERS);

			expect(result).toBe(false);
		});

		it('should return true when downloadedOnly is true', () => {
			const filters: LibraryFilters = { ...DEFAULT_FILTERS, downloadedOnly: true };

			const result = hasActiveFilters(filters);

			expect(result).toBe(true);
		});

		it('should return true when favoritesOnly is true', () => {
			const filters: LibraryFilters = { ...DEFAULT_FILTERS, favoritesOnly: true };

			const result = hasActiveFilters(filters);

			expect(result).toBe(true);
		});
	});

	describe('countActiveFilters', () => {
		it('should return 0 when no filters are active', () => {
			const result = countActiveFilters(DEFAULT_FILTERS);

			expect(result).toBe(0);
		});

		it('should count downloadedOnly as 1', () => {
			const filters: LibraryFilters = { ...DEFAULT_FILTERS, downloadedOnly: true };

			const result = countActiveFilters(filters);

			expect(result).toBe(1);
		});

		it('should count all active filters', () => {
			const filters: LibraryFilters = {
				favoritesOnly: true,
				downloadedOnly: true,
				artistIds: ['a1'],
				albumIds: ['al1', 'al2'],
				providerIds: [],
			};

			const result = countActiveFilters(filters);

			expect(result).toBe(5);
		});
	});
});
