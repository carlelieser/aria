import { describe, it, expect } from 'vitest';
import {
	UNKNOWN_ARTIST,
	mapArtistReference,
	mapArtistReferences,
	mapArtistReferencesStrict,
	type ArtistLike,
} from '@shared/mappers/artist-mapper';

describe('artist-mapper', () => {
	describe('UNKNOWN_ARTIST', () => {
		it('should have id of "unknown"', () => {
			expect(UNKNOWN_ARTIST.id).toBe('unknown');
		});

		it('should have name of "Unknown Artist"', () => {
			expect(UNKNOWN_ARTIST.name).toBe('Unknown Artist');
		});

		it('should be frozen', () => {
			expect(Object.isFrozen(UNKNOWN_ARTIST)).toBe(true);
		});
	});

	describe('mapArtistReference', () => {
		it('should map artist with id and name', () => {
			const artist: ArtistLike = { id: 'a1', name: 'Alice' };

			const result = mapArtistReference(artist);

			expect(result.id).toBe('a1');
			expect(result.name).toBe('Alice');
		});

		it('should use name as id when id is undefined', () => {
			const artist: ArtistLike = { name: 'Alice' };

			const result = mapArtistReference(artist);

			expect(result.id).toBe('Alice');
			expect(result.name).toBe('Alice');
		});

		it('should use idExtractor when provided', () => {
			const artist: ArtistLike = { id: 'a1', name: 'Alice' };

			const result = mapArtistReference(artist, (a) => `custom-${a.name}`);

			expect(result.id).toBe('custom-Alice');
			expect(result.name).toBe('Alice');
		});

		it('should prefer idExtractor over id property', () => {
			const artist: ArtistLike = { id: 'original-id', name: 'Alice' };

			const result = mapArtistReference(artist, () => 'extracted-id');

			expect(result.id).toBe('extracted-id');
		});
	});

	describe('mapArtistReferences', () => {
		it('should map array of artists to references', () => {
			const artists: ArtistLike[] = [
				{ id: 'a1', name: 'Alice' },
				{ id: 'a2', name: 'Bob' },
			];

			const result = mapArtistReferences(artists);

			expect(result).toHaveLength(2);
			expect(result[0].name).toBe('Alice');
			expect(result[1].name).toBe('Bob');
		});

		it('should return UNKNOWN_ARTIST array when input is undefined', () => {
			const result = mapArtistReferences(undefined);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(UNKNOWN_ARTIST);
		});

		it('should return UNKNOWN_ARTIST array when input is empty', () => {
			const result = mapArtistReferences([]);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(UNKNOWN_ARTIST);
		});

		it('should filter out artists with empty names', () => {
			const artists: ArtistLike[] = [
				{ id: 'a1', name: 'Alice' },
				{ id: 'a2', name: '' },
			];

			const result = mapArtistReferences(artists);

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('Alice');
		});

		it('should use idExtractor for all artists', () => {
			const artists: ArtistLike[] = [
				{ id: 'a1', name: 'Alice' },
				{ id: 'a2', name: 'Bob' },
			];

			const result = mapArtistReferences(artists, (a) => `prefix-${a.name}`);

			expect(result[0].id).toBe('prefix-Alice');
			expect(result[1].id).toBe('prefix-Bob');
		});
	});

	describe('mapArtistReferencesStrict', () => {
		it('should map array of artists to references', () => {
			const artists: ArtistLike[] = [
				{ id: 'a1', name: 'Alice' },
				{ id: 'a2', name: 'Bob' },
			];

			const result = mapArtistReferencesStrict(artists);

			expect(result).toHaveLength(2);
		});

		it('should return empty array when input is undefined', () => {
			const result = mapArtistReferencesStrict(undefined);

			expect(result).toEqual([]);
		});

		it('should return empty array when input is empty', () => {
			const result = mapArtistReferencesStrict([]);

			expect(result).toEqual([]);
		});

		it('should filter out artists with empty names', () => {
			const artists: ArtistLike[] = [
				{ id: 'a1', name: '' },
				{ id: 'a2', name: 'Bob' },
			];

			const result = mapArtistReferencesStrict(artists);

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('Bob');
		});

		it('should use idExtractor when provided', () => {
			const artists: ArtistLike[] = [{ id: 'a1', name: 'Alice' }];

			const result = mapArtistReferencesStrict(artists, (a) => `strict-${a.name}`);

			expect(result[0].id).toBe('strict-Alice');
		});
	});
});
