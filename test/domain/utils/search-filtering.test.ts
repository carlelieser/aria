import { describe, it, expect } from 'vitest';
import {
	sortSearchResults,
	filterSearchResults,
	matchesSearchFilters,
	hasActiveSearchFilters,
	countActiveSearchFilters,
	hasActiveUnifiedFilters,
	countActiveUnifiedFilters,
	createRelevanceOrderMap,
	DEFAULT_SEARCH_FILTERS,
	DEFAULT_UNIFIED_FILTERS,
	type SearchFilters,
	type UnifiedSearchFilters,
} from '@domain/utils/search-filtering';
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
		durationMs?: number;
	} = {}
): Track {
	const id = overrides.id ?? 'track-1';
	return createTrack({
		id: TrackId.create('youtube-music', id),
		title: overrides.title ?? 'Test Track',
		artists: [{ id: overrides.artistId ?? 'a1', name: overrides.artistName ?? 'Artist A' }],
		album: overrides.albumId ? { id: overrides.albumId, name: 'Album' } : undefined,
		duration: Duration.fromMilliseconds(overrides.durationMs ?? 180_000),
		source: { type: 'streaming', sourcePlugin: 'youtube-music', sourceId: id },
	});
}

describe('search-filtering', () => {
	describe('DEFAULT_SEARCH_FILTERS', () => {
		it('should have default values', () => {
			expect(DEFAULT_SEARCH_FILTERS.contentType).toBe('all');
			expect(DEFAULT_SEARCH_FILTERS.favoritesOnly).toBe(false);
			expect(DEFAULT_SEARCH_FILTERS.artistIds).toEqual([]);
			expect(DEFAULT_SEARCH_FILTERS.albumIds).toEqual([]);
		});
	});

	describe('DEFAULT_UNIFIED_FILTERS', () => {
		it('should have default values', () => {
			expect(DEFAULT_UNIFIED_FILTERS.contentType).toBe('all');
			expect(DEFAULT_UNIFIED_FILTERS.favoritesOnly).toBe(false);
			expect(DEFAULT_UNIFIED_FILTERS.downloadedOnly).toBe(false);
			expect(DEFAULT_UNIFIED_FILTERS.artistIds).toEqual([]);
			expect(DEFAULT_UNIFIED_FILTERS.albumIds).toEqual([]);
		});
	});

	describe('sortSearchResults', () => {
		it('should preserve original order when sorting by relevance without order map', () => {
			const tracks = [
				makeTrack({ id: '1', title: 'Bravo' }),
				makeTrack({ id: '2', title: 'Alpha' }),
			];

			const result = sortSearchResults(tracks, 'relevance', 'asc');

			expect(result).toHaveLength(2);
		});

		it('should sort by relevance using original order map in desc direction', () => {
			const tracks = [
				makeTrack({ id: '1', title: 'First' }),
				makeTrack({ id: '2', title: 'Second' }),
			];
			const orderMap = new Map([
				['youtube-music:1', 0],
				['youtube-music:2', 1],
			]);

			const result = sortSearchResults(tracks, 'relevance', 'desc', orderMap);

			expect(result[0].title).toBe('First');
			expect(result[1].title).toBe('Second');
		});

		it('should sort by title in ascending order', () => {
			const tracks = [
				makeTrack({ id: '1', title: 'Charlie' }),
				makeTrack({ id: '2', title: 'Alpha' }),
				makeTrack({ id: '3', title: 'Bravo' }),
			];

			const result = sortSearchResults(tracks, 'title', 'asc');

			expect(result[0].title).toBe('Alpha');
			expect(result[1].title).toBe('Bravo');
			expect(result[2].title).toBe('Charlie');
		});

		it('should sort by title in descending order', () => {
			const tracks = [
				makeTrack({ id: '1', title: 'Alpha' }),
				makeTrack({ id: '2', title: 'Charlie' }),
			];

			const result = sortSearchResults(tracks, 'title', 'desc');

			expect(result[0].title).toBe('Charlie');
			expect(result[1].title).toBe('Alpha');
		});

		it('should sort by artist name', () => {
			const tracks = [
				makeTrack({ id: '1', artistName: 'Zara' }),
				makeTrack({ id: '2', artistName: 'Alice' }),
			];

			const result = sortSearchResults(tracks, 'artist', 'asc');

			expect(result[0].artists[0].name).toBe('Alice');
			expect(result[1].artists[0].name).toBe('Zara');
		});

		it('should sort by duration', () => {
			const tracks = [
				makeTrack({ id: '1', durationMs: 300_000 }),
				makeTrack({ id: '2', durationMs: 120_000 }),
			];

			const result = sortSearchResults(tracks, 'duration', 'asc');

			expect(result[0].duration.totalMilliseconds).toBe(120_000);
			expect(result[1].duration.totalMilliseconds).toBe(300_000);
		});

		it('should not mutate the original array', () => {
			const tracks = [makeTrack({ id: '1', title: 'B' }), makeTrack({ id: '2', title: 'A' })];
			const originalFirst = tracks[0];

			sortSearchResults(tracks, 'title', 'asc');

			expect(tracks[0]).toBe(originalFirst);
		});
	});

	describe('filterSearchResults', () => {
		it('should return all tracks when no filters are active', () => {
			const tracks = [makeTrack({ id: '1' }), makeTrack({ id: '2' })];

			const result = filterSearchResults(tracks, DEFAULT_SEARCH_FILTERS, new Set());

			expect(result).toHaveLength(2);
		});

		it('should filter by favorites', () => {
			const tracks = [makeTrack({ id: '1' }), makeTrack({ id: '2' })];
			const filters: SearchFilters = { ...DEFAULT_SEARCH_FILTERS, favoritesOnly: true };

			const result = filterSearchResults(tracks, filters, new Set(['youtube-music:1']));

			expect(result).toHaveLength(1);
		});
	});

	describe('matchesSearchFilters', () => {
		it('should delegate to matchesBaseFilters', () => {
			const track = makeTrack({ id: '1' });
			const filters: SearchFilters = { ...DEFAULT_SEARCH_FILTERS, favoritesOnly: true };

			const result = matchesSearchFilters(track, filters, new Set(['youtube-music:1']));

			expect(result).toBe(true);
		});
	});

	describe('hasActiveSearchFilters', () => {
		it('should return false when all filters are defaults', () => {
			const result = hasActiveSearchFilters(DEFAULT_SEARCH_FILTERS);

			expect(result).toBe(false);
		});

		it('should return true when contentType is not all', () => {
			const filters: SearchFilters = { ...DEFAULT_SEARCH_FILTERS, contentType: 'tracks' };

			const result = hasActiveSearchFilters(filters);

			expect(result).toBe(true);
		});

		it('should return true when favoritesOnly is true', () => {
			const filters: SearchFilters = { ...DEFAULT_SEARCH_FILTERS, favoritesOnly: true };

			const result = hasActiveSearchFilters(filters);

			expect(result).toBe(true);
		});
	});

	describe('countActiveSearchFilters', () => {
		it('should return 0 when no filters are active', () => {
			const result = countActiveSearchFilters(DEFAULT_SEARCH_FILTERS);

			expect(result).toBe(0);
		});

		it('should count contentType as 1 when not all', () => {
			const filters: SearchFilters = { ...DEFAULT_SEARCH_FILTERS, contentType: 'albums' };

			const result = countActiveSearchFilters(filters);

			expect(result).toBe(1);
		});

		it('should count all active filters', () => {
			const filters: SearchFilters = {
				contentType: 'tracks',
				favoritesOnly: true,
				artistIds: ['a1'],
				albumIds: ['al1', 'al2'],
				providerIds: [],
			};

			const result = countActiveSearchFilters(filters);

			expect(result).toBe(5);
		});
	});

	describe('hasActiveUnifiedFilters', () => {
		it('should return false when all filters are defaults', () => {
			const result = hasActiveUnifiedFilters(DEFAULT_UNIFIED_FILTERS);

			expect(result).toBe(false);
		});

		it('should return true when downloadedOnly is true', () => {
			const filters: UnifiedSearchFilters = {
				...DEFAULT_UNIFIED_FILTERS,
				downloadedOnly: true,
			};

			const result = hasActiveUnifiedFilters(filters);

			expect(result).toBe(true);
		});

		it('should return true when contentType is not all', () => {
			const filters: UnifiedSearchFilters = {
				...DEFAULT_UNIFIED_FILTERS,
				contentType: 'artists',
			};

			const result = hasActiveUnifiedFilters(filters);

			expect(result).toBe(true);
		});
	});

	describe('countActiveUnifiedFilters', () => {
		it('should return 0 when no filters are active', () => {
			const result = countActiveUnifiedFilters(DEFAULT_UNIFIED_FILTERS);

			expect(result).toBe(0);
		});

		it('should count downloadedOnly as 1', () => {
			const filters: UnifiedSearchFilters = {
				...DEFAULT_UNIFIED_FILTERS,
				downloadedOnly: true,
			};

			const result = countActiveUnifiedFilters(filters);

			expect(result).toBe(1);
		});

		it('should count all active filters together', () => {
			const filters: UnifiedSearchFilters = {
				contentType: 'tracks',
				favoritesOnly: true,
				downloadedOnly: true,
				artistIds: ['a1'],
				albumIds: [],
				providerIds: [],
			};

			const result = countActiveUnifiedFilters(filters);

			expect(result).toBe(4);
		});
	});

	describe('createRelevanceOrderMap', () => {
		it('should create map with track id to index mapping', () => {
			const tracks = [makeTrack({ id: 'first' }), makeTrack({ id: 'second' })];

			const result = createRelevanceOrderMap(tracks);

			expect(result.get('youtube-music:first')).toBe(0);
			expect(result.get('youtube-music:second')).toBe(1);
		});

		it('should return empty map for empty tracks array', () => {
			const result = createRelevanceOrderMap([]);

			expect(result.size).toBe(0);
		});
	});
});
