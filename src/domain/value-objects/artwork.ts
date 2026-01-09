/**
 * Size hint for artwork
 */
export type ArtworkSize = 'small' | 'medium' | 'large' | 'original';

/**
 * Artwork value object representing an image URL with dimensions.
 */
export interface Artwork {
  /** Image URL */
  readonly url: string;
  /** Image width in pixels */
  readonly width?: number;
  /** Image height in pixels */
  readonly height?: number;
  /** Size category hint */
  readonly size?: ArtworkSize;
}

/**
 * Create an Artwork object
 */
export function createArtwork(
  url: string,
  width?: number,
  height?: number,
  size?: ArtworkSize
): Artwork {
  return Object.freeze({
    url,
    width,
    height,
    size: size ?? inferArtworkSize(width),
  });
}

/**
 * Infer artwork size from dimensions
 */
export function inferArtworkSize(width?: number): ArtworkSize {
  if (width === undefined) return 'medium';
  if (width <= 100) return 'small';
  if (width <= 300) return 'medium';
  if (width <= 640) return 'large';
  return 'original';
}

/**
 * Get the best artwork from a list based on preferred size
 */
export function getBestArtwork(
  artworks: Artwork[] | undefined,
  preferredSize: number = 300
): Artwork | undefined {
  if (!artworks || artworks.length === 0) {
    return undefined;
  }

  // If we have exact dimensions, find the closest match
  const withDimensions = artworks.filter(a => a.width !== undefined);

  if (withDimensions.length > 0) {
    return withDimensions.reduce((best, current) => {
      const bestDiff = Math.abs((best.width ?? 0) - preferredSize);
      const currentDiff = Math.abs((current.width ?? 0) - preferredSize);
      return currentDiff < bestDiff ? current : best;
    });
  }

  // Fall back to size hints
  const sizeOrder: ArtworkSize[] = ['medium', 'large', 'small', 'original'];

  for (const size of sizeOrder) {
    const artwork = artworks.find(a => a.size === size);
    if (artwork) return artwork;
  }

  // Return first available
  return artworks[0];
}

/**
 * Get the largest available artwork
 */
export function getLargestArtwork(artworks: Artwork[] | undefined): Artwork | undefined {
  if (!artworks || artworks.length === 0) {
    return undefined;
  }

  return artworks.reduce((best, current) => {
    const bestSize = (best.width ?? 0) * (best.height ?? 0);
    const currentSize = (current.width ?? 0) * (current.height ?? 0);
    return currentSize > bestSize ? current : best;
  });
}

/**
 * Get the smallest available artwork
 */
export function getSmallestArtwork(artworks: Artwork[] | undefined): Artwork | undefined {
  if (!artworks || artworks.length === 0) {
    return undefined;
  }

  // Filter out zero dimensions first
  const validArtworks = artworks.filter(a => (a.width ?? 0) > 0);

  if (validArtworks.length === 0) {
    return artworks[0];
  }

  return validArtworks.reduce((best, current) => {
    const bestSize = (best.width ?? Infinity) * (best.height ?? Infinity);
    const currentSize = (current.width ?? Infinity) * (current.height ?? Infinity);
    return currentSize < bestSize ? current : best;
  });
}

/**
 * Get artwork by specific size category
 */
export function getArtworkBySize(
  artworks: Artwork[] | undefined,
  size: ArtworkSize
): Artwork | undefined {
  if (!artworks || artworks.length === 0) {
    return undefined;
  }

  return artworks.find(a => a.size === size);
}
