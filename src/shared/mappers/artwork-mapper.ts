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
	const seenUrls = new Set<string>();

	for (const img of sortedImages) {
		const url = urlTransformer ? urlTransformer(img.url) : img.url;

		if (seenUrls.has(url)) continue;
		seenUrls.add(url);

		// When transformer upgrades the URL resolution, use primarySize as dimensions
		const useTransformedSize = urlTransformer && primarySize && url !== img.url;
		const width = useTransformedSize ? primarySize : (img.width ?? undefined);
		const height = useTransformedSize ? primarySize : (img.height ?? undefined);

		result.push(createArtwork(url, width, height));
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
