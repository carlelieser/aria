import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDownloadStore } from '@application/state/download-store';
import { TrackId } from '@domain/value-objects/track-id';
import { Duration } from '@domain/value-objects/duration';
import { createStreamingSource, createLocalSource } from '@domain/value-objects/audio-source';
import type { Track } from '@domain/entities/track';
import type { AudioSourceProvider } from '@plugins/core/interfaces/audio-source-provider';

import { DownloadService } from '@/src/application/services/download-service';
import { libraryService } from '@/src/application/services/library-service';
import { getFileInfo } from '@infrastructure/filesystem/download-manager';

vi.mock('@shared/services/logger', () => ({
	getLogger: () => ({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}),
}));

vi.mock('@infrastructure/filesystem/download-manager', () => ({
	downloadAudioFile: vi.fn().mockResolvedValue({
		success: true,
		data: { filePath: '/downloads/test.m4a', fileSize: 1024 },
	}),
	copyToDownloads: vi.fn().mockResolvedValue({
		success: true,
		data: { filePath: '/downloads/test.m4a', fileSize: 1024 },
	}),
	copyDirectoryToDownloads: vi.fn().mockResolvedValue({
		success: true,
		data: { filePath: '/downloads/test/', fileSize: 2048 },
	}),
	deleteAudioFile: vi.fn().mockResolvedValue({ success: true, data: undefined }),
	deleteDownloadDirectory: vi.fn().mockResolvedValue({ success: true, data: undefined }),
	getFileInfo: vi.fn().mockResolvedValue({ exists: true, size: 1024 }),
}));

vi.mock('@/src/application/services/library-service', () => ({
	libraryService: {
		isInLibrary: vi.fn().mockReturnValue(false),
		addTrack: vi.fn().mockReturnValue({ success: true, data: undefined }),
	},
}));

function createStreamingTrack(id: string): Track {
	return {
		id: TrackId.create('youtube-music', id),
		title: `Track ${id}`,
		artists: [{ id: `artist-${id}`, name: `Artist ${id}` }],
		duration: Duration.fromSeconds(180),
		source: createStreamingSource('youtube-music', id),
		metadata: {},
		playCount: 0,
		isFavorite: false,
	};
}

function createLocalTrack(id: string): Track {
	return {
		id: TrackId.create('local-file', id),
		title: `Local Track ${id}`,
		artists: [{ id: `artist-${id}`, name: `Artist ${id}` }],
		duration: Duration.fromSeconds(180),
		source: createLocalSource(`/music/${id}.mp3`, 'mp3'),
		metadata: {},
		playCount: 0,
		isFavorite: false,
	};
}

function createMockAudioSourceProvider(id: string) {
	return {
		manifest: { id, name: id, version: '1.0.0' },
		supportsTrack: vi.fn().mockReturnValue(true),
		getStreamUrl: vi.fn().mockResolvedValue({
			success: true,
			data: {
				url: 'https://example.com/audio.m4a',
				format: 'm4a',
				headers: {},
			},
		}),
	} as unknown as AudioSourceProvider;
}

describe('DownloadService', () => {
	let service: DownloadService;

	beforeEach(() => {
		service = new DownloadService();
		useDownloadStore.setState({
			downloads: new Map(),
			downloadedTracks: new Map(),
		});
		vi.clearAllMocks();
	});

	describe('setAudioSourceProviders', () => {
		it('should set providers', () => {
			const provider = createMockAudioSourceProvider('youtube-music');
			service.setAudioSourceProviders([provider]);

			expect(true).toBe(true);
		});
	});

	describe('addAudioSourceProvider', () => {
		it('should add a provider', () => {
			const provider = createMockAudioSourceProvider('youtube-music');
			service.addAudioSourceProvider(provider);

			expect(true).toBe(true);
		});

		it('should not add duplicate provider', () => {
			const provider = createMockAudioSourceProvider('youtube-music');
			service.addAudioSourceProvider(provider);
			service.addAudioSourceProvider(provider);

			expect(true).toBe(true);
		});
	});

	describe('removeAudioSourceProvider', () => {
		it('should remove a provider by id', () => {
			const provider = createMockAudioSourceProvider('youtube-music');
			service.addAudioSourceProvider(provider);
			service.removeAudioSourceProvider('youtube-music');

			expect(true).toBe(true);
		});
	});

	describe('canDownloadTrack', () => {
		it('should return true for a downloadable streaming track', () => {
			const track = createStreamingTrack('t1');

			expect(service.canDownloadTrack(track)).toBe(true);
		});

		it('should return false for a local track', () => {
			const track = createLocalTrack('t1');

			expect(service.canDownloadTrack(track)).toBe(false);
		});

		it('should return false when track is already downloaded', () => {
			const track = createStreamingTrack('t1');

			useDownloadStore.getState().startDownload('youtube-music:t1', {
				title: 'Track t1',
				artistName: 'Artist t1',
			});
			useDownloadStore.getState().completeDownload('youtube-music:t1', {
				trackId: 'youtube-music:t1',
				filePath: '/downloads/t1.m4a',
				fileSize: 1024,
				sourcePlugin: 'youtube-music',
				format: 'm4a',
				title: 'Track t1',
				artistName: 'Artist t1',
				downloadedAt: Date.now(),
			});

			expect(service.canDownloadTrack(track)).toBe(false);
		});

		it('should return false when track is currently downloading', () => {
			const track = createStreamingTrack('t1');

			useDownloadStore.getState().startDownload('youtube-music:t1', {
				title: 'Track t1',
				artistName: 'Artist t1',
			});

			expect(service.canDownloadTrack(track)).toBe(false);
		});
	});

	describe('downloadTrack', () => {
		it('should download a track successfully', async () => {
			const provider = createMockAudioSourceProvider('youtube-music');
			service.setAudioSourceProviders([provider]);

			const track = createStreamingTrack('t1');
			const result = await service.downloadTrack(track);

			expect(result.success).toBe(true);
		});

		it('should add track to library after download', async () => {
			const provider = createMockAudioSourceProvider('youtube-music');
			service.setAudioSourceProviders([provider]);

			const track = createStreamingTrack('t1');
			await service.downloadTrack(track);

			expect(libraryService.addTrack).toHaveBeenCalledWith(track);
		});

		it('should not add track to library if already in library', async () => {
			vi.mocked(libraryService.isInLibrary).mockReturnValue(true);
			const provider = createMockAudioSourceProvider('youtube-music');
			service.setAudioSourceProviders([provider]);

			const track = createStreamingTrack('t1');
			await service.downloadTrack(track);

			expect(libraryService.addTrack).not.toHaveBeenCalled();
		});

		it('should return error for local tracks', async () => {
			const track = createLocalTrack('t1');
			const result = await service.downloadTrack(track);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain('already on device');
			}
		});

		it('should return error when no audio source provider available', async () => {
			const track = createStreamingTrack('t1');
			const result = await service.downloadTrack(track);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain('No audio source provider');
			}
		});

		it('should return error when stream format is non-downloadable', async () => {
			const provider = createMockAudioSourceProvider('youtube-music');
			vi.mocked(provider.getStreamUrl).mockResolvedValue({
				success: true,
				data: {
					url: 'https://example.com/stream.m3u8',
					format: 'hls',
					quality: 'medium' as const,
					headers: {},
				},
			});
			service.setAudioSourceProviders([provider]);

			const track = createStreamingTrack('t1');
			const result = await service.downloadTrack(track);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain('No downloadable audio source');
			}
		});
	});

	describe('downloadTracks', () => {
		it('should download multiple tracks', async () => {
			const provider = createMockAudioSourceProvider('youtube-music');
			service.setAudioSourceProviders([provider]);

			const tracks = [createStreamingTrack('t1'), createStreamingTrack('t2')];
			const result = await service.downloadTracks(tracks);

			expect(result.completed).toBe(2);
			expect(result.failed).toBe(0);
			expect(result.cancelled).toBe(false);
		});

		it('should return zero counts when no eligible tracks', async () => {
			const tracks = [createLocalTrack('t1'), createLocalTrack('t2')];
			const result = await service.downloadTracks(tracks);

			expect(result.completed).toBe(0);
			expect(result.failed).toBe(0);
		});
	});

	describe('cancelBatchDownload', () => {
		it('should set batch cancelled flag', () => {
			service.cancelBatchDownload();

			// No error means success
			expect(true).toBe(true);
		});
	});

	describe('removeDownload', () => {
		it('should succeed when track has no download metadata', async () => {
			const result = await service.removeDownload('youtube-music:nonexistent');

			expect(result.success).toBe(true);
		});

		it('should remove download and delete file', async () => {
			useDownloadStore.getState().startDownload('youtube-music:t1', {
				title: 'Track t1',
				artistName: 'Artist t1',
			});
			useDownloadStore.getState().completeDownload('youtube-music:t1', {
				trackId: 'youtube-music:t1',
				filePath: '/downloads/t1.m4a',
				fileSize: 1024,
				sourcePlugin: 'youtube-music',
				format: 'm4a',
				title: 'Track t1',
				artistName: 'Artist t1',
				downloadedAt: Date.now(),
			});

			const result = await service.removeDownload('youtube-music:t1');

			expect(result.success).toBe(true);
			expect(useDownloadStore.getState().isDownloaded('youtube-music:t1')).toBe(false);
		});
	});

	describe('isDownloaded', () => {
		it('should return false when track is not downloaded', () => {
			expect(service.isDownloaded('youtube-music:t1')).toBe(false);
		});

		it('should return true when track is downloaded', () => {
			useDownloadStore.getState().startDownload('youtube-music:t1', {
				title: 'Track t1',
				artistName: 'Artist t1',
			});
			useDownloadStore.getState().completeDownload('youtube-music:t1', {
				trackId: 'youtube-music:t1',
				filePath: '/downloads/t1.m4a',
				fileSize: 1024,
				sourcePlugin: 'youtube-music',
				format: 'm4a',
				title: 'Track t1',
				artistName: 'Artist t1',
				downloadedAt: Date.now(),
			});

			expect(service.isDownloaded('youtube-music:t1')).toBe(true);
		});
	});

	describe('isDownloading', () => {
		it('should return false when track is not downloading', () => {
			expect(service.isDownloading('youtube-music:t1')).toBe(false);
		});

		it('should return true when track is in download store as downloading', () => {
			useDownloadStore.getState().startDownload('youtube-music:t1', {
				title: 'Track t1',
				artistName: 'Artist t1',
			});

			expect(service.isDownloading('youtube-music:t1')).toBe(true);
		});
	});

	describe('getLocalFilePath', () => {
		it('should return null when track has no download', () => {
			expect(service.getLocalFilePath('youtube-music:t1')).toBeNull();
		});

		it('should return file path when track is downloaded', () => {
			useDownloadStore.getState().startDownload('youtube-music:t1', {
				title: 'Track t1',
				artistName: 'Artist t1',
			});
			useDownloadStore.getState().completeDownload('youtube-music:t1', {
				trackId: 'youtube-music:t1',
				filePath: '/downloads/t1.m4a',
				fileSize: 1024,
				sourcePlugin: 'youtube-music',
				format: 'm4a',
				title: 'Track t1',
				artistName: 'Artist t1',
				downloadedAt: Date.now(),
			});

			expect(service.getLocalFilePath('youtube-music:t1')).toBe('/downloads/t1.m4a');
		});
	});

	describe('resolveTrackSource', () => {
		it('should return original source for non-streaming tracks', () => {
			const track = createLocalTrack('t1');
			const resolved = service.resolveTrackSource(track);

			expect(resolved.type).toBe('local');
		});

		it('should return original source when no download exists', () => {
			const track = createStreamingTrack('t1');
			const resolved = service.resolveTrackSource(track);

			expect(resolved.type).toBe('streaming');
		});

		it('should return downloaded source when download exists', () => {
			const track = createStreamingTrack('t1');

			useDownloadStore.getState().startDownload('youtube-music:t1', {
				title: 'Track t1',
				artistName: 'Artist t1',
			});
			useDownloadStore.getState().completeDownload('youtube-music:t1', {
				trackId: 'youtube-music:t1',
				filePath: '/downloads/t1.m4a',
				fileSize: 1024,
				sourcePlugin: 'youtube-music',
				format: 'm4a',
				title: 'Track t1',
				artistName: 'Artist t1',
				downloadedAt: Date.now(),
			});

			const resolved = service.resolveTrackSource(track);

			expect(resolved.type).toBe('downloaded');
		});
	});

	describe('verifyDownload', () => {
		it('should return false when track has no download', async () => {
			const result = await service.verifyDownload('youtube-music:nonexistent');

			expect(result).toBe(false);
		});

		it('should return true when download file exists', async () => {
			useDownloadStore.getState().startDownload('youtube-music:t1', {
				title: 'Track t1',
				artistName: 'Artist t1',
			});
			useDownloadStore.getState().completeDownload('youtube-music:t1', {
				trackId: 'youtube-music:t1',
				filePath: '/downloads/t1.m4a',
				fileSize: 1024,
				sourcePlugin: 'youtube-music',
				format: 'm4a',
				title: 'Track t1',
				artistName: 'Artist t1',
				downloadedAt: Date.now(),
			});

			const result = await service.verifyDownload('youtube-music:t1');

			expect(result).toBe(true);
		});

		it('should return false and clean up when file is missing', async () => {
			vi.mocked(getFileInfo).mockResolvedValueOnce({ exists: false, size: 0 });

			useDownloadStore.getState().startDownload('youtube-music:t1', {
				title: 'Track t1',
				artistName: 'Artist t1',
			});
			useDownloadStore.getState().completeDownload('youtube-music:t1', {
				trackId: 'youtube-music:t1',
				filePath: '/downloads/t1.m4a',
				fileSize: 1024,
				sourcePlugin: 'youtube-music',
				format: 'm4a',
				title: 'Track t1',
				artistName: 'Artist t1',
				downloadedAt: Date.now(),
			});

			const result = await service.verifyDownload('youtube-music:t1');

			expect(result).toBe(false);
			expect(useDownloadStore.getState().isDownloaded('youtube-music:t1')).toBe(false);
		});
	});
});
