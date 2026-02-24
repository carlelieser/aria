import { describe, it, expect } from 'vitest';
import {
	mapImagesToArtwork,
	mapSimpleImagesToArtwork,
	type ImageLike,
} from '@shared/mappers/artwork-mapper';

describe('artwork-mapper', () => {
	describe('mapImagesToArtwork', () => {
		it('should map images to artwork value objects', () => {
			const images: ImageLike[] = [
				{ url: 'https://example.com/img1.jpg', width: 300, height: 300 },
			];

			const result = mapImagesToArtwork(images);

			expect(result).toHaveLength(1);
			expect(result[0].url).toBe('https://example.com/img1.jpg');
			expect(result[0].width).toBe(300);
			expect(result[0].height).toBe(300);
		});

		it('should return empty array when input is undefined', () => {
			const result = mapImagesToArtwork(undefined);

			expect(result).toEqual([]);
		});

		it('should return empty array when input is empty', () => {
			const result = mapImagesToArtwork([]);

			expect(result).toEqual([]);
		});

		it('should filter out images with empty url', () => {
			const images: ImageLike[] = [
				{ url: '', width: 300, height: 300 },
				{ url: 'https://example.com/valid.jpg', width: 200, height: 200 },
			];

			const result = mapImagesToArtwork(images);

			expect(result).toHaveLength(1);
			expect(result[0].url).toBe('https://example.com/valid.jpg');
		});

		it('should return empty array when all images have empty urls', () => {
			const images: ImageLike[] = [{ url: '' }, { url: '' }];

			const result = mapImagesToArtwork(images);

			expect(result).toEqual([]);
		});

		it('should handle null dimensions', () => {
			const images: ImageLike[] = [
				{ url: 'https://example.com/img.jpg', width: null, height: null },
			];

			const result = mapImagesToArtwork(images);

			expect(result).toHaveLength(1);
			expect(result[0].width).toBeUndefined();
			expect(result[0].height).toBeUndefined();
		});

		it('should sort by resolution when sortByResolution is true', () => {
			const images: ImageLike[] = [
				{ url: 'https://example.com/small.jpg', width: 100, height: 100 },
				{ url: 'https://example.com/large.jpg', width: 600, height: 600 },
				{ url: 'https://example.com/medium.jpg', width: 300, height: 300 },
			];

			const result = mapImagesToArtwork(images, { sortByResolution: true });

			expect(result[0].url).toBe('https://example.com/large.jpg');
			expect(result[1].url).toBe('https://example.com/medium.jpg');
			expect(result[2].url).toBe('https://example.com/small.jpg');
		});

		it('should preserve original order when sortByResolution is not set', () => {
			const images: ImageLike[] = [
				{ url: 'https://example.com/small.jpg', width: 100, height: 100 },
				{ url: 'https://example.com/large.jpg', width: 600, height: 600 },
			];

			const result = mapImagesToArtwork(images);

			expect(result[0].url).toBe('https://example.com/small.jpg');
			expect(result[1].url).toBe('https://example.com/large.jpg');
		});

		it('should apply urlTransformer when provided', () => {
			const images: ImageLike[] = [
				{ url: 'https://example.com/img.jpg', width: 100, height: 100 },
			];
			const transformer = (url: string) => url.replace('.jpg', '_large.jpg');

			const result = mapImagesToArtwork(images, { urlTransformer: transformer });

			expect(result[0].url).toBe('https://example.com/img_large.jpg');
		});

		it('should use primarySize as dimensions when url is transformed', () => {
			const images: ImageLike[] = [
				{ url: 'https://example.com/img.jpg', width: 100, height: 100 },
			];
			const transformer = (url: string) => url.replace('.jpg', '_hd.jpg');

			const result = mapImagesToArtwork(images, {
				urlTransformer: transformer,
				primarySize: 500,
			});

			expect(result[0].width).toBe(500);
			expect(result[0].height).toBe(500);
		});

		it('should keep original dimensions when url is not changed by transformer', () => {
			const images: ImageLike[] = [
				{ url: 'https://example.com/img.jpg', width: 100, height: 100 },
			];
			const transformer = (url: string) => url;

			const result = mapImagesToArtwork(images, {
				urlTransformer: transformer,
				primarySize: 500,
			});

			expect(result[0].width).toBe(100);
			expect(result[0].height).toBe(100);
		});

		it('should deduplicate images by transformed url', () => {
			const images: ImageLike[] = [
				{ url: 'https://example.com/img1.jpg', width: 100, height: 100 },
				{ url: 'https://example.com/img2.jpg', width: 200, height: 200 },
			];
			const transformer = () => 'https://example.com/same.jpg';

			const result = mapImagesToArtwork(images, { urlTransformer: transformer });

			expect(result).toHaveLength(1);
		});
	});

	describe('mapSimpleImagesToArtwork', () => {
		it('should map images without transformation', () => {
			const images: ImageLike[] = [
				{ url: 'https://example.com/img.jpg', width: 300, height: 300 },
			];

			const result = mapSimpleImagesToArtwork(images);

			expect(result).toHaveLength(1);
			expect(result[0].url).toBe('https://example.com/img.jpg');
		});

		it('should return empty array for undefined input', () => {
			const result = mapSimpleImagesToArtwork(undefined);

			expect(result).toEqual([]);
		});

		it('should return empty array for empty input', () => {
			const result = mapSimpleImagesToArtwork([]);

			expect(result).toEqual([]);
		});
	});
});
