import type { Playlist } from '../entities/playlist';
import type { Track } from '../entities/track';
import type { TrackId } from '../value-objects/track-id';
import type { Result } from '../../shared/types';

type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

export interface PlaylistRepository {
	findById(id: string): AsyncResult<Playlist | null>;

	findAll(): AsyncResult<Playlist[]>;

	findPinned(): AsyncResult<Playlist[]>;

	create(name: string, tracks?: Track[]): AsyncResult<Playlist>;

	save(playlist: Playlist): AsyncResult<void>;

	delete(id: string): AsyncResult<void>;

	addTrack(playlistId: string, track: Track): AsyncResult<Playlist>;

	removeTrack(playlistId: string, position: number): AsyncResult<Playlist>;

	reorderTracks(playlistId: string, fromIndex: number, toIndex: number): AsyncResult<Playlist>;

	setPinned(id: string, isPinned: boolean): AsyncResult<void>;

	rename(id: string, name: string): AsyncResult<void>;

	findByTrack(trackId: TrackId): AsyncResult<Playlist[]>;
}
