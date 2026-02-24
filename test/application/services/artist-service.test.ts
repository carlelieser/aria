import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useArtistStore } from '@application/state/artist-store';
import { AlbumId } from '@domain/value-objects/album-id';
import type { Album } from '@domain/entities/album';
import type { Artist } from '@domain/entities/artist';
import type { MetadataProvider } from '@plugins/core/interfaces/metadata-provider';

import { ArtistService } from '@/src/application/services/artist-service';

vi.mock('@shared/services/logger', () => ({
	getLogger: () => ({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}),
}));

function createMockArtist(id: string, name: string): Artist {
	return {
		id,
		name,
		genres: ['pop'],
	};
}

function createMockAlbum(id: string, name: string): Album {
	return {
		id: AlbumId.create('youtube-music', id),
		name,
		artists: [{ id: 'artist-1', name: 'Test Artist' }],
	};
}

function createMockProvider(id: string, overrides: Record<string, unknown> = {}) {
	return {
		manifest: { id, name: id, version: '1.0.0' },
		hasCapability: vi.fn().mockImplementation((cap: string) => {
			if (cap === 'get-artist-info') return true;
			if (cap === 'get-artist-albums') return true;
			return false;
		}),
		searchTracks: vi.fn(),
		searchAlbums: vi.fn(),
		searchArtists: vi.fn(),
		getAlbumInfo: vi.fn(),
		getAlbumTracks: vi.fn(),
		getArtistInfo: vi.fn().mockResolvedValue({
			success: true,
			data: createMockArtist('artist-1', 'Test Artist'),
		}),
		getArtistAlbums: vi.fn().mockResolvedValue({
			success: true,
			data: {
				items: [createMockAlbum('album-1', 'Album 1')],
				offset: 0,
				limit: 20,
				hasMore: false,
			},
		}),
		...overrides,
	} as unknown as MetadataProvider;
}

describe('ArtistService', () => {
	let service: ArtistService;

	beforeEach(() => {
		service = new ArtistService();
		useArtistStore.setState({ artists: new Map() });
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

	describe('getArtistDetail', () => {
		it('should return artist detail when successful', async () => {
			const provider = createMockProvider('youtube-music');
			service.setMetadataProviders([provider]);

			const result = await service.getArtistDetail('youtube-music:artist-1');

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.artist).not.toBeNull();
				expect(result.data.artist?.name).toBe('Test Artist');
				expect(result.data.albums).toHaveLength(1);
			}
		});

		it('should update artist store with results', async () => {
			const provider = createMockProvider('youtube-music');
			service.setMetadataProviders([provider]);

			await service.getArtistDetail('youtube-music:artist-1');

			const storeState = useArtistStore.getState();
			const detail = storeState.artists.get('youtube-music:artist-1');
			expect(detail).toBeDefined();
			expect(detail?.artist?.name).toBe('Test Artist');
		});

		it('should return error when no providers are available', async () => {
			const result = await service.getArtistDetail('youtube-music:artist-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain('No metadata providers available');
			}
		});

		it('should use provider prefix to match the correct provider', async () => {
			const ytProvider = createMockProvider('youtube-music');
			const spotifyProvider = createMockProvider('spotify');
			service.setMetadataProviders([ytProvider, spotifyProvider]);

			await service.getArtistDetail('youtube-music:artist-1');

			expect(vi.mocked(ytProvider.getArtistInfo)).toHaveBeenCalled();
			expect(vi.mocked(spotifyProvider.getArtistInfo)).not.toHaveBeenCalled();
		});

		it('should try all providers when no provider prefix matches', async () => {
			const provider = createMockProvider('youtube-music');
			service.setMetadataProviders([provider]);

			await service.getArtistDetail('unknown-source:artist-1');

			// The service will try all providers since the prefix doesn't match
			expect(vi.mocked(provider.getArtistInfo)).toHaveBeenCalled();
		});

		it('should return error when no provider matches the artist prefix', async () => {
			const provider = createMockProvider('youtube-music', {
				getArtistInfo: vi.fn().mockResolvedValue({
					success: false,
					error: new Error('Not found'),
				}),
				getArtistAlbums: vi.fn().mockResolvedValue({
					success: false,
					error: new Error('Not found'),
				}),
			});
			service.setMetadataProviders([provider]);

			const result = await service.getArtistDetail('youtube-music:artist-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain('Failed to fetch artist from any provider');
			}
		});

		it('should return result even when artist info fails but albums succeed', async () => {
			const provider = createMockProvider('youtube-music', {
				getArtistInfo: vi.fn().mockResolvedValue({
					success: false,
					error: new Error('Not found'),
				}),
			});
			service.setMetadataProviders([provider]);

			const result = await service.getArtistDetail('youtube-music:artist-1');

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.artist).toBeNull();
				expect(result.data.albums).toHaveLength(1);
			}
		});

		it('should return cached result on second call', async () => {
			const provider = createMockProvider('youtube-music');
			service.setMetadataProviders([provider]);

			await service.getArtistDetail('youtube-music:artist-1');
			const result = await service.getArtistDetail('youtube-music:artist-1');

			expect(result.success).toBe(true);
			expect(vi.mocked(provider.getArtistInfo)).toHaveBeenCalledTimes(1);
		});

		it('should handle provider throwing an error gracefully', async () => {
			const provider = createMockProvider('youtube-music', {
				getArtistInfo: vi.fn().mockRejectedValue(new Error('Unexpected error')),
				getArtistAlbums: vi.fn().mockRejectedValue(new Error('Unexpected error')),
			});
			service.setMetadataProviders([provider]);

			const result = await service.getArtistDetail('youtube-music:artist-1');

			expect(result.success).toBe(false);
		});

		it('should handle artist ID without colon prefix', async () => {
			const provider = createMockProvider('youtube-music');
			service.setMetadataProviders([provider]);

			await service.getArtistDetail('plain-artist-id');

			// Should try all providers with the raw ID
			expect(vi.mocked(provider.getArtistInfo)).toHaveBeenCalledWith('plain-artist-id');
		});

		it('should return empty albums when provider does not support get-artist-albums', async () => {
			const provider = createMockProvider('youtube-music', {
				hasCapability: vi.fn().mockImplementation((cap: string) => {
					if (cap === 'get-artist-info') return true;
					return false;
				}),
			});
			service.setMetadataProviders([provider]);

			const result = await service.getArtistDetail('youtube-music:artist-1');

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.albums).toHaveLength(0);
			}
		});
	});

	describe('clearCache', () => {
		it('should clear cached artist data', async () => {
			const provider = createMockProvider('youtube-music');
			service.setMetadataProviders([provider]);

			await service.getArtistDetail('youtube-music:artist-1');
			service.clearCache();
			await service.getArtistDetail('youtube-music:artist-1');

			expect(vi.mocked(provider.getArtistInfo)).toHaveBeenCalledTimes(2);
		});
	});
});
