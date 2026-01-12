import type { Playlist } from '../entities/playlist';

/**
 * Minimal interface for artist filtering.
 * Uses structural typing to work with various artist representations.
 */
interface FilterableArtist {
	readonly name: string;
}

/**
 * Minimal interface for album filtering.
 * Uses structural typing to work with various album representations.
 */
interface FilterableAlbum {
	readonly name: string;
	readonly artistName?: string;
}

export function filterPlaylists(playlists: readonly Playlist[], searchQuery: string): Playlist[] {
	const query = searchQuery.trim().toLowerCase();

	if (!query) {
		return [...playlists];
	}

	return playlists.filter((playlist) => matchesPlaylistSearch(playlist, query));
}

export function matchesPlaylistSearch(playlist: Playlist, query: string): boolean {
	const lowerQuery = query.toLowerCase();

	if (playlist.name.toLowerCase().includes(lowerQuery)) {
		return true;
	}

	if (playlist.description?.toLowerCase().includes(lowerQuery)) {
		return true;
	}

	return false;
}

export function filterArtists<T extends FilterableArtist>(
	artists: readonly T[],
	searchQuery: string
): T[] {
	const query = searchQuery.trim().toLowerCase();

	if (!query) {
		return [...artists];
	}

	return artists.filter((artist) => matchesArtistSearch(artist, query));
}

export function matchesArtistSearch(artist: FilterableArtist, query: string): boolean {
	return artist.name.toLowerCase().includes(query.toLowerCase());
}

export function filterAlbums<T extends FilterableAlbum>(
	albums: readonly T[],
	searchQuery: string
): T[] {
	const query = searchQuery.trim().toLowerCase();

	if (!query) {
		return [...albums];
	}

	return albums.filter((album) => matchesAlbumSearch(album, query));
}

export function matchesAlbumSearch(album: FilterableAlbum, query: string): boolean {
	const lowerQuery = query.toLowerCase();

	if (album.name.toLowerCase().includes(lowerQuery)) {
		return true;
	}

	if (album.artistName?.toLowerCase().includes(lowerQuery)) {
		return true;
	}

	return false;
}
