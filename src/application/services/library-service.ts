import type { Track } from '../../domain/entities/track';
import type { Playlist } from '../../domain/entities/playlist';
import { ok, err, type Result } from '../../shared/types/result';
import { useLibraryStore } from '../state/library-store';

function wrapError(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error));
}

export class LibraryService {
	isInLibrary(trackId: string): boolean {
		const tracks = useLibraryStore.getState().tracks;
		return tracks.some((t) => t.id.value === trackId);
	}

	addTrack(track: Track): Result<void, Error> {
		try {
			useLibraryStore.getState().addTrack(track);
			return ok(undefined);
		} catch (error) {
			return err(wrapError(error));
		}
	}

	addTracks(tracks: Track[]): Result<void, Error> {
		try {
			useLibraryStore.getState().addTracks(tracks);
			return ok(undefined);
		} catch (error) {
			return err(wrapError(error));
		}
	}

	removeTrack(trackId: string): Result<void, Error> {
		if (!trackId) return err(new Error('Track ID is required'));

		try {
			useLibraryStore.getState().removeTrack(trackId);
			return ok(undefined);
		} catch (error) {
			return err(wrapError(error));
		}
	}

	toggleFavorite(trackId: string): Result<void, Error> {
		if (!trackId) return err(new Error('Track ID is required'));

		try {
			useLibraryStore.getState().toggleFavorite(trackId);
			return ok(undefined);
		} catch (error) {
			return err(wrapError(error));
		}
	}

	isFavorite(trackId: string): boolean {
		return useLibraryStore.getState().isFavorite(trackId);
	}

	getTracks(): Track[] {
		return useLibraryStore.getState().tracks;
	}

	getTrackById(trackId: string): Track | undefined {
		return useLibraryStore.getState().getTrackById(trackId);
	}

	getFavoriteTracks(): Track[] {
		return useLibraryStore.getState().getFavoriteTracks();
	}

	getPlaylists(): Playlist[] {
		return useLibraryStore.getState().playlists;
	}

	addPlaylist(playlist: Playlist): Result<void, Error> {
		try {
			useLibraryStore.getState().addPlaylist(playlist);
			return ok(undefined);
		} catch (error) {
			return err(wrapError(error));
		}
	}

	removePlaylist(playlistId: string): Result<void, Error> {
		if (!playlistId) return err(new Error('Playlist ID is required'));

		try {
			useLibraryStore.getState().removePlaylist(playlistId);
			return ok(undefined);
		} catch (error) {
			return err(wrapError(error));
		}
	}

	updatePlaylist(playlistId: string, updates: Partial<Playlist>): Result<void, Error> {
		if (!playlistId) return err(new Error('Playlist ID is required'));

		try {
			useLibraryStore.getState().updatePlaylist(playlistId, updates);
			return ok(undefined);
		} catch (error) {
			return err(wrapError(error));
		}
	}

	addTrackToPlaylist(playlistId: string, track: Track): Result<void, Error> {
		if (!playlistId) return err(new Error('Playlist ID is required'));

		try {
			useLibraryStore.getState().addTrackToPlaylist(playlistId, track);
			return ok(undefined);
		} catch (error) {
			return err(wrapError(error));
		}
	}

	removeTrackFromPlaylist(playlistId: string, position: number): Result<void, Error> {
		if (!playlistId) return err(new Error('Playlist ID is required'));
		if (position < 0) return err(new Error('Track position must be non-negative'));

		try {
			useLibraryStore.getState().removeTrackFromPlaylist(playlistId, position);
			return ok(undefined);
		} catch (error) {
			return err(wrapError(error));
		}
	}

	renamePlaylist(playlistId: string, name: string): Result<void, Error> {
		if (!playlistId) return err(new Error('Playlist ID is required'));
		if (!name.trim()) return err(new Error('Playlist name cannot be empty'));

		try {
			useLibraryStore.getState().renamePlaylist(playlistId, name);
			return ok(undefined);
		} catch (error) {
			return err(wrapError(error));
		}
	}

	reorderPlaylistTracks(
		playlistId: string,
		fromIndex: number,
		toIndex: number
	): Result<void, Error> {
		if (!playlistId) return err(new Error('Playlist ID is required'));
		if (fromIndex < 0) return err(new Error('Source index must be non-negative'));
		if (toIndex < 0) return err(new Error('Target index must be non-negative'));

		try {
			useLibraryStore.getState().reorderPlaylistTracks(playlistId, fromIndex, toIndex);
			return ok(undefined);
		} catch (error) {
			return err(wrapError(error));
		}
	}

	getPlaylistById(playlistId: string): Playlist | undefined {
		return useLibraryStore.getState().getPlaylistById(playlistId);
	}
}

export const libraryService = new LibraryService();
