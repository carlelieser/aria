import type { Track } from '../entities/track';
import type { Album } from '../entities/album';
import type { Artist } from '../entities/artist';
import type { Playlist } from '../entities/playlist';
import type { Result } from '../../shared/types';

type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

export interface LibraryStats {
	trackCount: number;

	albumCount: number;

	artistCount: number;

	playlistCount: number;

	totalDurationMs: number;

	totalSizeBytes?: number;
}

export interface LibrarySnapshot {
	exportedAt: Date;

	appVersion: string;

	tracks: Track[];

	playlists: Playlist[];

	favoriteIds: string[];

	recentlyPlayed: { trackId: string; playedAt: Date }[];
}

export interface LibraryRepository {
	getStats(): AsyncResult<LibraryStats>;

	getTracksByAlbum(): AsyncResult<Map<string, Track[]>>;

	getTracksByArtist(): AsyncResult<Map<string, Track[]>>;

	getAlbums(): AsyncResult<Album[]>;

	getArtists(): AsyncResult<Artist[]>;

	search(query: string): AsyncResult<{
		tracks: Track[];
		albums: Album[];
		artists: Artist[];
		playlists: Playlist[];
	}>;

	exportLibrary(): AsyncResult<LibrarySnapshot>;

	importLibrary(
		snapshot: LibrarySnapshot,
		options?: { merge?: boolean; overwrite?: boolean }
	): AsyncResult<{ imported: number; skipped: number; errors: string[] }>;

	clear(): AsyncResult<void>;

	recordPlay(trackId: string): AsyncResult<void>;

	getPlayHistory(limit: number): AsyncResult<{ track: Track; playedAt: Date }[]>;
}
