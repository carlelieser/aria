import type { Track } from '../../domain/entities/track';
import type { Album } from '../../domain/entities/album';
import type { Artist } from '../../domain/entities/artist';
import type { Result } from '../../shared/types/result';

export interface SearchOptions {
	query: string;
	type?: 'track' | 'album' | 'artist' | 'all';
	limit?: number;
	offset?: number;
}

export interface MetadataSearchResults {
	tracks: Track[];
	albums: Album[];
	artists: Artist[];
}

export interface MetadataProvider {
	readonly id: string;

	readonly name: string;

	readonly isEnabled: boolean;

	search(options: SearchOptions): Promise<Result<MetadataSearchResults, Error>>;

	getStreamUrl(track: Track): Promise<Result<string, Error>>;

	getTrack(trackId: string): Promise<Result<Track, Error>>;

	getAlbum(albumId: string): Promise<Result<Album, Error>>;

	getArtist(artistId: string): Promise<Result<Artist, Error>>;

	getSuggestions(query: string): Promise<Result<string[], Error>>;
}
