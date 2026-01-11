import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
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

describe('LibraryStore', () => {
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
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('Initial State', () => {
		it('should have empty tracks array', () => {
			expect(useLibraryStore.getState().tracks).toEqual([]);
		});

		it('should have empty playlists array', () => {
			expect(useLibraryStore.getState().playlists).toEqual([]);
		});

		it('should have empty favorites set', () => {
			expect(useLibraryStore.getState().favorites.size).toBe(0);
		});

		it('should not be loading', () => {
			expect(useLibraryStore.getState().isLoading).toBe(false);
		});

		it('should have null lastSyncedAt', () => {
			expect(useLibraryStore.getState().lastSyncedAt).toBeNull();
		});
	});

	describe('Track Operations', () => {
		describe('addTrack', () => {
			it('should add a track to the library', () => {
				const track = createTestTrack('1');
				useLibraryStore.getState().addTrack(track);

				const state = useLibraryStore.getState();
				expect(state.tracks).toHaveLength(1);
				expect(state.tracks[0].title).toBe('Track 1');
			});

			it('should set addedAt timestamp', () => {
				const track = createTestTrack('1');
				useLibraryStore.getState().addTrack(track);

				const state = useLibraryStore.getState();
				expect(state.tracks[0].addedAt).toEqual(new Date('2024-01-15T10:00:00Z'));
			});

			it('should not add duplicate tracks', () => {
				const track = createTestTrack('1');
				useLibraryStore.getState().addTrack(track);
				useLibraryStore.getState().addTrack(track);

				expect(useLibraryStore.getState().tracks).toHaveLength(1);
			});
		});

		describe('addTracks', () => {
			it('should add multiple tracks', () => {
				const tracks = [createTestTrack('1'), createTestTrack('2'), createTestTrack('3')];
				useLibraryStore.getState().addTracks(tracks);

				expect(useLibraryStore.getState().tracks).toHaveLength(3);
			});

			it('should filter out duplicates', () => {
				const track1 = createTestTrack('1');
				useLibraryStore.getState().addTrack(track1);

				const tracks = [createTestTrack('1'), createTestTrack('2')];
				useLibraryStore.getState().addTracks(tracks);

				expect(useLibraryStore.getState().tracks).toHaveLength(2);
			});

			it('should set same addedAt timestamp for batch', () => {
				const tracks = [createTestTrack('1'), createTestTrack('2')];
				useLibraryStore.getState().addTracks(tracks);

				const state = useLibraryStore.getState();
				expect(state.tracks[0].addedAt).toEqual(state.tracks[1].addedAt);
			});

			it('should not modify state if all tracks are duplicates', () => {
				const tracks = [createTestTrack('1'), createTestTrack('2')];
				useLibraryStore.getState().addTracks(tracks);
				const stateBefore = useLibraryStore.getState().tracks;

				useLibraryStore.getState().addTracks(tracks);
				const stateAfter = useLibraryStore.getState().tracks;

				expect(stateBefore).toBe(stateAfter);
			});
		});

		describe('removeTrack', () => {
			it('should remove a track from the library', () => {
				const tracks = [createTestTrack('1'), createTestTrack('2')];
				useLibraryStore.getState().addTracks(tracks);
				useLibraryStore.getState().removeTrack('youtube-music:1');

				const state = useLibraryStore.getState();
				expect(state.tracks).toHaveLength(1);
				expect(state.tracks[0].title).toBe('Track 2');
			});

			it('should remove track from favorites when deleted', () => {
				const track = createTestTrack('1');
				useLibraryStore.getState().addTrack(track);
				useLibraryStore.getState().toggleFavorite('youtube-music:1');

				expect(useLibraryStore.getState().favorites.has('youtube-music:1')).toBe(true);

				useLibraryStore.getState().removeTrack('youtube-music:1');

				expect(useLibraryStore.getState().favorites.has('youtube-music:1')).toBe(false);
			});
		});

		describe('getTrackById', () => {
			it('should return track if found', () => {
				const track = createTestTrack('1');
				useLibraryStore.getState().addTrack(track);

				const found = useLibraryStore.getState().getTrackById('youtube-music:1');
				expect(found?.title).toBe('Track 1');
			});

			it('should return undefined if not found', () => {
				const found = useLibraryStore.getState().getTrackById('nonexistent');
				expect(found).toBeUndefined();
			});
		});
	});

	describe('Favorites Operations', () => {
		describe('toggleFavorite', () => {
			it('should add track to favorites', () => {
				useLibraryStore.getState().toggleFavorite('youtube-music:1');
				expect(useLibraryStore.getState().favorites.has('youtube-music:1')).toBe(true);
			});

			it('should remove track from favorites when already favorited', () => {
				useLibraryStore.getState().toggleFavorite('youtube-music:1');
				useLibraryStore.getState().toggleFavorite('youtube-music:1');
				expect(useLibraryStore.getState().favorites.has('youtube-music:1')).toBe(false);
			});
		});

		describe('isFavorite', () => {
			it('should return true for favorited track', () => {
				useLibraryStore.getState().toggleFavorite('youtube-music:1');
				expect(useLibraryStore.getState().isFavorite('youtube-music:1')).toBe(true);
			});

			it('should return false for non-favorited track', () => {
				expect(useLibraryStore.getState().isFavorite('youtube-music:1')).toBe(false);
			});
		});

		describe('getFavoriteTracks', () => {
			it('should return favorited tracks', () => {
				const tracks = [createTestTrack('1'), createTestTrack('2'), createTestTrack('3')];
				useLibraryStore.getState().addTracks(tracks);
				useLibraryStore.getState().toggleFavorite('youtube-music:1');
				useLibraryStore.getState().toggleFavorite('youtube-music:3');

				const favorites = useLibraryStore.getState().getFavoriteTracks();
				expect(favorites).toHaveLength(2);
				expect(favorites.map((t) => t.title)).toContain('Track 1');
				expect(favorites.map((t) => t.title)).toContain('Track 3');
			});

			it('should return empty array if no favorites', () => {
				const tracks = [createTestTrack('1'), createTestTrack('2')];
				useLibraryStore.getState().addTracks(tracks);

				const favorites = useLibraryStore.getState().getFavoriteTracks();
				expect(favorites).toHaveLength(0);
			});
		});
	});

	describe('Playlist Operations', () => {
		describe('setPlaylists', () => {
			it('should replace all playlists', () => {
				const playlists = [createTestPlaylist('1'), createTestPlaylist('2')];
				useLibraryStore.getState().setPlaylists(playlists);

				expect(useLibraryStore.getState().playlists).toHaveLength(2);
			});
		});

		describe('addPlaylist', () => {
			it('should add a playlist', () => {
				const playlist = createTestPlaylist('1', 'My Playlist');
				useLibraryStore.getState().addPlaylist(playlist);

				const state = useLibraryStore.getState();
				expect(state.playlists).toHaveLength(1);
				expect(state.playlists[0].name).toBe('My Playlist');
			});

			it('should not add duplicate playlists', () => {
				const playlist = createTestPlaylist('1');
				useLibraryStore.getState().addPlaylist(playlist);
				useLibraryStore.getState().addPlaylist(playlist);

				expect(useLibraryStore.getState().playlists).toHaveLength(1);
			});
		});

		describe('removePlaylist', () => {
			it('should remove a playlist', () => {
				const playlists = [createTestPlaylist('1'), createTestPlaylist('2')];
				useLibraryStore.getState().setPlaylists(playlists);
				useLibraryStore.getState().removePlaylist('1');

				const state = useLibraryStore.getState();
				expect(state.playlists).toHaveLength(1);
				expect(state.playlists[0].id).toBe('2');
			});
		});

		describe('updatePlaylist', () => {
			it('should update playlist properties', () => {
				const playlist = createTestPlaylist('1', 'Original Name');
				useLibraryStore.getState().addPlaylist(playlist);
				useLibraryStore.getState().updatePlaylist('1', {
					name: 'Updated Name',
					description: 'New description',
				});

				const updated = useLibraryStore.getState().getPlaylistById('1');
				expect(updated?.name).toBe('Updated Name');
				expect(updated?.description).toBe('New description');
			});
		});

		describe('renamePlaylist', () => {
			it('should rename a playlist', () => {
				const playlist = createTestPlaylist('1', 'Original');
				useLibraryStore.getState().addPlaylist(playlist);

				vi.setSystemTime(new Date('2024-01-15T11:00:00Z'));
				useLibraryStore.getState().renamePlaylist('1', 'Renamed');

				const updated = useLibraryStore.getState().getPlaylistById('1');
				expect(updated?.name).toBe('Renamed');
				expect(updated?.updatedAt).toEqual(new Date('2024-01-15T11:00:00Z'));
			});
		});

		describe('addTrackToPlaylist', () => {
			it('should add track to playlist', () => {
				const playlist = createTestPlaylist('1');
				useLibraryStore.getState().addPlaylist(playlist);

				const track = createTestTrack('t1');
				useLibraryStore.getState().addTrackToPlaylist('1', track);

				const updated = useLibraryStore.getState().getPlaylistById('1');
				expect(updated?.tracks).toHaveLength(1);
				expect(updated?.tracks[0].track.title).toBe('Track t1');
			});

			it('should not add duplicate tracks to playlist', () => {
				const playlist = createTestPlaylist('1');
				useLibraryStore.getState().addPlaylist(playlist);

				const track = createTestTrack('t1');
				useLibraryStore.getState().addTrackToPlaylist('1', track);
				useLibraryStore.getState().addTrackToPlaylist('1', track);

				const updated = useLibraryStore.getState().getPlaylistById('1');
				expect(updated?.tracks).toHaveLength(1);
			});

			it('should set correct position for added track', () => {
				const playlist = createTestPlaylist('1', 'Playlist', [createTestTrack('t1')]);
				useLibraryStore.getState().addPlaylist(playlist);

				const track = createTestTrack('t2');
				useLibraryStore.getState().addTrackToPlaylist('1', track);

				const updated = useLibraryStore.getState().getPlaylistById('1');
				expect(updated?.tracks[1].position).toBe(1);
			});
		});

		describe('removeTrackFromPlaylist', () => {
			it('should remove track from playlist by position', () => {
				const tracks = [createTestTrack('t1'), createTestTrack('t2'), createTestTrack('t3')];
				const playlist = createTestPlaylist('1', 'Playlist', tracks);
				useLibraryStore.getState().addPlaylist(playlist);

				useLibraryStore.getState().removeTrackFromPlaylist('1', 1);

				const updated = useLibraryStore.getState().getPlaylistById('1');
				expect(updated?.tracks).toHaveLength(2);
				expect(updated?.tracks.map((t) => t.track.title)).toEqual(['Track t1', 'Track t3']);
			});

			it('should reindex positions after removal', () => {
				const tracks = [createTestTrack('t1'), createTestTrack('t2'), createTestTrack('t3')];
				const playlist = createTestPlaylist('1', 'Playlist', tracks);
				useLibraryStore.getState().addPlaylist(playlist);

				useLibraryStore.getState().removeTrackFromPlaylist('1', 0);

				const updated = useLibraryStore.getState().getPlaylistById('1');
				expect(updated?.tracks[0].position).toBe(0);
				expect(updated?.tracks[1].position).toBe(1);
			});
		});

		describe('reorderPlaylistTracks', () => {
			it('should reorder tracks within playlist', () => {
				const tracks = [createTestTrack('t1'), createTestTrack('t2'), createTestTrack('t3')];
				const playlist = createTestPlaylist('1', 'Playlist', tracks);
				useLibraryStore.getState().addPlaylist(playlist);

				useLibraryStore.getState().reorderPlaylistTracks('1', 0, 2);

				const updated = useLibraryStore.getState().getPlaylistById('1');
				expect(updated?.tracks.map((t) => t.track.title)).toEqual([
					'Track t2',
					'Track t3',
					'Track t1',
				]);
			});

			it('should update position indices after reorder', () => {
				const tracks = [createTestTrack('t1'), createTestTrack('t2'), createTestTrack('t3')];
				const playlist = createTestPlaylist('1', 'Playlist', tracks);
				useLibraryStore.getState().addPlaylist(playlist);

				useLibraryStore.getState().reorderPlaylistTracks('1', 0, 2);

				const updated = useLibraryStore.getState().getPlaylistById('1');
				expect(updated?.tracks[0].position).toBe(0);
				expect(updated?.tracks[1].position).toBe(1);
				expect(updated?.tracks[2].position).toBe(2);
			});
		});

		describe('getPlaylistById', () => {
			it('should return playlist if found', () => {
				const playlist = createTestPlaylist('1', 'My Playlist');
				useLibraryStore.getState().addPlaylist(playlist);

				const found = useLibraryStore.getState().getPlaylistById('1');
				expect(found?.name).toBe('My Playlist');
			});

			it('should return undefined if not found', () => {
				const found = useLibraryStore.getState().getPlaylistById('nonexistent');
				expect(found).toBeUndefined();
			});
		});
	});

	describe('Loading State', () => {
		describe('setLoading', () => {
			it('should set loading to true', () => {
				useLibraryStore.getState().setLoading(true);
				expect(useLibraryStore.getState().isLoading).toBe(true);
			});

			it('should set loading to false', () => {
				useLibraryStore.setState({ isLoading: true });
				useLibraryStore.getState().setLoading(false);
				expect(useLibraryStore.getState().isLoading).toBe(false);
			});
		});

		describe('setSyncedAt', () => {
			it('should set lastSyncedAt date', () => {
				const date = new Date('2024-01-15T12:00:00Z');
				useLibraryStore.getState().setSyncedAt(date);
				expect(useLibraryStore.getState().lastSyncedAt).toEqual(date);
			});
		});
	});
});
