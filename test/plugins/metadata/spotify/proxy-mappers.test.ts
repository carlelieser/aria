import { describe, it, expect } from 'vitest';
import {
	mapProxyArtist,
	mapProxyAlbum,
	mapProxyPlaylist,
	mapProxySavedTrack,
	mapProxySavedTracks,
	mapProxyAlbumTrack,
	mapProxyAlbumTracks,
	mapProxyArtistOverview,
	mapProxyArtistAlbums,
	mapProxyPlaylistTrack,
	mapProxyPlaylistTracks,
	mapProxyLibrary,
} from '@plugins/metadata/spotify/proxy-mappers';

const IMAGE_SOURCES = [
	{ url: 'https://i.scdn.co/image/small', width: 64, height: 64 },
	{ url: 'https://i.scdn.co/image/large', width: 640, height: 640 },
];

describe('proxy-mappers', () => {
	describe('mapProxyArtist (library node)', () => {
		it('maps a library artist node with avatar image', () => {
			const artist = mapProxyArtist({
				uri: 'spotify:artist:1abc',
				profile: { name: 'Radiohead' },
				visuals: { avatarImage: { sources: IMAGE_SOURCES } },
			});

			expect(artist).not.toBeNull();
			expect(artist?.id).toBe('spotify:1abc');
			expect(artist?.name).toBe('Radiohead');
			expect(artist?.artwork).toHaveLength(2);
			expect(artist?.artwork?.[0].url).toBe('https://i.scdn.co/image/small');
		});

		it('returns null when the profile name is missing', () => {
			expect(mapProxyArtist({ uri: 'spotify:artist:1abc', profile: {} })).toBeNull();
		});

		it('omits artwork when there are no image sources', () => {
			const artist = mapProxyArtist({
				uri: 'spotify:artist:1abc',
				profile: { name: 'Nameless Visuals' },
			});
			expect(artist?.artwork).toBeUndefined();
		});
	});

	describe('mapProxyAlbum (library node + discography)', () => {
		it('maps an album node with artists and cover art', () => {
			const album = mapProxyAlbum({
				uri: 'spotify:album:5xyz',
				name: 'In Rainbows',
				artists: {
					items: [{ uri: 'spotify:artist:1abc', profile: { name: 'Radiohead' } }],
				},
				coverArt: { sources: IMAGE_SOURCES },
				date: { isoString: '2007-10-10T00:00:00Z' },
			});

			expect(album).not.toBeNull();
			expect(album?.id.value).toBe('spotify:5xyz');
			expect(album?.name).toBe('In Rainbows');
			expect(album?.artists).toHaveLength(1);
			expect(album?.artists[0]).toEqual({ id: 'spotify:1abc', name: 'Radiohead' });
			expect(album?.releaseDate).toBe('2007-10-10T00:00:00Z');
			expect(album?.artwork).toHaveLength(2);
		});

		it('returns null when the uri is missing', () => {
			expect(mapProxyAlbum({ name: 'No URI' })).toBeNull();
		});

		it('returns null when the name is missing', () => {
			expect(mapProxyAlbum({ uri: 'spotify:album:5xyz' })).toBeNull();
		});

		it('yields empty artists when the artists envelope is absent', () => {
			const album = mapProxyAlbum({ uri: 'spotify:album:5xyz', name: 'Solo' });
			expect(album?.artists).toEqual([]);
		});
	});

	describe('mapProxyPlaylist (library node)', () => {
		it('maps a playlist node with description and first image', () => {
			const playlist = mapProxyPlaylist({
				uri: 'spotify:playlist:37i9',
				name: 'Discover Weekly',
				description: 'Your weekly mixtape',
				images: { items: [{ sources: IMAGE_SOURCES }] },
			});

			expect(playlist).not.toBeNull();
			expect(playlist?.id).toBe('spotify:37i9');
			expect(playlist?.name).toBe('Discover Weekly');
			expect(playlist?.description).toBe('Your weekly mixtape');
			expect(playlist?.source).toBe('spotify');
			expect(playlist?.isSmartPlaylist).toBe(false);
			expect(playlist?.tracks).toEqual([]);
			expect(playlist?.artwork).toHaveLength(2);
		});

		it('drops an empty-string description to undefined', () => {
			const playlist = mapProxyPlaylist({
				uri: 'spotify:playlist:37i9',
				name: 'Untitled',
				description: '',
			});
			expect(playlist?.description).toBeUndefined();
		});

		it('returns null when name or uri is missing', () => {
			expect(mapProxyPlaylist({ name: 'No URI' })).toBeNull();
			expect(mapProxyPlaylist({ uri: 'spotify:playlist:37i9' })).toBeNull();
		});
	});

	describe('mapProxySavedTrack (track.data envelope)', () => {
		const savedTrackNode = {
			addedAt: { isoString: '2024-01-15T00:00:00Z' },
			track: {
				_uri: 'spotify:track:t100',
				data: {
					name: 'Weird Fishes',
					artists: {
						items: [{ uri: 'spotify:artist:1abc', profile: { name: 'Radiohead' } }],
					},
					duration: { totalMilliseconds: 318000 },
					albumOfTrack: {
						uri: 'spotify:album:5xyz',
						name: 'In Rainbows',
						coverArt: { sources: IMAGE_SOURCES },
					},
				},
			},
		};

		it('maps identity from track._uri (not data.uri)', () => {
			const track = mapProxySavedTrack(savedTrackNode);

			expect(track).not.toBeNull();
			expect(track?.id.sourceId).toBe('t100');
			expect(track?.id.sourceType).toBe('spotify');
			expect(track?.title).toBe('Weird Fishes');
			expect(track?.duration.totalMilliseconds).toBe(318000);
			expect(track?.album).toEqual({ id: 'spotify:5xyz', name: 'In Rainbows' });
			expect(track?.artwork).toHaveLength(2);
		});

		it('maps addedAt from the item-level isoString', () => {
			const track = mapProxySavedTrack(savedTrackNode);
			expect(track?.addedAt).toEqual(new Date('2024-01-15T00:00:00Z'));
		});

		it('leaves addedAt undefined when the isoString is absent', () => {
			const track = mapProxySavedTrack({
				track: { _uri: 'spotify:track:t100', data: { name: 'No Date' } },
			});
			expect(track?.addedAt).toBeUndefined();
		});

		it('returns null when track._uri is missing', () => {
			expect(mapProxySavedTrack({ track: { data: { name: 'Orphan' } } })).toBeNull();
		});

		it('returns null when track.data is missing', () => {
			expect(mapProxySavedTrack({ track: { _uri: 'spotify:track:t100' } })).toBeNull();
		});

		it('defaults duration to 0 when absent', () => {
			const track = mapProxySavedTrack({
				track: { _uri: 'spotify:track:t100', data: { name: 'No Duration' } },
			});
			expect(track?.duration.totalMilliseconds).toBe(0);
		});

		it('omits album when albumOfTrack lacks name or uri', () => {
			const track = mapProxySavedTrack({
				track: {
					_uri: 'spotify:track:t100',
					data: { name: 'No Album', albumOfTrack: { name: 'X' } },
				},
			});
			expect(track?.album).toBeUndefined();
		});

		it('mapProxySavedTracks filters out unmappable nodes', () => {
			const tracks = mapProxySavedTracks([savedTrackNode, { track: {} }, {}]);
			expect(tracks).toHaveLength(1);
			expect(tracks[0].title).toBe('Weird Fishes');
		});
	});

	describe('mapProxyAlbumTrack (item.track direct fields)', () => {
		const albumTrackNode = {
			track: {
				uri: 'spotify:track:t200',
				name: 'Jigsaw Falling Into Place',
				artists: {
					items: [{ uri: 'spotify:artist:1abc', profile: { name: 'Radiohead' } }],
				},
				duration: { totalMilliseconds: 249000 },
				trackNumber: 9,
				discNumber: 1,
			},
		};

		it('maps direct-field track with caller-supplied album context', () => {
			const albumRef = { id: 'spotify:5xyz', name: 'In Rainbows' };
			const artwork = [{ url: 'https://i.scdn.co/image/large', size: 'large' as const }];

			const track = mapProxyAlbumTrack(albumTrackNode, albumRef, artwork);

			expect(track).not.toBeNull();
			expect(track?.id.sourceId).toBe('t200');
			expect(track?.album).toEqual(albumRef);
			expect(track?.metadata.trackNumber).toBe(9);
			expect(track?.metadata.discNumber).toBe(1);
			expect(track?.artwork).toEqual(artwork);
		});

		it('returns null when uri or name is missing', () => {
			expect(mapProxyAlbumTrack({ track: { name: 'No URI' } }, undefined, [])).toBeNull();
			expect(
				mapProxyAlbumTrack({ track: { uri: 'spotify:track:t200' } }, undefined, [])
			).toBeNull();
		});

		it('omits artwork when the caller passes an empty array', () => {
			const track = mapProxyAlbumTrack(albumTrackNode, undefined, []);
			expect(track?.artwork).toBeUndefined();
		});

		it('mapProxyAlbumTracks maps and filters a mixed list', () => {
			const tracks = mapProxyAlbumTracks([albumTrackNode, { track: {} }], undefined, []);
			expect(tracks).toHaveLength(1);
		});
	});

	describe('mapProxyArtistOverview (artistUnion)', () => {
		it('maps profile, image, and monthly listeners', () => {
			const artist = mapProxyArtistOverview({
				uri: 'spotify:artist:1abc',
				profile: { name: 'Radiohead' },
				visuals: { avatarImage: { sources: IMAGE_SOURCES } },
				stats: { monthlyListeners: 28000000 },
			});

			expect(artist).not.toBeNull();
			expect(artist?.id).toBe('spotify:1abc');
			expect(artist?.monthlyListeners).toBe(28000000);
			expect(artist?.artwork).toHaveLength(2);
		});

		it('returns null when the name is missing', () => {
			expect(mapProxyArtistOverview({ uri: 'spotify:artist:1abc' })).toBeNull();
		});

		it('leaves monthlyListeners undefined when stats are absent', () => {
			const artist = mapProxyArtistOverview({
				uri: 'spotify:artist:1abc',
				profile: { name: 'Radiohead' },
			});
			expect(artist?.monthlyListeners).toBeUndefined();
		});
	});

	describe('mapProxyArtistAlbums (discography)', () => {
		it('maps a list of release nodes to albums', () => {
			const albums = mapProxyArtistAlbums([
				{ uri: 'spotify:album:a1', name: 'Album One' },
				{ uri: 'spotify:album:a2', name: 'Album Two' },
				{ name: 'No URI — dropped' },
			]);

			expect(albums).toHaveLength(2);
			expect(albums[0].id.value).toBe('spotify:a1');
			expect(albums[1].name).toBe('Album Two');
		});
	});

	describe('mapProxyPlaylistTrack (itemV2.data, trackDuration)', () => {
		const playlistTrackNode = {
			itemV2: {
				__typename: 'TrackResponseWrapper',
				data: {
					uri: 'spotify:track:t300',
					name: 'Reckoner',
					artists: {
						items: [{ uri: 'spotify:artist:1abc', profile: { name: 'Radiohead' } }],
					},
					trackDuration: { totalMilliseconds: 290000 },
					albumOfTrack: {
						uri: 'spotify:album:5xyz',
						name: 'In Rainbows',
						coverArt: { sources: IMAGE_SOURCES },
					},
				},
			},
		};

		it('maps identity from itemV2.data.uri using trackDuration', () => {
			const track = mapProxyPlaylistTrack(playlistTrackNode);

			expect(track).not.toBeNull();
			expect(track?.id.sourceId).toBe('t300');
			expect(track?.title).toBe('Reckoner');
			expect(track?.duration.totalMilliseconds).toBe(290000);
			expect(track?.album).toEqual({ id: 'spotify:5xyz', name: 'In Rainbows' });
		});

		it('returns null when itemV2.data is missing', () => {
			expect(mapProxyPlaylistTrack({ itemV2: {} })).toBeNull();
			expect(mapProxyPlaylistTrack({})).toBeNull();
		});

		it('defaults duration to 0 when trackDuration is absent', () => {
			const track = mapProxyPlaylistTrack({
				itemV2: { data: { uri: 'spotify:track:t300', name: 'No Duration' } },
			});
			expect(track?.duration.totalMilliseconds).toBe(0);
		});

		it('mapProxyPlaylistTracks maps and filters a mixed list', () => {
			const tracks = mapProxyPlaylistTracks([playlistTrackNode, { itemV2: {} }, {}]);
			expect(tracks).toHaveLength(1);
		});
	});

	describe('mapProxyLibrary (library / libraryV3 envelope)', () => {
		const buildPayload = (rootKey: 'library' | 'libraryV3') => ({
			data: {
				me: {
					[rootKey]: {
						items: [
							{
								item: {
									__typename: 'ArtistResponseWrapper',
									data: {
										uri: 'spotify:artist:1abc',
										profile: { name: 'Radiohead' },
									},
								},
							},
							{
								item: {
									__typename: 'AlbumResponseWrapper',
									data: { uri: 'spotify:album:5xyz', name: 'In Rainbows' },
								},
							},
							{
								item: {
									__typename: 'PlaylistResponseWrapper',
									data: { uri: 'spotify:playlist:37i9', name: 'Discover Weekly' },
								},
							},
							{
								item: {
									__typename: 'LibraryPseudoPlaylistResponseWrapper',
									data: { uri: 'spotify:collection:tracks', name: 'Liked Songs' },
								},
							},
						],
					},
				},
			},
		});

		it('splits items into typed collections from the `library` root', () => {
			const result = mapProxyLibrary(buildPayload('library'));

			expect(result.artists).toHaveLength(1);
			expect(result.albums).toHaveLength(1);
			expect(result.playlists).toHaveLength(1);
			expect(result.artists[0].name).toBe('Radiohead');
		});

		it('reads the alternate `libraryV3` root key identically', () => {
			const result = mapProxyLibrary(buildPayload('libraryV3'));

			expect(result.artists).toHaveLength(1);
			expect(result.albums).toHaveLength(1);
			expect(result.playlists).toHaveLength(1);
		});

		it('ignores the pseudo-playlist ("Liked Songs") pointer node', () => {
			const result = mapProxyLibrary(buildPayload('library'));
			// The 4th item (LibraryPseudoPlaylistResponseWrapper) is not a real
			// playlist — its tracks come from the saved-tracks endpoint.
			expect(result.playlists).toHaveLength(1);
			expect(result.playlists[0].name).toBe('Discover Weekly');
		});

		it('returns empty collections for a malformed payload', () => {
			expect(mapProxyLibrary(null)).toEqual({ artists: [], albums: [], playlists: [] });
			expect(mapProxyLibrary({})).toEqual({ artists: [], albums: [], playlists: [] });
			expect(mapProxyLibrary({ data: { me: {} } })).toEqual({
				artists: [],
				albums: [],
				playlists: [],
			});
		});

		it('skips items whose item.data is missing', () => {
			const result = mapProxyLibrary({
				data: {
					me: {
						library: {
							items: [{ item: { __typename: 'AlbumResponseWrapper' } }],
						},
					},
				},
			});
			expect(result.albums).toEqual([]);
		});
	});
});
