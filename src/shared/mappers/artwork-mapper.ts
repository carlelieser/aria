/**
 * Artwork Mapper Utilities
 *
 * Shared utilities for mapping artwork/thumbnails across plugins.
 */

import { createArtwork, type Artwork } from '@domain/value-objects/artwork';

/**
 * Minimal interface for image-like objects from external APIs.
 * Supports both undefined and null for optional dimensions.
 */
export interface ImageLike {
	readonly url: string;
	readonly width?: number | null;
	readonly height?: number | null;
}

/**
 * Options for artwork mapping.
 */
export interface ArtworkMapperOptions {
	/**
	 * Function to transform/upgrade image URLs (e.g., for higher resolution).
	 */
	readonly urlTransformer?: (url: string) => string;
	/**
	 * Target size for the primary (first) artwork item.
	 */
	readonly primarySize?: number;
	/**
	 * Whether to sort images by resolution (largest first).
	 */
	readonly sortByResolution?: boolean;
}

/**
 * Maps an array of image-like objects to Artwork value objects.
 * Returns an empty array if input is empty or undefined.
 */
export function mapImagesToArtwork<T extends ImageLike>(
	images: readonly T[] | undefined,
	options?: ArtworkMapperOptions
): Artwork[] {
	if (!images || images.length === 0) {
		return [];
	}

	const validImages = images.filter((img) => img.url);
	if (validImages.length === 0) {
		return [];
	}

	const sortedImages = options?.sortByResolution
		? [...validImages].sort(
				(a, b) => (b.width ?? 0) * (b.height ?? 0) - (a.width ?? 0) * (a.height ?? 0)
			)
		: validImages;

	const result: Artwork[] = [];
	const urlTransformer = options?.urlTransformer;
	const primarySize = options?.primarySize;

	for (let i = 0; i < sortedImages.length; i++) {
		const img = sortedImages[i];
		// Convert null to undefined for createArtwork compatibility
		const width = img.width ?? undefined;
		const height = img.height ?? undefined;

		// For the first image, optionally apply URL transformation and custom size
		if (i === 0 && urlTransformer && primarySize) {
			const transformedUrl = urlTransformer(img.url);
			result.push(createArtwork(transformedUrl, primarySize, primarySize));
		}

		result.push(createArtwork(img.url, width, height));
	}

	return result;
}

/**
 * Simple mapper without URL transformation.
 * Suitable for APIs that provide optimal image URLs (like Spotify).
 */
export function mapSimpleImagesToArtwork<T extends ImageLike>(
	images: readonly T[] | undefined
): Artwork[] {
	return mapImagesToArtwork(images);
}
