export type ArtworkSize = 'small' | 'medium' | 'large' | 'original';

export interface Artwork {
	readonly url: string;

	readonly width?: number;

	readonly height?: number;

	readonly size?: ArtworkSize;
}

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

export function inferArtworkSize(width?: number): ArtworkSize {
	if (width === undefined) return 'medium';
	if (width <= 100) return 'small';
	if (width <= 300) return 'medium';
	if (width <= 640) return 'large';
	return 'original';
}

export function getBestArtwork(
	artworks: Artwork[] | undefined,
	preferredSize: number = 300
): Artwork | undefined {
	if (!artworks || artworks.length === 0) {
		return undefined;
	}

	const withDimensions = artworks.filter((a) => a.width !== undefined);

	if (withDimensions.length > 0) {
		return withDimensions.reduce((best, current) => {
			const bestDiff = Math.abs((best.width ?? 0) - preferredSize);
			const currentDiff = Math.abs((current.width ?? 0) - preferredSize);
			return currentDiff < bestDiff ? current : best;
		});
	}

	const sizeOrder: ArtworkSize[] = ['medium', 'large', 'small', 'original'];

	for (const size of sizeOrder) {
		const artwork = artworks.find((a) => a.size === size);
		if (artwork) return artwork;
	}

	return artworks[0];
}

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

export function getSmallestArtwork(artworks: Artwork[] | undefined): Artwork | undefined {
	if (!artworks || artworks.length === 0) {
		return undefined;
	}

	const validArtworks = artworks.filter((a) => (a.width ?? 0) > 0);

	if (validArtworks.length === 0) {
		return artworks[0];
	}

	return validArtworks.reduce((best, current) => {
		const bestSize = (best.width ?? Infinity) * (best.height ?? Infinity);
		const currentSize = (current.width ?? Infinity) * (current.height ?? Infinity);
		return currentSize < bestSize ? current : best;
	});
}

export function getArtworkBySize(
	artworks: Artwork[] | undefined,
	size: ArtworkSize
): Artwork | undefined {
	if (!artworks || artworks.length === 0) {
		return undefined;
	}

	return artworks.find((a) => a.size === size);
}
