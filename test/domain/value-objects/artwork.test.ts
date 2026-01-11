import { describe, it, expect } from 'vitest';
import {
	createArtwork,
	inferArtworkSize,
	getBestArtwork,
	getLargestArtwork,
	getSmallestArtwork,
	getArtworkBySize,
	type Artwork,
} from '@domain/value-objects/artwork';

describe('Artwork', () => {
	describe('createArtwork', () => {
		it('should create artwork with all properties', () => {
			const artwork = createArtwork('https://example.com/image.jpg', 300, 300, 'medium');
			expect(artwork.url).toBe('https://example.com/image.jpg');
			expect(artwork.width).toBe(300);
			expect(artwork.height).toBe(300);
			expect(artwork.size).toBe('medium');
		});

		it('should create artwork with url only', () => {
			const artwork = createArtwork('https://example.com/image.jpg');
			expect(artwork.url).toBe('https://example.com/image.jpg');
			expect(artwork.width).toBeUndefined();
			expect(artwork.height).toBeUndefined();
			expect(artwork.size).toBe('medium');
		});

		it('should infer size from width when not provided', () => {
			const artwork = createArtwork('https://example.com/image.jpg', 500);
			expect(artwork.size).toBe('large');
		});

		it('should be frozen', () => {
			const artwork = createArtwork('https://example.com/image.jpg');
			expect(Object.isFrozen(artwork)).toBe(true);
		});
	});

	describe('inferArtworkSize', () => {
		it('should return medium for undefined width', () => {
			expect(inferArtworkSize(undefined)).toBe('medium');
		});

		it('should return small for width <= 100', () => {
			expect(inferArtworkSize(50)).toBe('small');
			expect(inferArtworkSize(100)).toBe('small');
		});

		it('should return medium for width 101-300', () => {
			expect(inferArtworkSize(101)).toBe('medium');
			expect(inferArtworkSize(200)).toBe('medium');
			expect(inferArtworkSize(300)).toBe('medium');
		});

		it('should return large for width 301-640', () => {
			expect(inferArtworkSize(301)).toBe('large');
			expect(inferArtworkSize(500)).toBe('large');
			expect(inferArtworkSize(640)).toBe('large');
		});

		it('should return original for width > 640', () => {
			expect(inferArtworkSize(641)).toBe('original');
			expect(inferArtworkSize(1200)).toBe('original');
		});
	});

	describe('getBestArtwork', () => {
		const artworks: Artwork[] = [
			{ url: 'small.jpg', width: 100, height: 100, size: 'small' },
			{ url: 'medium.jpg', width: 300, height: 300, size: 'medium' },
			{ url: 'large.jpg', width: 600, height: 600, size: 'large' },
		];

		it('should return undefined for empty array', () => {
			expect(getBestArtwork([])).toBeUndefined();
		});

		it('should return undefined for undefined input', () => {
			expect(getBestArtwork(undefined)).toBeUndefined();
		});

		it('should return closest match to preferred size', () => {
			const result = getBestArtwork(artworks, 300);
			expect(result?.url).toBe('medium.jpg');
		});

		it('should use default preferred size of 300', () => {
			const result = getBestArtwork(artworks);
			expect(result?.url).toBe('medium.jpg');
		});

		it('should return closest smaller artwork if no exact match', () => {
			const result = getBestArtwork(artworks, 250);
			expect(result?.url).toBe('medium.jpg');
		});

		it('should prefer artworks with dimensions over those without', () => {
			const mixedArtworks: Artwork[] = [
				{ url: 'no-dims.jpg', size: 'medium' },
				{ url: 'with-dims.jpg', width: 300, height: 300, size: 'medium' },
			];
			const result = getBestArtwork(mixedArtworks, 300);
			expect(result?.url).toBe('with-dims.jpg');
		});

		it('should fall back to size preference when no dimensions available', () => {
			const noDimArtworks: Artwork[] = [
				{ url: 'large.jpg', size: 'large' },
				{ url: 'small.jpg', size: 'small' },
				{ url: 'medium.jpg', size: 'medium' },
			];
			const result = getBestArtwork(noDimArtworks, 300);
			expect(result?.url).toBe('medium.jpg');
		});

		it('should return first artwork if no size match found', () => {
			const unknownSizeArtworks: Artwork[] = [{ url: 'first.jpg' }, { url: 'second.jpg' }];
			const result = getBestArtwork(unknownSizeArtworks, 300);
			expect(result?.url).toBe('first.jpg');
		});
	});

	describe('getLargestArtwork', () => {
		it('should return undefined for empty array', () => {
			expect(getLargestArtwork([])).toBeUndefined();
		});

		it('should return undefined for undefined input', () => {
			expect(getLargestArtwork(undefined)).toBeUndefined();
		});

		it('should return artwork with largest dimensions', () => {
			const artworks: Artwork[] = [
				{ url: 'small.jpg', width: 100, height: 100 },
				{ url: 'large.jpg', width: 500, height: 500 },
				{ url: 'medium.jpg', width: 300, height: 300 },
			];
			const result = getLargestArtwork(artworks);
			expect(result?.url).toBe('large.jpg');
		});

		it('should handle artworks without dimensions', () => {
			const artworks: Artwork[] = [
				{ url: 'no-dims.jpg' },
				{ url: 'with-dims.jpg', width: 100, height: 100 },
			];
			const result = getLargestArtwork(artworks);
			expect(result?.url).toBe('with-dims.jpg');
		});
	});

	describe('getSmallestArtwork', () => {
		it('should return undefined for empty array', () => {
			expect(getSmallestArtwork([])).toBeUndefined();
		});

		it('should return undefined for undefined input', () => {
			expect(getSmallestArtwork(undefined)).toBeUndefined();
		});

		it('should return artwork with smallest dimensions', () => {
			const artworks: Artwork[] = [
				{ url: 'small.jpg', width: 100, height: 100 },
				{ url: 'large.jpg', width: 500, height: 500 },
				{ url: 'medium.jpg', width: 300, height: 300 },
			];
			const result = getSmallestArtwork(artworks);
			expect(result?.url).toBe('small.jpg');
		});

		it('should ignore zero-dimension artworks', () => {
			const artworks: Artwork[] = [
				{ url: 'zero.jpg', width: 0, height: 0 },
				{ url: 'valid.jpg', width: 100, height: 100 },
			];
			const result = getSmallestArtwork(artworks);
			expect(result?.url).toBe('valid.jpg');
		});

		it('should return first artwork if none have valid dimensions', () => {
			const artworks: Artwork[] = [{ url: 'first.jpg' }, { url: 'second.jpg' }];
			const result = getSmallestArtwork(artworks);
			expect(result?.url).toBe('first.jpg');
		});
	});

	describe('getArtworkBySize', () => {
		const artworks: Artwork[] = [
			{ url: 'small.jpg', size: 'small' },
			{ url: 'medium.jpg', size: 'medium' },
			{ url: 'large.jpg', size: 'large' },
		];

		it('should return undefined for empty array', () => {
			expect(getArtworkBySize([], 'medium')).toBeUndefined();
		});

		it('should return undefined for undefined input', () => {
			expect(getArtworkBySize(undefined, 'medium')).toBeUndefined();
		});

		it('should return artwork matching the requested size', () => {
			expect(getArtworkBySize(artworks, 'small')?.url).toBe('small.jpg');
			expect(getArtworkBySize(artworks, 'medium')?.url).toBe('medium.jpg');
			expect(getArtworkBySize(artworks, 'large')?.url).toBe('large.jpg');
		});

		it('should return undefined if size not found', () => {
			expect(getArtworkBySize(artworks, 'original')).toBeUndefined();
		});
	});
});
