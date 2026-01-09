import type { Track } from '../../../domain/entities/track';
import { createTrack } from '../../../domain/entities/track';
import { TrackId } from '../../../domain/value-objects/track-id';
import { Duration } from '../../../domain/value-objects/duration';
import { createLocalSource, type AudioFileType } from '../../../domain/value-objects/audio-source';
import { createAudioStream, type AudioStream } from '../../../domain/value-objects/audio-stream';
import type {
  MetadataProvider,
  MetadataCapability,
  SearchOptions,
  SearchResults,
} from '../../core/interfaces/metadata-provider';
import type {
  AudioSourceProvider,
  AudioSourceCapability,
} from '../../core/interfaces/audio-source-provider';
import type { PluginManifest, PluginInitContext } from '../../core/interfaces/base-plugin';
import { ok, err, type Result, type AsyncResult } from '../../../shared/types/result';

/**
 * Represents a local audio file
 */
interface LocalFile {
  id: string;
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
  duration?: number;
}

/**
 * LocalFilesProvider - Metadata and audio source provider for local audio files
 * Uses in-memory storage and expo-document-picker for file selection
 */
export class LocalFilesProvider implements MetadataProvider, AudioSourceProvider {
  readonly manifest: PluginManifest = {
    id: 'local-files',
    name: 'Local Files',
    version: '1.0.0',
    description: 'Local audio file support',
    author: 'Aria',
    category: 'metadata-provider',
    capabilities: ['search-tracks', 'get-track-info'],
  };

  readonly capabilities: Set<MetadataCapability> = new Set([
    'search-tracks',
    'get-track-info',
  ]);

  readonly audioCapabilities: Set<AudioSourceCapability> = new Set([
    'get-stream-url',
  ]);

  readonly configSchema = [];
  status: 'uninitialized' | 'initializing' | 'ready' | 'active' | 'error' | 'disabled' = 'uninitialized';

  private localFiles: Map<string, LocalFile> = new Map();

  /**
   * Plugin lifecycle: Initialize
   */
  async onInit(context: PluginInitContext): AsyncResult<void, Error> {
    try {
      // In a real implementation, you might load cached file references
      // from AsyncStorage here
      this.status = 'ready';
      return ok(undefined);
    } catch (error) {
      this.status = 'error';
      return err(
        error instanceof Error ? error : new Error(`Failed to initialize: ${String(error)}`)
      );
    }
  }

  /**
   * Plugin lifecycle: Destroy
   */
  async onDestroy(): AsyncResult<void, Error> {
    this.localFiles.clear();
    this.status = 'uninitialized';
    return ok(undefined);
  }

  /**
   * Check if a metadata capability is supported
   */
  hasCapability(capability: MetadataCapability): boolean {
    return this.capabilities.has(capability);
  }

  /**
   * Check if an audio source capability is supported
   */
  hasAudioCapability(capability: AudioSourceCapability): boolean {
    return this.audioCapabilities.has(capability);
  }

  /**
   * Check if this provider supports the given track
   */
  supportsTrack(track: Track): boolean {
    return track.source.type === 'local' ||
      (track.source.type === 'streaming' && track.source.sourcePlugin === 'local-files');
  }

  /**
   * Search for tracks
   */
  async searchTracks(query: string, options?: SearchOptions): AsyncResult<SearchResults<Track>, Error> {
    try {
      const searchLower = query.toLowerCase();
      const matchingTracks: Track[] = [];

      for (const [id, file] of this.localFiles.entries()) {
        if (file.name.toLowerCase().includes(searchLower)) {
          const track = this.fileToTrack(id, file);
          matchingTracks.push(track);
        }
      }

      // Apply limit and offset
      const limit = options?.limit ?? 50;
      const offset = options?.offset ?? 0;
      const paginatedTracks = matchingTracks.slice(offset, offset + limit);

      return ok({
        items: paginatedTracks,
        total: matchingTracks.length,
        offset,
        limit,
        hasMore: offset + limit < matchingTracks.length,
      });
    } catch (error) {
      return err(
        error instanceof Error ? error : new Error(`Search failed: ${String(error)}`)
      );
    }
  }

  /**
   * Search for albums (not supported for local files)
   */
  async searchAlbums(query: string, options?: SearchOptions): AsyncResult<SearchResults<any>, Error> {
    return ok({
      items: [],
      total: 0,
      offset: 0,
      limit: 0,
      hasMore: false,
    });
  }

  /**
   * Search for artists (not supported for local files)
   */
  async searchArtists(query: string, options?: SearchOptions): AsyncResult<SearchResults<any>, Error> {
    return ok({
      items: [],
      total: 0,
      offset: 0,
      limit: 0,
      hasMore: false,
    });
  }

  /**
   * Get track information by ID
   */
  async getTrackInfo(trackId: TrackId): AsyncResult<Track, Error> {
    try {
      const file = this.localFiles.get(trackId.sourceId);

      if (!file) {
        return err(new Error(`Track not found: ${trackId.value}`));
      }

      return ok(this.fileToTrack(trackId.sourceId, file));
    } catch (error) {
      return err(
        error instanceof Error ? error : new Error(`Failed to get track: ${String(error)}`)
      );
    }
  }

  /**
   * Get album info (not supported)
   */
  async getAlbumInfo(albumId: string): AsyncResult<any, Error> {
    return err(new Error('Album info not supported for local files'));
  }

  /**
   * Get artist info (not supported)
   */
  async getArtistInfo(artistId: string): AsyncResult<any, Error> {
    return err(new Error('Artist info not supported for local files'));
  }

  /**
   * Get album tracks (not supported)
   */
  async getAlbumTracks(albumId: string, options?: any): AsyncResult<SearchResults<Track>, Error> {
    return ok({
      items: [],
      total: 0,
      offset: 0,
      limit: 0,
      hasMore: false,
    });
  }

  /**
   * Get artist albums (not supported)
   */
  async getArtistAlbums(artistId: string, options?: any): AsyncResult<SearchResults<any>, Error> {
    return ok({
      items: [],
      total: 0,
      offset: 0,
      limit: 0,
      hasMore: false,
    });
  }

  /**
   * Get stream URL for a track
   * For local files, this just returns the file URI as an AudioStream
   */
  async getStreamUrl(trackId: TrackId): AsyncResult<AudioStream, Error> {
    try {
      const file = this.localFiles.get(trackId.sourceId);

      if (!file) {
        return err(new Error(`Track not found: ${trackId.value}`));
      }

      // Determine format from file type
      const fileType = this.getFileType(file.name, file.mimeType);
      const format = fileType || 'mp3';

      return ok(createAudioStream({
        url: file.uri,
        format: format as 'mp3' | 'aac' | 'opus' | 'flac' | 'webm' | 'ogg' | 'm4a' | 'wav',
        quality: 'high', // Local files are assumed to be high quality
        contentLength: file.size,
      }));
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new Error(`Failed to get stream URL: ${String(error)}`)
      );
    }
  }

  /**
   * Add a local file to the provider
   * This would typically be called after using expo-document-picker
   */
  addLocalFile(file: {
    uri: string;
    name: string;
    size?: number;
    mimeType?: string;
    duration?: number;
  }): string {
    const id = this.generateFileId();
    this.localFiles.set(id, { id, ...file });
    return id;
  }

  /**
   * Remove a local file from the provider
   */
  removeLocalFile(id: string): boolean {
    return this.localFiles.delete(id);
  }

  /**
   * Get all local files
   */
  getAllLocalFiles(): LocalFile[] {
    return Array.from(this.localFiles.values());
  }

  /**
   * Convert a local file to a Track entity
   */
  private fileToTrack(id: string, file: LocalFile): Track {
    // Parse file name to extract basic metadata
    const { title, artist } = this.parseFileName(file.name);

    // Determine file type from mime type or extension
    const fileType = this.getFileType(file.name, file.mimeType);

    return createTrack({
      id: TrackId.create('local-file', id),
      title,
      artists: [{ id: 'unknown', name: artist }],
      duration: file.duration ? Duration.fromSeconds(file.duration) : Duration.ZERO,
      source: createLocalSource(file.uri, fileType, file.size),
      metadata: {
        bitrate: this.estimateBitrate(file.size, file.duration),
      },
    });
  }

  /**
   * Parse file name to extract title and artist
   * Attempts to parse formats like "Artist - Title.mp3" or just "Title.mp3"
   */
  private parseFileName(fileName: string): { title: string; artist: string } {
    // Remove file extension
    const nameWithoutExt = fileName.replace(/\.[^.]+$/, '');

    // Try to split on common separators
    const separators = [' - ', ' – ', ' — ', '_-_'];
    for (const separator of separators) {
      if (nameWithoutExt.includes(separator)) {
        const [artist, ...titleParts] = nameWithoutExt.split(separator);
        return {
          artist: artist.trim(),
          title: titleParts.join(separator).trim(),
        };
      }
    }

    // No separator found, use the whole name as title
    return {
      title: nameWithoutExt.trim(),
      artist: 'Unknown Artist',
    };
  }

  /**
   * Determine audio file type from name and mime type
   */
  private getFileType(fileName: string, mimeType?: string): AudioFileType | undefined {
    // Try mime type first
    if (mimeType) {
      const typeMap: Record<string, AudioFileType> = {
        'audio/mpeg': 'mp3',
        'audio/mp3': 'mp3',
        'audio/flac': 'flac',
        'audio/aac': 'aac',
        'audio/x-m4a': 'm4a',
        'audio/mp4': 'm4a',
        'audio/wav': 'wav',
        'audio/x-wav': 'wav',
        'audio/ogg': 'ogg',
        'audio/opus': 'opus',
        'audio/webm': 'webm',
      };

      const fileType = typeMap[mimeType.toLowerCase()];
      if (fileType) return fileType;
    }

    // Fall back to file extension
    const ext = fileName.split('.').pop()?.toLowerCase();
    const validTypes: AudioFileType[] = ['mp3', 'flac', 'aac', 'm4a', 'wav', 'ogg', 'opus', 'webm'];

    if (ext && validTypes.includes(ext as AudioFileType)) {
      return ext as AudioFileType;
    }

    return undefined;
  }

  /**
   * Estimate bitrate from file size and duration
   */
  private estimateBitrate(size?: number, duration?: number): number | undefined {
    if (!size || !duration || duration === 0) {
      return undefined;
    }

    // Bitrate (kbps) = (file size in bytes * 8) / (duration in seconds * 1000)
    return Math.round((size * 8) / (duration * 1000));
  }

  /**
   * Generate a unique file ID
   */
  private generateFileId(): string {
    return `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * Singleton instance
 */
export const localFilesProvider = new LocalFilesProvider();

/**
 * Helper function to pick audio files using expo-document-picker
 * NOTE: This requires expo-document-picker to be installed
 * Install with: npx expo install expo-document-picker
 */
export async function pickAudioFiles(): Promise<LocalFile[]> {
  // This is a placeholder - actual implementation requires expo-document-picker
  // Example implementation:
  /*
  import * as DocumentPicker from 'expo-document-picker';

  const result = await DocumentPicker.getDocumentAsync({
    type: 'audio/*',
    multiple: true,
    copyToCacheDirectory: false,
  });

  if (result.canceled) {
    return [];
  }

  return result.assets.map(asset => ({
    id: '',
    uri: asset.uri,
    name: asset.name,
    size: asset.size,
    mimeType: asset.mimeType,
  }));
  */

  throw new Error(
    'pickAudioFiles requires expo-document-picker. Install with: npx expo install expo-document-picker'
  );
}
