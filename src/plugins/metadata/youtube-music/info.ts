/**
 * YouTube Music entity info retrieval
 */

import type { SearchOptions, SearchResults } from '../../core/interfaces/metadata-provider';
import { createSearchResults, emptySearchResults } from '../../core/interfaces/metadata-provider';
import type { Track } from '../../../domain/entities/track';
import type { Album } from '../../../domain/entities/album';
import type { Artist } from '../../../domain/entities/artist';
import type { TrackId } from '../../../domain/value-objects/track-id';
import type { Result } from '../../../shared/types/result';
import { ok, err } from '../../../shared/types/result';
import { mapYouTubeTrack, mapYouTubeAlbum, mapYouTubeArtist } from './mappers';
import type { ClientManager } from './client';

/**
 * Info operations interface
 */
export interface InfoOperations {
  getTrackInfo(trackId: TrackId): Promise<Result<Track, Error>>;
  getAlbumInfo(albumId: string): Promise<Result<Album, Error>>;
  getArtistInfo(artistId: string): Promise<Result<Artist, Error>>;
  getAlbumTracks(albumId: string, options?: Pick<SearchOptions, 'limit' | 'offset'>): Promise<Result<SearchResults<Track>, Error>>;
  getArtistAlbums(artistId: string, options?: Pick<SearchOptions, 'limit' | 'offset'>): Promise<Result<SearchResults<Album>, Error>>;
}

/**
 * Apply pagination to items
 */
function paginate<T>(items: T[], options?: Pick<SearchOptions, 'limit' | 'offset'>): SearchResults<T> {
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

/**
 * Create info operations with client manager
 */
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
          error instanceof Error ? error : new Error(`Failed to get track info: ${String(error)}`)
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

        const info = albumInfo as { title?: { text?: string }; name?: string; artists?: unknown[]; thumbnails?: unknown[] };
        const album = mapYouTubeAlbum({
          id: albumId,
          browseId: albumId,
          title: info.title?.text || info.name,
          artists: info.artists as import('./types').YouTubeArtist[] | undefined,
          thumbnails: info.thumbnails as import('./types').YouTubeThumbnail[] | undefined,
        });

        if (!album) {
          return err(new Error('Failed to map album data'));
        }

        return ok(album);
      } catch (error) {
        return err(
          error instanceof Error ? error : new Error(`Failed to get album info: ${String(error)}`)
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

        const info = artistInfo as { name?: string; title?: { text?: string }; thumbnails?: unknown[] };
        const artist = mapYouTubeArtist({
          id: artistId,
          browseId: artistId,
          title: info.name || info.title?.text,
          thumbnails: info.thumbnails as import('./types').YouTubeThumbnail[] | undefined,
        });

        if (!artist) {
          return err(new Error('Failed to map artist data'));
        }

        return ok(artist);
      } catch (error) {
        return err(
          error instanceof Error ? error : new Error(`Failed to get artist info: ${String(error)}`)
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
        const info = albumInfo as { contents?: unknown[] };

        if (!albumInfo || !info.contents) {
          return ok(emptySearchResults());
        }

        const tracks: Track[] = [];
        for (const content of info.contents) {
          if (!content) continue;
          const track = mapYouTubeTrack(content);
          if (track) tracks.push(track);
        }

        return ok(paginate(tracks, options));
      } catch (error) {
        return err(
          error instanceof Error ? error : new Error(`Failed to get album tracks: ${String(error)}`)
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
        const info = artistInfo as { sections?: Array<{ contents?: unknown[] }> };

        if (!artistInfo || !info.sections) {
          return ok(emptySearchResults());
        }

        const albums: Album[] = [];
        for (const section of info.sections) {
          if (!section?.contents) continue;
          for (const content of section.contents) {
            const album = mapYouTubeAlbum(content as import('./types').YouTubeMusicItem);
            if (album) albums.push(album);
          }
        }

        return ok(paginate(albums, options));
      } catch (error) {
        return err(
          error instanceof Error ? error : new Error(`Failed to get artist albums: ${String(error)}`)
        );
      }
    },
  };
}
