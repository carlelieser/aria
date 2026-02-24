import { describe, it, expect } from 'vitest';
import {
	getPrimaryArtistName,
	matchesBaseFilters,
	extractUniqueArtistsFromItems,
	extractUniqueAlbumsFromItems,
	countBaseActiveFilters,
	hasBaseActiveFilters,
	type BaseFilters,
	type Filterable,
	type HasArtists,
	type HasAlbum,
} from '@domain/utils/core-filtering';

function makeFilterable(
	overrides: {
		id?: string;
		artists?: { id: string; name: string }[];
		albumId?: string;
	} = {}
): Filterable {
	return {
		id: { value: overrides.id ?? 'track-1', sourceType: 'youtube-music' },
		artists: overrides.artists ?? [{ id: 'a1', name: 'Artist A' }],
		album: overrides.albumId ? { id: overrides.albumId } : undefined,
	};
}

function makeBaseFilters(overrides: Partial<BaseFilters> = {}): BaseFilters {
	return {
		favoritesOnly: false,
		artistIds: [],
		albumIds: [],
		providerIds: [],
		...overrides,
	};
}

describe('core-filtering', () => {
	describe('getPrimaryArtistName', () => {
		it('should return first artist name', () => {
			const item: HasArtists = {
				artists: [
					{ id: 'a1', name: 'Alice' },
					{ id: 'a2', name: 'Bob' },
				],
			};

			const result = getPrimaryArtistName(item);

			expect(result).toBe('Alice');
		});

		it('should return empty string when artists array is empty', () => {
			const item: HasArtists = { artists: [] };

			const result = getPrimaryArtistName(item);

			expect(result).toBe('');
		});
	});

	describe('matchesBaseFilters', () => {
		it('should return true when no filters are active', () => {
			const item = makeFilterable();
			const filters = makeBaseFilters();

			const result = matchesBaseFilters(item, filters, new Set());

			expect(result).toBe(true);
		});

		it('should filter by favorites when favoritesOnly is true', () => {
			const item = makeFilterable({ id: 'track-1' });
			const filters = makeBaseFilters({ favoritesOnly: true });
			const favoriteIds = new Set(['track-1']);

			const result = matchesBaseFilters(item, filters, favoriteIds);

			expect(result).toBe(true);
		});

		it('should exclude non-favorites when favoritesOnly is true', () => {
			const item = makeFilterable({ id: 'track-1' });
			const filters = makeBaseFilters({ favoritesOnly: true });

			const result = matchesBaseFilters(item, filters, new Set());

			expect(result).toBe(false);
		});

		it('should filter by artist ids', () => {
			const item = makeFilterable({ artists: [{ id: 'a1', name: 'Alice' }] });
			const filters = makeBaseFilters({ artistIds: ['a1'] });

			const result = matchesBaseFilters(item, filters, new Set());

			expect(result).toBe(true);
		});

		it('should exclude items not matching artist ids', () => {
			const item = makeFilterable({ artists: [{ id: 'a1', name: 'Alice' }] });
			const filters = makeBaseFilters({ artistIds: ['a2'] });

			const result = matchesBaseFilters(item, filters, new Set());

			expect(result).toBe(false);
		});

		it('should match when any artist id matches', () => {
			const item = makeFilterable({
				artists: [
					{ id: 'a1', name: 'Alice' },
					{ id: 'a2', name: 'Bob' },
				],
			});
			const filters = makeBaseFilters({ artistIds: ['a2'] });

			const result = matchesBaseFilters(item, filters, new Set());

			expect(result).toBe(true);
		});

		it('should filter by album ids', () => {
			const item = makeFilterable({ albumId: 'album-1' });
			const filters = makeBaseFilters({ albumIds: ['album-1'] });

			const result = matchesBaseFilters(item, filters, new Set());

			expect(result).toBe(true);
		});

		it('should exclude items not matching album ids', () => {
			const item = makeFilterable({ albumId: 'album-1' });
			const filters = makeBaseFilters({ albumIds: ['album-2'] });

			const result = matchesBaseFilters(item, filters, new Set());

			expect(result).toBe(false);
		});

		it('should exclude items with no album when album filter is active', () => {
			const item = makeFilterable();
			const filters = makeBaseFilters({ albumIds: ['album-1'] });

			const result = matchesBaseFilters(item, filters, new Set());

			expect(result).toBe(false);
		});

		it('should apply all filters together', () => {
			const item = makeFilterable({
				id: 'track-1',
				artists: [{ id: 'a1', name: 'Alice' }],
				albumId: 'album-1',
			});
			const filters = makeBaseFilters({
				favoritesOnly: true,
				artistIds: ['a1'],
				albumIds: ['album-1'],
			});
			const favoriteIds = new Set(['track-1']);

			const result = matchesBaseFilters(item, filters, favoriteIds);

			expect(result).toBe(true);
		});
	});

	describe('extractUniqueArtistsFromItems', () => {
		it('should extract unique artists sorted by name', () => {
			const items: HasArtists[] = [
				{ artists: [{ id: 'a2', name: 'Bob' }] },
				{ artists: [{ id: 'a1', name: 'Alice' }] },
				{ artists: [{ id: 'a2', name: 'Bob' }] },
			];

			const result = extractUniqueArtistsFromItems(items);

			expect(result).toHaveLength(2);
			expect(result[0].name).toBe('Alice');
			expect(result[1].name).toBe('Bob');
		});

		it('should return empty array for empty input', () => {
			const result = extractUniqueArtistsFromItems([]);

			expect(result).toEqual([]);
		});

		it('should handle items with multiple artists', () => {
			const items: HasArtists[] = [
				{
					artists: [
						{ id: 'a1', name: 'Alice' },
						{ id: 'a2', name: 'Bob' },
					],
				},
			];

			const result = extractUniqueArtistsFromItems(items);

			expect(result).toHaveLength(2);
		});
	});

	describe('extractUniqueAlbumsFromItems', () => {
		it('should extract unique albums sorted by name', () => {
			const items: HasAlbum[] = [
				{ album: { id: 'al2', name: 'Bravo' } },
				{ album: { id: 'al1', name: 'Alpha' } },
				{ album: { id: 'al2', name: 'Bravo' } },
			];

			const result = extractUniqueAlbumsFromItems(items);

			expect(result).toHaveLength(2);
			expect(result[0].name).toBe('Alpha');
			expect(result[1].name).toBe('Bravo');
		});

		it('should skip items without albums', () => {
			const items: HasAlbum[] = [
				{ album: undefined },
				{ album: { id: 'al1', name: 'Alpha' } },
			];

			const result = extractUniqueAlbumsFromItems(items);

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('Alpha');
		});

		it('should return empty array for empty input', () => {
			const result = extractUniqueAlbumsFromItems([]);

			expect(result).toEqual([]);
		});
	});

	describe('countBaseActiveFilters', () => {
		it('should return 0 when no filters are active', () => {
			const filters = makeBaseFilters();

			const result = countBaseActiveFilters(filters);

			expect(result).toBe(0);
		});

		it('should count favoritesOnly as 1', () => {
			const filters = makeBaseFilters({ favoritesOnly: true });

			const result = countBaseActiveFilters(filters);

			expect(result).toBe(1);
		});

		it('should count each artist id', () => {
			const filters = makeBaseFilters({ artistIds: ['a1', 'a2'] });

			const result = countBaseActiveFilters(filters);

			expect(result).toBe(2);
		});

		it('should count each album id', () => {
			const filters = makeBaseFilters({ albumIds: ['al1'] });

			const result = countBaseActiveFilters(filters);

			expect(result).toBe(1);
		});

		it('should sum all active filter counts', () => {
			const filters = makeBaseFilters({
				favoritesOnly: true,
				artistIds: ['a1', 'a2'],
				albumIds: ['al1'],
			});

			const result = countBaseActiveFilters(filters);

			expect(result).toBe(4);
		});
	});

	describe('hasBaseActiveFilters', () => {
		it('should return false when no filters are active', () => {
			const filters = makeBaseFilters();

			const result = hasBaseActiveFilters(filters);

			expect(result).toBe(false);
		});

		it('should return true when favoritesOnly is true', () => {
			const filters = makeBaseFilters({ favoritesOnly: true });

			const result = hasBaseActiveFilters(filters);

			expect(result).toBe(true);
		});

		it('should return true when artist ids are set', () => {
			const filters = makeBaseFilters({ artistIds: ['a1'] });

			const result = hasBaseActiveFilters(filters);

			expect(result).toBe(true);
		});

		it('should return true when album ids are set', () => {
			const filters = makeBaseFilters({ albumIds: ['al1'] });

			const result = hasBaseActiveFilters(filters);

			expect(result).toBe(true);
		});
	});
});
