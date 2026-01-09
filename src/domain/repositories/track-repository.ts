import type { Track } from '../entities/track';
import type { TrackId } from '../value-objects/track-id';
import type { Result } from '../../shared/types';

type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

export interface SearchOptions {
	query: string;

	limit?: number;

	offset?: number;

	sources?: string[];

	types?: ('track' | 'album' | 'artist')[];
}

export interface SearchResult {
	tracks: Track[];

	hasMore: boolean;

	total?: number;
}

export interface TrackRepository {
	findById(id: TrackId): AsyncResult<Track | null>;

	findByIds(ids: TrackId[]): AsyncResult<Track[]>;

	findAll(): AsyncResult<Track[]>;

	findByAlbum(albumId: string): AsyncResult<Track[]>;

	findByArtist(artistId: string): AsyncResult<Track[]>;

	findFavorites(): AsyncResult<Track[]>;

	findRecentlyPlayed(limit: number): AsyncResult<Track[]>;

	save(track: Track): AsyncResult<void>;

	saveMany(tracks: Track[]): AsyncResult<void>;

	delete(id: TrackId): AsyncResult<void>;

	updatePlayCount(id: TrackId): AsyncResult<void>;

	setFavorite(id: TrackId, isFavorite: boolean): AsyncResult<void>;
}
