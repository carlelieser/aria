import type { Artwork } from '../value-objects/artwork';

export interface Artist {
	readonly id: string;

	readonly name: string;

	readonly artwork?: Artwork[];

	readonly genres?: string[];

	readonly bio?: string;

	readonly monthlyListeners?: number;

	readonly externalUrls?: Record<string, string>;
}

export interface ArtistReference {
	readonly id: string;
	readonly name: string;
}

export function toArtistReference(artist: Artist): ArtistReference {
	return {
		id: artist.id,
		name: artist.name,
	};
}

export function formatArtistNames(artists: ArtistReference[]): string {
	if (artists.length === 0) return 'Unknown Artist';
	if (artists.length === 1) return artists[0].name;
	if (artists.length === 2) return `${artists[0].name} & ${artists[1].name}`;

	const lastArtist = artists[artists.length - 1];
	const otherArtists = artists
		.slice(0, -1)
		.map((a) => a.name)
		.join(', ');
	return `${otherArtists} & ${lastArtist.name}`;
}
