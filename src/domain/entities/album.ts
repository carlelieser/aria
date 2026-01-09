import type { ArtistReference } from './artist';
import type { Artwork } from '../value-objects/artwork';

export type AlbumType = 'album' | 'single' | 'ep' | 'compilation';

export interface Album {
	readonly id: string;

	readonly name: string;

	readonly artists: ArtistReference[];

	readonly artwork?: Artwork[];

	readonly releaseDate?: string;

	readonly trackCount?: number;

	readonly totalDurationMs?: number;

	readonly albumType?: AlbumType;

	readonly genres?: string[];

	readonly copyrights?: string[];
}

export interface AlbumReference {
	readonly id: string;
	readonly name: string;
}

export function toAlbumReference(album: Album): AlbumReference {
	return {
		id: album.id,
		name: album.name,
	};
}

export function getAlbumYear(album: Album): number | undefined {
	if (!album.releaseDate) return undefined;

	const year = parseInt(album.releaseDate.substring(0, 4), 10);
	return isNaN(year) ? undefined : year;
}
