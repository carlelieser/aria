import type { Track } from '@domain/entities/track';
import type { Album } from '@domain/entities/album';
import type { Artist } from '@domain/entities/artist';
import { createTrack } from '@domain/entities/track';
import { TrackId } from '@domain/value-objects/track-id';
import { Duration } from '@domain/value-objects/duration';
import { createLocalSource, type AudioFileType } from '@domain/value-objects/audio-source';
import { createAudioStream, type AudioStream } from '@domain/value-objects/audio-stream';
import type {
	MetadataProvider,
	MetadataCapability,
	SearchOptions,
	SearchResults,
} from '@plugins/core/interfaces/metadata-provider';
import type {
	AudioSourceProvider,
	AudioSourceCapability,
} from '@plugins/core/interfaces/audio-source-provider';
import type { PluginManifest, PluginInitContext } from '@plugins/core/interfaces/base-plugin';
import { ok, err, type Result, type AsyncResult } from '@shared/types/result';

interface LocalFile {
	id: string;
	uri: string;
	name: string;
	size?: number;
	mimeType?: string;
	duration?: number;
}

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

	readonly capabilities: Set<MetadataCapability> = new Set(['search-tracks', 'get-track-info']);

	readonly audioCapabilities: Set<AudioSourceCapability> = new Set(['get-stream-url']);

	readonly configSchema = [];
	status: 'uninitialized' | 'initializing' | 'ready' | 'active' | 'error' | 'disabled' =
		'uninitialized';

	private localFiles: Map<string, LocalFile> = new Map();

	async onInit(context: PluginInitContext): AsyncResult<void, Error> {
		try {
			this.status = 'ready';
			return ok(undefined);
		} catch (error) {
			this.status = 'error';
			return err(
				error instanceof Error ? error : new Error(`Failed to initialize: ${String(error)}`)
			);
		}
	}

	async onDestroy(): AsyncResult<void, Error> {
		this.localFiles.clear();
		this.status = 'uninitialized';
		return ok(undefined);
	}

	hasCapability(capability: MetadataCapability): boolean {
		return this.capabilities.has(capability);
	}

	hasAudioCapability(capability: AudioSourceCapability): boolean {
		return this.audioCapabilities.has(capability);
	}

	supportsTrack(track: Track): boolean {
		return (
			track.source.type === 'local' ||
			(track.source.type === 'streaming' && track.source.sourcePlugin === 'local-files')
		);
	}

	async searchTracks(
		query: string,
		options?: SearchOptions
	): AsyncResult<SearchResults<Track>, Error> {
		try {
			const searchLower = query.toLowerCase();
			const matchingTracks: Track[] = [];

			for (const [id, file] of this.localFiles.entries()) {
				if (file.name.toLowerCase().includes(searchLower)) {
					const track = this.fileToTrack(id, file);
					matchingTracks.push(track);
				}
			}

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

	async searchAlbums(
		_query: string,
		_options?: SearchOptions
	): AsyncResult<SearchResults<Album>, Error> {
		return ok({
			items: [],
			total: 0,
			offset: 0,
			limit: 0,
			hasMore: false,
		});
	}

	async searchArtists(
		_query: string,
		_options?: SearchOptions
	): AsyncResult<SearchResults<Artist>, Error> {
		return ok({
			items: [],
			total: 0,
			offset: 0,
			limit: 0,
			hasMore: false,
		});
	}

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

	async getAlbumInfo(_albumId: string): AsyncResult<Album, Error> {
		return err(new Error('Album info not supported for local files'));
	}

	async getArtistInfo(_artistId: string): AsyncResult<Artist, Error> {
		return err(new Error('Artist info not supported for local files'));
	}

	async getAlbumTracks(
		_albumId: string,
		_options?: SearchOptions
	): AsyncResult<SearchResults<Track>, Error> {
		return ok({
			items: [],
			total: 0,
			offset: 0,
			limit: 0,
			hasMore: false,
		});
	}

	async getArtistAlbums(
		_artistId: string,
		_options?: SearchOptions
	): AsyncResult<SearchResults<Album>, Error> {
		return ok({
			items: [],
			total: 0,
			offset: 0,
			limit: 0,
			hasMore: false,
		});
	}

	async getStreamUrl(trackId: TrackId): AsyncResult<AudioStream, Error> {
		try {
			const file = this.localFiles.get(trackId.sourceId);

			if (!file) {
				return err(new Error(`Track not found: ${trackId.value}`));
			}

			const fileType = this.getFileType(file.name, file.mimeType);
			const format = fileType || 'mp3';

			return ok(
				createAudioStream({
					url: file.uri,
					format: format as
						| 'mp3'
						| 'aac'
						| 'opus'
						| 'flac'
						| 'webm'
						| 'ogg'
						| 'm4a'
						| 'wav',
					quality: 'high',
					contentLength: file.size,
				})
			);
		} catch (error) {
			return err(
				error instanceof Error
					? error
					: new Error(`Failed to get stream URL: ${String(error)}`)
			);
		}
	}

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

	removeLocalFile(id: string): boolean {
		return this.localFiles.delete(id);
	}

	getAllLocalFiles(): LocalFile[] {
		return Array.from(this.localFiles.values());
	}

	private fileToTrack(id: string, file: LocalFile): Track {
		const { title, artist } = this.parseFileName(file.name);
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

	private parseFileName(fileName: string): { title: string; artist: string } {
		const nameWithoutExt = fileName.replace(/\.[^.]+$/, '');
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

		return {
			title: nameWithoutExt.trim(),
			artist: 'Unknown Artist',
		};
	}

	private getFileType(fileName: string, mimeType?: string): AudioFileType | undefined {
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

		const ext = fileName.split('.').pop()?.toLowerCase();
		const validTypes: AudioFileType[] = [
			'mp3',
			'flac',
			'aac',
			'm4a',
			'wav',
			'ogg',
			'opus',
			'webm',
		];

		if (ext && validTypes.includes(ext as AudioFileType)) {
			return ext as AudioFileType;
		}

		return undefined;
	}

	private estimateBitrate(size?: number, duration?: number): number | undefined {
		if (!size || !duration || duration === 0) {
			return undefined;
		}

		return Math.round((size * 8) / (duration * 1000));
	}

	private generateFileId(): string {
		return `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
	}
}

export const localFilesProvider = new LocalFilesProvider();
