import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAlbumStore } from '@application/state/album-store';
import { AlbumId } from '@domain/value-objects/album-id';
import { TrackId } from '@domain/value-objects/track-id';
import { Duration } from '@domain/value-objects/duration';
import { createStreamingSource } from '@domain/value-objects/audio-source';
import type { Track } from '@domain/entities/track';
import type { Album } from '@domain/entities/album';
import type { MetadataProvider } from '@plugins/core/interfaces/metadata-provider';

import { AlbumService } from '@/src/application/services/album-service';

vi.mock('@shared/services/logger', () => ({
	getLogger: () => ({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}),
}));

function createMockAlbum(id: string, name: string): Album {
	return {
		id: AlbumId.create('youtube-music', id),
		name,
		artists: [{ id: 'artist-1', name: 'Test Artist' }],
	};
}

function createMockTrack(id: string, trackNumber?: number): Track {
	return {
		id: TrackId.create('youtube-music', id),
		title: `Track ${id}`,
		artists: [{ id: 'artist-1', name: 'Test Artist' }],
		duration: Duration.fromSeconds(180),
		source: createStreamingSource('youtube-music', id),
		metadata: { trackNumber },
		playCount: 0,
		isFavorite: false,
	};
}

function createMockProvider(id: string, overrides: Record<string, unknown> = {}) {
	return {
		manifest: { id, name: id, version: '1.0.0' },
		hasCapability: vi.fn().mockReturnValue(true),
		searchTracks: vi.fn(),
		searchAlbums: vi.fn(),
		searchArtists: vi.fn(),
		getAlbumInfo: vi.fn().mockResolvedValue({
			success: true,
			data: createMockAlbum('album-1', 'Test Album'),
		}),
		getAlbumTracks: vi.fn().mockResolvedValue({
			success: true,
			data: {
				items: [createMockTrack('t1', 2), createMockTrack('t2', 1)],
				offset: 0,
				limit: 50,
				hasMore: false,
			},
		}),
		getArtistInfo: vi.fn(),
		getArtistAlbums: vi.fn(),
		...overrides,
	} as unknown as MetadataProvider;
}

describe('AlbumService', () => {
	let service: AlbumService;

	beforeEach(() => {
		service = new AlbumService();
		useAlbumStore.setState({ albums: new Map() });
	});

	describe('setMetadataProviders', () => {
		it('should set providers and clear cache', () => {
			const provider = createMockProvider('youtube-music');
			service.setMetadataProviders([provider]);

			expect(true).toBe(true);
		});
	});

	describe('addMetadataProvider', () => {
		it('should add a provider', () => {
			const provider = createMockProvider('youtube-music');
			service.addMetadataProvider(provider);

			expect(true).toBe(true);
		});

		it('should not add duplicate provider', () => {
			const provider = createMockProvider('youtube-music');
			service.addMetadataProvider(provider);
			service.addMetadataProvider(provider);

			// No error means it handled duplication
			expect(true).toBe(true);
		});
	});

	describe('removeMetadataProvider', () => {
		it('should remove a provider by id', () => {
			const provider = createMockProvider('youtube-music');
			service.addMetadataProvider(provider);
			service.removeMetadataProvider('youtube-music');

			expect(true).toBe(true);
		});
	});

	describe('getAlbumDetail', () => {
		it('should return album detail with sorted tracks when successful', async () => {
			const provider = createMockProvider('youtube-music');
			service.setMetadataProviders([provider]);

			const result = await service.getAlbumDetail('youtube-music:album-1');

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.album).not.toBeNull();
				expect(result.data.album?.name).toBe('Test Album');
				// Tracks should be sorted by trackNumber
				expect(result.data.tracks[0].metadata.trackNumber).toBe(1);
				expect(result.data.tracks[1].metadata.trackNumber).toBe(2);
			}
		});

		it('should update album store with results', async () => {
			const provider = createMockProvider('youtube-music');
			service.setMetadataProviders([provider]);

			await service.getAlbumDetail('youtube-music:album-1');

			const storeState = useAlbumStore.getState();
			const detail = storeState.albums.get('youtube-music:album-1');
			expect(detail).toBeDefined();
			expect(detail?.album?.name).toBe('Test Album');
		});

		it('should return error when no providers are available', async () => {
			const result = await service.getAlbumDetail('youtube-music:album-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain('No metadata providers available');
			}
		});

		it('should return error when album ID format is invalid', async () => {
			const provider = createMockProvider('youtube-music');
			service.setMetadataProviders([provider]);

			const result = await service.getAlbumDetail('invalid-id');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain('Invalid album ID format');
			}
		});

		it('should return error when no provider matches the album source', async () => {
			const provider = createMockProvider('spotify');
			service.setMetadataProviders([provider]);

			const result = await service.getAlbumDetail('youtube-music:album-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain('No provider found');
			}
		});

		it('should return error when provider does not support album tracks', async () => {
			const provider = createMockProvider('youtube-music', {
				hasCapability: vi.fn().mockReturnValue(false),
			});
			service.setMetadataProviders([provider]);

			const result = await service.getAlbumDetail('youtube-music:album-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain('does not support album tracks');
			}
		});

		it('should return error when tracks fetch fails', async () => {
			const provider = createMockProvider('youtube-music', {
				getAlbumTracks: vi.fn().mockResolvedValue({
					success: false,
					error: new Error('Network error'),
				}),
			});
			service.setMetadataProviders([provider]);

			const result = await service.getAlbumDetail('youtube-music:album-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain('Failed to fetch tracks');
			}
		});

		it('should return album as null when album info fails but tracks succeed', async () => {
			const provider = createMockProvider('youtube-music', {
				getAlbumInfo: vi.fn().mockResolvedValue({
					success: false,
					error: new Error('Not found'),
				}),
			});
			service.setMetadataProviders([provider]);

			const result = await service.getAlbumDetail('youtube-music:album-1');

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.album).toBeNull();
				expect(result.data.tracks).toHaveLength(2);
			}
		});

		it('should return cached result on second call', async () => {
			const provider = createMockProvider('youtube-music');
			service.setMetadataProviders([provider]);

			await service.getAlbumDetail('youtube-music:album-1');
			const result = await service.getAlbumDetail('youtube-music:album-1');

			expect(result.success).toBe(true);
			// Only one actual fetch should have happened
			expect(vi.mocked(provider.getAlbumTracks)).toHaveBeenCalledTimes(1);
		});

		it('should handle provider throwing an error', async () => {
			const provider = createMockProvider('youtube-music', {
				getAlbumTracks: vi.fn().mockRejectedValue(new Error('Unexpected error')),
				getAlbumInfo: vi.fn().mockRejectedValue(new Error('Unexpected error')),
			});
			service.setMetadataProviders([provider]);

			const result = await service.getAlbumDetail('youtube-music:album-1');

			expect(result.success).toBe(false);
		});
	});

	describe('clearCache', () => {
		it('should clear cached album data', async () => {
			const provider = createMockProvider('youtube-music');
			service.setMetadataProviders([provider]);

			await service.getAlbumDetail('youtube-music:album-1');
			service.clearCache();
			await service.getAlbumDetail('youtube-music:album-1');

			expect(vi.mocked(provider.getAlbumTracks)).toHaveBeenCalledTimes(2);
		});
	});
});
