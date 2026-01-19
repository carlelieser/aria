import type { SearchOptions, SearchResults } from '@plugins/core/interfaces/metadata-provider';
import {
	createSearchResults,
	emptySearchResults,
} from '@plugins/core/interfaces/metadata-provider';
import type { Track } from '@domain/entities/track';
import type { Album } from '@domain/entities/album';
import type { Artist } from '@domain/entities/artist';
import type { TrackId } from '@domain/value-objects/track-id';
import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import { mapYouTubeTrack, mapYouTubeAlbum, mapYouTubeArtist } from './mappers';
import type { ClientManager } from './client';

export interface InfoOperations {
	getTrackInfo(trackId: TrackId): Promise<Result<Track, Error>>;
	getAlbumInfo(albumId: string): Promise<Result<Album, Error>>;
	getArtistInfo(artistId: string): Promise<Result<Artist, Error>>;
	getAlbumTracks(
		albumId: string,
		options?: Pick<SearchOptions, 'limit' | 'offset'>
	): Promise<Result<SearchResults<Track>, Error>>;
	getArtistAlbums(
		artistId: string,
		options?: Pick<SearchOptions, 'limit' | 'offset'>
	): Promise<Result<SearchResults<Album>, Error>>;
}

function paginate<T>(
	items: T[],
	options?: Pick<SearchOptions, 'limit' | 'offset'>
): SearchResults<T> {
	const limit = options?.limit || items.length;
	const offset = options?.offset || 0;
	const paginatedItems = items.slice(offset, offset + limit);

	return createSearchResults(paginatedItems, {
		total: items.length,
		offset,
		limit,
		hasMore: offset + paginatedItems.length < items.length,
	});
}

export function createInfoOperations(clientManager: ClientManager): InfoOperations {
	return {
		async getTrackInfo(trackId: TrackId): Promise<Result<Track, Error>> {
			try {
				const client = await clientManager.getClient();
				const videoId = trackId.sourceId;
				const info = await client.getInfo(videoId);

				if (!info.basic_info) {
					return err(new Error('Track not found or invalid response'));
				}

				const track = mapYouTubeTrack({
					id: videoId,
					videoId: videoId,
					title: info.basic_info.title,
					duration: { seconds: info.basic_info.duration },
					artists: info.basic_info.channel
						? [{ id: info.basic_info.channel.id, name: info.basic_info.channel.name }]
						: undefined,
					thumbnails: info.basic_info.thumbnail,
				});

				if (!track) {
					return err(new Error('Failed to map track data'));
				}

				return ok(track);
			} catch (error) {
				return err(
					error instanceof Error
						? error
						: new Error(`Failed to get track info: ${String(error)}`)
				);
			}
		},

		async getAlbumInfo(albumId: string): Promise<Result<Album, Error>> {
			try {
				const client = await clientManager.getClient();
				const albumInfo = await client.music.getAlbum(albumId);

				if (!albumInfo) {
					return err(new Error('Album not found'));
				}

				// The YouTube Music API returns album data in various nested structures
				// Endpoint can have browseId at root or nested in payload
				type RunEndpoint = { browseId?: string; payload?: { browseId?: string } };

				const info = albumInfo as {
					title?: { text?: string };
					name?: string;
					artists?: unknown[];
					thumbnails?: unknown[];
					// Header structure for album details
					header?: {
						title?: { text?: string };
						subtitle?: {
							runs?: { text?: string; endpoint?: RunEndpoint }[];
						};
						strapline_text_one?: {
							runs?: { text?: string; endpoint?: RunEndpoint }[];
						};
						thumbnail?: {
							contents?: { url?: string; width?: number; height?: number }[];
						};
					};
					background?: {
						contents?: { url?: string; width?: number; height?: number }[];
					};
				};

				// Extract artists from various possible locations
				let artists: import('./types').YouTubeArtist[] | undefined = info.artists as
					| import('./types').YouTubeArtist[]
					| undefined;

				// Helper to extract browseId from various endpoint structures
				const getBrowseId = (endpoint?: { browseId?: string; payload?: { browseId?: string } }) =>
					endpoint?.browseId || endpoint?.payload?.browseId;

				// Try header.strapline_text_one.runs first (this is where artist info typically lives)
				if ((!artists || artists.length === 0) && info.header?.strapline_text_one?.runs) {
					artists = info.header.strapline_text_one.runs
						.filter((run) => getBrowseId(run.endpoint) && run.text)
						.map((run) => ({
							id: getBrowseId(run.endpoint)!,
							name: run.text!,
						}));
				}

				// Fallback: Try header.subtitle.runs (less common for artist info)
				if ((!artists || artists.length === 0) && info.header?.subtitle?.runs) {
					artists = info.header.subtitle.runs
						.filter((run) => getBrowseId(run.endpoint) && run.text)
						.map((run) => ({
							id: getBrowseId(run.endpoint)!,
							name: run.text!,
						}));
				}

				// Extract title from header if not available at top level
				const title = info.title?.text || info.name || info.header?.title?.text;

				// Extract thumbnails from various locations
				let thumbnails = info.thumbnails as
					| import('./types').YouTubeThumbnail[]
					| undefined;
				if ((!thumbnails || thumbnails.length === 0) && info.header?.thumbnail?.contents) {
					thumbnails = info.header.thumbnail
						.contents as import('./types').YouTubeThumbnail[];
				}
				if ((!thumbnails || thumbnails.length === 0) && info.background?.contents) {
					thumbnails = info.background.contents as import('./types').YouTubeThumbnail[];
				}

				const album = mapYouTubeAlbum({
					id: albumId,
					browseId: albumId,
					title,
					artists,
					thumbnails,
				});

				if (!album) {
					return err(new Error('Failed to map album data'));
				}

				return ok(album);
			} catch (error) {
				return err(
					error instanceof Error
						? error
						: new Error(`Failed to get album info: ${String(error)}`)
				);
			}
		},

		async getArtistInfo(artistId: string): Promise<Result<Artist, Error>> {
			try {
				const client = await clientManager.getClient();
				const artistInfo = await client.music.getArtist(artistId);

				if (!artistInfo) {
					return err(new Error('Artist not found'));
				}

				const info = artistInfo as {
					name?: string;
					title?: { text?: string };
					thumbnails?: import('./types').YouTubeThumbnail[];
					header?: {
						title?: { text?: string };
						thumbnail?: {
							contents?: import('./types').YouTubeThumbnail[];
						};
						description?: { text?: string };
					};
				};

				// Extract from header (primary) or top-level (fallback)
				const name = info.header?.title?.text || info.name || info.title?.text;
				const thumbnails = info.header?.thumbnail?.contents || info.thumbnails;

				const artist = mapYouTubeArtist({
					id: artistId,
					browseId: artistId,
					title: name,
					thumbnails,
				});

				if (!artist) {
					return err(new Error('Failed to map artist data'));
				}

				return ok(artist);
			} catch (error) {
				return err(
					error instanceof Error
						? error
						: new Error(`Failed to get artist info: ${String(error)}`)
				);
			}
		},

		async getAlbumTracks(
			albumId: string,
			options?: Pick<SearchOptions, 'limit' | 'offset'>
		): Promise<Result<SearchResults<Track>, Error>> {
			try {
				const client = await clientManager.getClient();
				const albumInfo = await client.music.getAlbum(albumId);
				const info = albumInfo as {
					contents?: unknown[];
					artists?: import('./types').YouTubeArtist[];
					thumbnails?: import('./types').YouTubeThumbnail[];
					header?: {
						subtitle?: {
							runs?: { text?: string; endpoint?: { browseId?: string; payload?: { browseId?: string } } }[];
						};
						strapline_text_one?: {
							runs?: { text?: string; endpoint?: { browseId?: string; payload?: { browseId?: string } } }[];
						};
						thumbnails?: import('./types').YouTubeThumbnail[];
					};
				};

				if (!albumInfo || !info.contents) {
					return ok(emptySearchResults());
				}

				// Helper to extract browseId from various endpoint structures
				const getBrowseId = (endpoint?: { browseId?: string; payload?: { browseId?: string } }) =>
					endpoint?.browseId || endpoint?.payload?.browseId;

				// Extract album-level artists to use as fallback for tracks
				let albumArtists: import('./types').YouTubeArtist[] | undefined = info.artists;

				// Try header.strapline_text_one.runs first (this is where artist info typically lives)
				if (
					(!albumArtists || albumArtists.length === 0) &&
					info.header?.strapline_text_one?.runs
				) {
					albumArtists = info.header.strapline_text_one.runs
						.filter((run) => getBrowseId(run.endpoint) && run.text)
						.map((run) => ({
							id: getBrowseId(run.endpoint)!,
							name: run.text!,
						}));
				}

				// Fallback: Try header.subtitle.runs (less common for artist info)
				if ((!albumArtists || albumArtists.length === 0) && info.header?.subtitle?.runs) {
					albumArtists = info.header.subtitle.runs
						.filter((run) => getBrowseId(run.endpoint) && run.text)
						.map((run) => ({
							id: getBrowseId(run.endpoint)!,
							name: run.text!,
						}));
				}

				// Extract album-level thumbnails to use as fallback for tracks
				const albumThumbnails = info.thumbnails ?? info.header?.thumbnails;

				const tracks: Track[] = [];
				for (const content of info.contents) {
					if (!content) continue;
					const track = mapYouTubeTrack(content, albumArtists, albumThumbnails);
					if (track) tracks.push(track);
				}

				return ok(paginate(tracks, options));
			} catch (error) {
				return err(
					error instanceof Error
						? error
						: new Error(`Failed to get album tracks: ${String(error)}`)
				);
			}
		},

		async getArtistAlbums(
			artistId: string,
			options?: Pick<SearchOptions, 'limit' | 'offset'>
		): Promise<Result<SearchResults<Album>, Error>> {
			try {
				const client = await clientManager.getClient();
				const artistInfo = await client.music.getArtist(artistId);
				const info = artistInfo as { sections?: { contents?: unknown[]; title?: { text?: string } }[] };

				if (!artistInfo || !info.sections) {
					return ok(emptySearchResults());
				}

				const albums: Album[] = [];
				for (const section of info.sections) {
					if (!section?.contents) continue;
					for (const content of section.contents) {
						const album = mapYouTubeAlbum(
							content as import('./types').YouTubeMusicItem
						);
						if (album) albums.push(album);
					}
				}

				return ok(paginate(albums, options));
			} catch (error) {
				return err(
					error instanceof Error
						? error
						: new Error(`Failed to get artist albums: ${String(error)}`)
				);
			}
		},
	};
}
