import type { Track } from '../../domain/entities/track';
import type { Playlist } from '../../domain/entities/playlist';
import { useLibraryStore } from '../state/library-store';

export class LibraryService {
	isInLibrary(trackId: string): boolean {
		const tracks = useLibraryStore.getState().tracks;
		return tracks.some((t) => t.id.value === trackId);
	}

	addTrack(track: Track): void {
		useLibraryStore.getState().addTrack(track);
	}

	addTracks(tracks: Track[]): void {
		useLibraryStore.getState().addTracks(tracks);
	}

	removeTrack(trackId: string): void {
		useLibraryStore.getState().removeTrack(trackId);
	}

	toggleFavorite(trackId: string): void {
		useLibraryStore.getState().toggleFavorite(trackId);
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

	addPlaylist(playlist: Playlist): void {
		useLibraryStore.getState().addPlaylist(playlist);
	}

	removePlaylist(playlistId: string): void {
		useLibraryStore.getState().removePlaylist(playlistId);
	}

	updatePlaylist(playlistId: string, updates: Partial<Playlist>): void {
		useLibraryStore.getState().updatePlaylist(playlistId, updates);
	}
}

export const libraryService = new LibraryService();
