import { describe, it, expect } from 'vitest';
import {
	toArtistReference,
	formatArtistNames,
	type Artist,
	type ArtistReference,
} from '@domain/entities/artist';

describe('Artist Entity', () => {
	describe('toArtistReference', () => {
		it('should extract id and name from artist', () => {
			const artist: Artist = {
				id: 'artist123',
				name: 'Test Artist',
				genres: ['Rock', 'Pop'],
				bio: 'A great artist',
				monthlyListeners: 1000000,
			};

			const reference = toArtistReference(artist);

			expect(reference.id).toBe('artist123');
			expect(reference.name).toBe('Test Artist');
		});

		it('should not include extra properties', () => {
			const artist: Artist = {
				id: 'artist123',
				name: 'Test Artist',
				genres: ['Rock'],
				artwork: [{ url: 'https://example.com/image.jpg' }],
			};

			const reference = toArtistReference(artist);

			expect(Object.keys(reference)).toEqual(['id', 'name']);
			expect((reference as unknown as Artist).genres).toBeUndefined();
			expect((reference as unknown as Artist).artwork).toBeUndefined();
		});
	});

	describe('formatArtistNames', () => {
		it('should return Unknown Artist for empty array', () => {
			const result = formatArtistNames([]);
			expect(result).toBe('Unknown Artist');
		});

		it('should return single artist name as-is', () => {
			const artists: ArtistReference[] = [{ id: '1', name: 'Solo Artist' }];

			expect(formatArtistNames(artists)).toBe('Solo Artist');
		});

		it('should join two artists with ampersand', () => {
			const artists: ArtistReference[] = [
				{ id: '1', name: 'Artist One' },
				{ id: '2', name: 'Artist Two' },
			];

			expect(formatArtistNames(artists)).toBe('Artist One & Artist Two');
		});

		it('should join three artists with commas and ampersand', () => {
			const artists: ArtistReference[] = [
				{ id: '1', name: 'Artist One' },
				{ id: '2', name: 'Artist Two' },
				{ id: '3', name: 'Artist Three' },
			];

			expect(formatArtistNames(artists)).toBe('Artist One, Artist Two & Artist Three');
		});

		it('should handle many artists correctly', () => {
			const artists: ArtistReference[] = [
				{ id: '1', name: 'A' },
				{ id: '2', name: 'B' },
				{ id: '3', name: 'C' },
				{ id: '4', name: 'D' },
				{ id: '5', name: 'E' },
			];

			expect(formatArtistNames(artists)).toBe('A, B, C, D & E');
		});

		it('should handle artists with special characters in names', () => {
			const artists: ArtistReference[] = [
				{ id: '1', name: "Artist O'Brien" },
				{ id: '2', name: 'Artist & Co.' },
			];

			expect(formatArtistNames(artists)).toBe("Artist O'Brien & Artist & Co.");
		});
	});

	describe('Artist interface', () => {
		it('should support all optional properties', () => {
			const fullArtist: Artist = {
				id: 'artist123',
				name: 'Complete Artist',
				artwork: [
					{ url: 'https://example.com/small.jpg', width: 100, height: 100 },
					{ url: 'https://example.com/large.jpg', width: 500, height: 500 },
				],
				genres: ['Rock', 'Alternative', 'Indie'],
				bio: 'A biography of the artist describing their musical journey and achievements.',
				monthlyListeners: 5000000,
				externalUrls: {
					spotify: 'https://open.spotify.com/artist/123',
					youtube: 'https://youtube.com/@artist',
					website: 'https://artist.com',
				},
			};

			expect(fullArtist.id).toBe('artist123');
			expect(fullArtist.artwork).toHaveLength(2);
			expect(fullArtist.genres).toContain('Rock');
			expect(fullArtist.monthlyListeners).toBe(5000000);
			expect(fullArtist.externalUrls?.spotify).toContain('spotify.com');
		});

		it('should work with minimal properties', () => {
			const minimalArtist: Artist = {
				id: 'artist123',
				name: 'Minimal Artist',
			};

			expect(minimalArtist.id).toBe('artist123');
			expect(minimalArtist.name).toBe('Minimal Artist');
			expect(minimalArtist.artwork).toBeUndefined();
			expect(minimalArtist.genres).toBeUndefined();
			expect(minimalArtist.bio).toBeUndefined();
			expect(minimalArtist.monthlyListeners).toBeUndefined();
			expect(minimalArtist.externalUrls).toBeUndefined();
		});
	});
});
