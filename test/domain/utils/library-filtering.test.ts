import { describe, it, expect } from 'vitest';
import {
	filterPlaylists,
	matchesPlaylistSearch,
	filterArtists,
	matchesArtistSearch,
	filterAlbums,
	matchesAlbumSearch,
} from '@domain/utils/library-filtering';
import type { Playlist } from '@domain/entities/playlist';

function makePlaylist(overrides: Partial<Playlist> = {}): Playlist {
	return {
		id: 'p1',
		name: 'My Playlist',
		description: undefined,
		tracks: [],
		createdAt: new Date(),
		updatedAt: new Date(),
		isSmartPlaylist: false,
		...overrides,
	};
}

describe('library-filtering', () => {
	describe('filterPlaylists', () => {
		it('should return all playlists when search query is empty', () => {
			const playlists = [makePlaylist({ name: 'Rock' }), makePlaylist({ name: 'Jazz' })];

			const result = filterPlaylists(playlists, '');

			expect(result).toHaveLength(2);
		});

		it('should return all playlists when search query is whitespace', () => {
			const playlists = [makePlaylist({ name: 'Rock' })];

			const result = filterPlaylists(playlists, '   ');

			expect(result).toHaveLength(1);
		});

		it('should filter playlists by name', () => {
			const playlists = [
				makePlaylist({ name: 'Rock Hits' }),
				makePlaylist({ name: 'Jazz Classics' }),
			];

			const result = filterPlaylists(playlists, 'rock');

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('Rock Hits');
		});

		it('should filter playlists case-insensitively', () => {
			const playlists = [makePlaylist({ name: 'ROCK HITS' })];

			const result = filterPlaylists(playlists, 'rock');

			expect(result).toHaveLength(1);
		});

		it('should return empty array when no playlists match', () => {
			const playlists = [makePlaylist({ name: 'Rock' })];

			const result = filterPlaylists(playlists, 'pop');

			expect(result).toHaveLength(0);
		});
	});

	describe('matchesPlaylistSearch', () => {
		it('should match by playlist name', () => {
			const playlist = makePlaylist({ name: 'Rock Hits' });

			const result = matchesPlaylistSearch(playlist, 'rock');

			expect(result).toBe(true);
		});

		it('should match by playlist description', () => {
			const playlist = makePlaylist({ name: 'My Mix', description: 'Best rock songs' });

			const result = matchesPlaylistSearch(playlist, 'rock');

			expect(result).toBe(true);
		});

		it('should return false when neither name nor description matches', () => {
			const playlist = makePlaylist({ name: 'My Mix', description: 'Jazz songs' });

			const result = matchesPlaylistSearch(playlist, 'rock');

			expect(result).toBe(false);
		});

		it('should return false when description is undefined and name does not match', () => {
			const playlist = makePlaylist({ name: 'Jazz' });

			const result = matchesPlaylistSearch(playlist, 'rock');

			expect(result).toBe(false);
		});
	});

	describe('filterArtists', () => {
		it('should return all artists when search query is empty', () => {
			const artists = [{ name: 'Alice' }, { name: 'Bob' }];

			const result = filterArtists(artists, '');

			expect(result).toHaveLength(2);
		});

		it('should filter artists by name', () => {
			const artists = [{ name: 'Alice' }, { name: 'Bob' }];

			const result = filterArtists(artists, 'alice');

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('Alice');
		});

		it('should return empty array when no artists match', () => {
			const artists = [{ name: 'Alice' }];

			const result = filterArtists(artists, 'charlie');

			expect(result).toHaveLength(0);
		});

		it('should handle whitespace-only query', () => {
			const artists = [{ name: 'Alice' }];

			const result = filterArtists(artists, '   ');

			expect(result).toHaveLength(1);
		});
	});

	describe('matchesArtistSearch', () => {
		it('should return true when artist name contains query', () => {
			const result = matchesArtistSearch({ name: 'Alice Cooper' }, 'alice');

			expect(result).toBe(true);
		});

		it('should be case insensitive', () => {
			const result = matchesArtistSearch({ name: 'alice cooper' }, 'ALICE');

			expect(result).toBe(true);
		});

		it('should return false when name does not contain query', () => {
			const result = matchesArtistSearch({ name: 'Alice' }, 'bob');

			expect(result).toBe(false);
		});
	});

	describe('filterAlbums', () => {
		it('should return all albums when search query is empty', () => {
			const albums = [{ name: 'Album A' }, { name: 'Album B' }];

			const result = filterAlbums(albums, '');

			expect(result).toHaveLength(2);
		});

		it('should filter albums by name', () => {
			const albums = [{ name: 'Rock Album' }, { name: 'Jazz Album' }];

			const result = filterAlbums(albums, 'rock');

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('Rock Album');
		});

		it('should return empty array when no albums match', () => {
			const albums = [{ name: 'Rock Album' }];

			const result = filterAlbums(albums, 'pop');

			expect(result).toHaveLength(0);
		});
	});

	describe('matchesAlbumSearch', () => {
		it('should match by album name', () => {
			const result = matchesAlbumSearch({ name: 'Rock Album' }, 'rock');

			expect(result).toBe(true);
		});

		it('should match by artist name', () => {
			const result = matchesAlbumSearch(
				{ name: 'Best Hits', artistName: 'Alice Cooper' },
				'alice'
			);

			expect(result).toBe(true);
		});

		it('should return false when neither name nor artist matches', () => {
			const result = matchesAlbumSearch({ name: 'Rock Album', artistName: 'Alice' }, 'jazz');

			expect(result).toBe(false);
		});

		it('should return false when artistName is undefined and name does not match', () => {
			const result = matchesAlbumSearch({ name: 'Rock Album' }, 'alice');

			expect(result).toBe(false);
		});

		it('should be case insensitive', () => {
			const result = matchesAlbumSearch({ name: 'ROCK ALBUM' }, 'rock');

			expect(result).toBe(true);
		});
	});
});
