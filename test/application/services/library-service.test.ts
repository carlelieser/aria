import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LibraryService } from '@application/services/library-service';
import { useLibraryStore } from '@application/state/library-store';
import { createTrack, type Track } from '@domain/entities/track';
import { createPlaylist, type Playlist } from '@domain/entities/playlist';
import { TrackId } from '@domain/value-objects/track-id';
import { Duration } from '@domain/value-objects/duration';
import { createStreamingSource } from '@domain/value-objects/audio-source';

const createTestTrack = (id: string, title?: string): Track =>
	createTrack({
		id: TrackId.create('youtube-music', id),
		title: title ?? `Track ${id}`,
		artists: [{ id: `artist-${id}`, name: `Artist ${id}` }],
		duration: Duration.fromSeconds(180),
		source: createStreamingSource('youtube-music', id),
	});

const createTestPlaylist = (id: string, name?: string, tracks: Track[] = []): Playlist =>
	createPlaylist({
		id,
		name: name ?? `Playlist ${id}`,
		tracks,
	});

describe('LibraryService', () => {
	let service: LibraryService;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));

		useLibraryStore.setState({
			tracks: [],
			playlists: [],
			favorites: new Set<string>(),
			isLoading: false,
			lastSyncedAt: null,
		});

		service = new LibraryService();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('addTrack', () => {
		it('should return success when adding a track', () => {
			const track = createTestTrack('1');

			const result = service.addTrack(track);

			expect(result.success).toBe(true);
			expect(useLibraryStore.getState().tracks).toHaveLength(1);
		});

		it('should return success when adding a duplicate track', () => {
			const track = createTestTrack('1');
			service.addTrack(track);

			const result = service.addTrack(track);

			expect(result.success).toBe(true);
			expect(useLibraryStore.getState().tracks).toHaveLength(1);
		});
	});

	describe('addTracks', () => {
		it('should return success when adding multiple tracks', () => {
			const tracks = [createTestTrack('1'), createTestTrack('2')];

			const result = service.addTracks(tracks);

			expect(result.success).toBe(true);
			expect(useLibraryStore.getState().tracks).toHaveLength(2);
		});

		it('should return success when adding empty array', () => {
			const result = service.addTracks([]);

			expect(result.success).toBe(true);
		});
	});

	describe('removeTrack', () => {
		it('should return success when removing an existing track', () => {
			const track = createTestTrack('1');
			service.addTrack(track);

			const result = service.removeTrack('youtube-music:1');

			expect(result.success).toBe(true);
			expect(useLibraryStore.getState().tracks).toHaveLength(0);
		});

		it('should return error when trackId is empty', () => {
			const result = service.removeTrack('');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toBe('Track ID is required');
			}
		});
	});

	describe('toggleFavorite', () => {
		it('should return success when toggling favorite', () => {
			const result = service.toggleFavorite('youtube-music:1');

			expect(result.success).toBe(true);
			expect(service.isFavorite('youtube-music:1')).toBe(true);
		});

		it('should return error when trackId is empty', () => {
			const result = service.toggleFavorite('');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toBe('Track ID is required');
			}
		});
	});

	describe('addPlaylist', () => {
		it('should return success when adding a playlist', () => {
			const playlist = createTestPlaylist('1', 'My Playlist');

			const result = service.addPlaylist(playlist);

			expect(result.success).toBe(true);
			expect(useLibraryStore.getState().playlists).toHaveLength(1);
		});
	});

	describe('removePlaylist', () => {
		it('should return success when removing a playlist', () => {
			const playlist = createTestPlaylist('1');
			service.addPlaylist(playlist);

			const result = service.removePlaylist('1');

			expect(result.success).toBe(true);
			expect(useLibraryStore.getState().playlists).toHaveLength(0);
		});

		it('should return error when playlistId is empty', () => {
			const result = service.removePlaylist('');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toBe('Playlist ID is required');
			}
		});
	});

	describe('updatePlaylist', () => {
		it('should return success when updating a playlist', () => {
			const playlist = createTestPlaylist('1', 'Original');
			service.addPlaylist(playlist);

			const result = service.updatePlaylist('1', { name: 'Updated' });

			expect(result.success).toBe(true);
			expect(service.getPlaylistById('1')?.name).toBe('Updated');
		});

		it('should return error when playlistId is empty', () => {
			const result = service.updatePlaylist('', { name: 'Test' });

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toBe('Playlist ID is required');
			}
		});
	});

	describe('addTrackToPlaylist', () => {
		it('should return success when adding track to playlist', () => {
			const playlist = createTestPlaylist('1');
			service.addPlaylist(playlist);
			const track = createTestTrack('t1');

			const result = service.addTrackToPlaylist('1', track);

			expect(result.success).toBe(true);
			expect(service.getPlaylistById('1')?.tracks).toHaveLength(1);
		});

		it('should return error when playlistId is empty', () => {
			const track = createTestTrack('t1');

			const result = service.addTrackToPlaylist('', track);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toBe('Playlist ID is required');
			}
		});
	});

	describe('removeTrackFromPlaylist', () => {
		it('should return success when removing track from playlist', () => {
			const tracks = [createTestTrack('t1'), createTestTrack('t2')];
			const playlist = createTestPlaylist('1', 'Playlist', tracks);
			service.addPlaylist(playlist);

			const result = service.removeTrackFromPlaylist('1', 0);

			expect(result.success).toBe(true);
			expect(service.getPlaylistById('1')?.tracks).toHaveLength(1);
		});

		it('should return error when playlistId is empty', () => {
			const result = service.removeTrackFromPlaylist('', 0);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toBe('Playlist ID is required');
			}
		});

		it('should return error when position is negative', () => {
			const result = service.removeTrackFromPlaylist('1', -1);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toBe('Track position must be non-negative');
			}
		});
	});

	describe('renamePlaylist', () => {
		it('should return success when renaming a playlist', () => {
			const playlist = createTestPlaylist('1', 'Original');
			service.addPlaylist(playlist);

			const result = service.renamePlaylist('1', 'Renamed');

			expect(result.success).toBe(true);
			expect(service.getPlaylistById('1')?.name).toBe('Renamed');
		});

		it('should return error when playlistId is empty', () => {
			const result = service.renamePlaylist('', 'New Name');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toBe('Playlist ID is required');
			}
		});

		it('should return error when name is empty', () => {
			const result = service.renamePlaylist('1', '');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toBe('Playlist name cannot be empty');
			}
		});

		it('should return error when name is only whitespace', () => {
			const result = service.renamePlaylist('1', '   ');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toBe('Playlist name cannot be empty');
			}
		});
	});

	describe('reorderPlaylistTracks', () => {
		it('should return success when reordering tracks', () => {
			const tracks = [createTestTrack('t1'), createTestTrack('t2'), createTestTrack('t3')];
			const playlist = createTestPlaylist('1', 'Playlist', tracks);
			service.addPlaylist(playlist);

			const result = service.reorderPlaylistTracks('1', 0, 2);

			expect(result.success).toBe(true);
			const updated = service.getPlaylistById('1');
			expect(updated?.tracks.map((t) => t.track.title)).toEqual([
				'Track t2',
				'Track t3',
				'Track t1',
			]);
		});

		it('should return error when playlistId is empty', () => {
			const result = service.reorderPlaylistTracks('', 0, 1);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toBe('Playlist ID is required');
			}
		});

		it('should return error when fromIndex is negative', () => {
			const result = service.reorderPlaylistTracks('1', -1, 0);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toBe('Source index must be non-negative');
			}
		});

		it('should return error when toIndex is negative', () => {
			const result = service.reorderPlaylistTracks('1', 0, -1);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toBe('Target index must be non-negative');
			}
		});
	});

	describe('query methods remain unchanged', () => {
		it('should return boolean from isInLibrary', () => {
			const track = createTestTrack('1');
			service.addTrack(track);

			expect(service.isInLibrary('youtube-music:1')).toBe(true);
			expect(service.isInLibrary('nonexistent')).toBe(false);
		});

		it('should return boolean from isFavorite', () => {
			service.toggleFavorite('youtube-music:1');

			expect(service.isFavorite('youtube-music:1')).toBe(true);
			expect(service.isFavorite('nonexistent')).toBe(false);
		});

		it('should return tracks from getTracks', () => {
			service.addTrack(createTestTrack('1'));
			service.addTrack(createTestTrack('2'));

			expect(service.getTracks()).toHaveLength(2);
		});

		it('should return track or undefined from getTrackById', () => {
			service.addTrack(createTestTrack('1'));

			expect(service.getTrackById('youtube-music:1')?.title).toBe('Track 1');
			expect(service.getTrackById('nonexistent')).toBeUndefined();
		});

		it('should return playlists from getPlaylists', () => {
			service.addPlaylist(createTestPlaylist('1'));

			expect(service.getPlaylists()).toHaveLength(1);
		});

		it('should return playlist or undefined from getPlaylistById', () => {
			service.addPlaylist(createTestPlaylist('1', 'Test'));

			expect(service.getPlaylistById('1')?.name).toBe('Test');
			expect(service.getPlaylistById('nonexistent')).toBeUndefined();
		});
	});
});
