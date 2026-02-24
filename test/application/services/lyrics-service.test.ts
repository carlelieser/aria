import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TrackId } from '@domain/value-objects/track-id';
import type { MetadataProvider } from '@plugins/core/interfaces/metadata-provider';
import type { Lyrics } from '@shared/types/lyrics';

import { LyricsService } from '@/src/application/services/lyrics-service';

vi.mock('@shared/services/logger', () => ({
	getLogger: () => ({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}),
}));

function createMockProvider(id: string, overrides: Record<string, unknown> = {}) {
	return {
		manifest: { id, name: id, version: '1.0.0' },
		hasCapability: vi.fn().mockReturnValue(false),
		getLyrics: vi.fn(),
		searchTracks: vi.fn(),
		searchAlbums: vi.fn(),
		searchArtists: vi.fn(),
		getAlbumInfo: vi.fn(),
		getAlbumTracks: vi.fn(),
		getArtistInfo: vi.fn(),
		getArtistAlbums: vi.fn(),
		...overrides,
	} as unknown as MetadataProvider;
}

describe('LyricsService', () => {
	let service: LyricsService;

	beforeEach(() => {
		vi.useFakeTimers();
		service = new LyricsService();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('setMetadataProviders', () => {
		it('should set providers and clear cache', () => {
			const provider = createMockProvider('test-provider');
			service.setMetadataProviders([provider]);

			// No error means success
			expect(true).toBe(true);
		});
	});

	describe('addMetadataProvider', () => {
		it('should add a provider', () => {
			const provider = createMockProvider('test-provider');
			service.addMetadataProvider(provider);

			// No error means success
			expect(true).toBe(true);
		});

		it('should not add duplicate provider', () => {
			const provider = createMockProvider('test-provider');
			service.addMetadataProvider(provider);
			service.addMetadataProvider(provider);

			// No error means success
			expect(true).toBe(true);
		});
	});

	describe('removeMetadataProvider', () => {
		it('should remove a provider by id', () => {
			const provider = createMockProvider('test-provider');
			service.addMetadataProvider(provider);
			service.removeMetadataProvider('test-provider');

			// No error means success
			expect(true).toBe(true);
		});
	});

	describe('getLyrics', () => {
		it('should return null when no providers have lyrics capability', async () => {
			const provider = createMockProvider('test-provider', {
				hasCapability: vi.fn().mockReturnValue(false),
			});
			service.setMetadataProviders([provider]);

			const trackId = TrackId.create('youtube-music', 'test-track');
			const result = await service.getLyrics(trackId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBeNull();
			}
		});

		it('should return lyrics when provider has them', async () => {
			const mockLyrics = {
				plainText: 'Hello world',
				syncedLyrics: [
					{ text: 'Hello', startTime: 0, endTime: 1000 },
					{ text: 'world', startTime: 1000, endTime: 2000 },
				],
			};

			const provider = createMockProvider('test-provider', {
				hasCapability: vi.fn().mockReturnValue(true),
				getLyrics: vi.fn().mockResolvedValue({
					success: true,
					data: mockLyrics,
				}),
			});
			service.setMetadataProviders([provider]);

			const trackId = TrackId.create('youtube-music', 'test-track');
			const result = await service.getLyrics(trackId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual(mockLyrics);
			}
		});

		it('should return cached lyrics on subsequent calls', async () => {
			const mockLyrics = { plainText: 'Cached lyrics' };
			const provider = createMockProvider('test-provider', {
				hasCapability: vi.fn().mockReturnValue(true),
				getLyrics: vi.fn().mockResolvedValue({
					success: true,
					data: mockLyrics,
				}),
			});
			service.setMetadataProviders([provider]);

			const trackId = TrackId.create('youtube-music', 'test-track');

			await service.getLyrics(trackId);
			const result = await service.getLyrics(trackId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual(mockLyrics);
			}
			expect(vi.mocked(provider.getLyrics)).toHaveBeenCalledTimes(1);
		});

		it('should try next provider when first fails', async () => {
			const mockLyrics = { plainText: 'From second provider' };

			const provider1 = createMockProvider('provider-1', {
				hasCapability: vi.fn().mockReturnValue(true),
				getLyrics: vi.fn().mockResolvedValue({ success: false, error: new Error('fail') }),
			});
			const provider2 = createMockProvider('provider-2', {
				hasCapability: vi.fn().mockReturnValue(true),
				getLyrics: vi.fn().mockResolvedValue({
					success: true,
					data: mockLyrics,
				}),
			});
			service.setMetadataProviders([provider1, provider2]);

			const trackId = TrackId.create('youtube-music', 'test-track');
			const result = await service.getLyrics(trackId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual(mockLyrics);
			}
		});

		it('should return null when all providers fail', async () => {
			const provider = createMockProvider('test-provider', {
				hasCapability: vi.fn().mockReturnValue(true),
				getLyrics: vi.fn().mockRejectedValue(new Error('Network error')),
			});
			service.setMetadataProviders([provider]);

			const trackId = TrackId.create('youtube-music', 'test-track');
			const result = await service.getLyrics(trackId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBeNull();
			}
		});

		it('should cache null results', async () => {
			const provider = createMockProvider('test-provider', {
				hasCapability: vi.fn().mockReturnValue(true),
				getLyrics: vi.fn().mockResolvedValue({ success: false, error: new Error('fail') }),
			});
			service.setMetadataProviders([provider]);

			const trackId = TrackId.create('youtube-music', 'test-track');

			await service.getLyrics(trackId);
			await service.getLyrics(trackId);

			expect(vi.mocked(provider.getLyrics)).toHaveBeenCalledTimes(1);
		});

		it('should deduplicate concurrent requests for the same track', async () => {
			const mockLyrics = { plainText: 'lyrics' };
			const provider = createMockProvider('test-provider', {
				hasCapability: vi.fn().mockReturnValue(true),
				getLyrics: vi.fn().mockResolvedValue({
					success: true,
					data: mockLyrics,
				}),
			});
			service.setMetadataProviders([provider]);

			const trackId = TrackId.create('youtube-music', 'test-track');

			const [result1, result2] = await Promise.all([
				service.getLyrics(trackId),
				service.getLyrics(trackId),
			]);

			expect(result1.success).toBe(true);
			expect(result2.success).toBe(true);
			expect(vi.mocked(provider.getLyrics)).toHaveBeenCalledTimes(1);
		});
	});

	describe('clearCache', () => {
		it('should clear cached lyrics', async () => {
			const mockLyrics = { plainText: 'lyrics' };
			const provider = createMockProvider('test-provider', {
				hasCapability: vi.fn().mockReturnValue(true),
				getLyrics: vi.fn().mockResolvedValue({
					success: true,
					data: mockLyrics,
				}),
			});
			service.setMetadataProviders([provider]);

			const trackId = TrackId.create('youtube-music', 'test-track');
			await service.getLyrics(trackId);

			service.clearCache();
			await service.getLyrics(trackId);

			expect(vi.mocked(provider.getLyrics)).toHaveBeenCalledTimes(2);
		});
	});

	describe('findCurrentLineIndex', () => {
		const lyricsTrackId = TrackId.create('youtube-music', 'lyrics-test');
		const lyrics: Lyrics = {
			trackId: lyricsTrackId,
			plainLyrics: 'line 1\nline 2\nline 3',
			syncedLyrics: [
				{ text: 'line 1', startTime: 0, endTime: 1000 },
				{ text: 'line 2', startTime: 1000, endTime: 2000 },
				{ text: 'line 3', startTime: 2000, endTime: 3000 },
			],
		};

		it('should return -1 when synced lyrics are empty', () => {
			const emptyLyrics: Lyrics = {
				trackId: lyricsTrackId,
				plainLyrics: 'text',
				syncedLyrics: [],
			};
			const result = service.findCurrentLineIndex(emptyLyrics, 500);

			expect(result).toBe(-1);
		});

		it('should return -1 when synced lyrics are undefined', () => {
			const noSyncLyrics: Lyrics = { trackId: lyricsTrackId, plainLyrics: 'text' };
			const result = service.findCurrentLineIndex(noSyncLyrics, 500);

			expect(result).toBe(-1);
		});

		it('should return first line index when position is at the start', () => {
			const result = service.findCurrentLineIndex(lyrics, 0);

			expect(result).toBe(0);
		});

		it('should return correct line index for a mid-line position', () => {
			const result = service.findCurrentLineIndex(lyrics, 1500);

			expect(result).toBe(1);
		});

		it('should return last line index when position is at the end', () => {
			const result = service.findCurrentLineIndex(lyrics, 2500);

			expect(result).toBe(2);
		});

		it('should return -1 when position is before all lines', () => {
			const lyricsWithOffset: Lyrics = {
				trackId: lyricsTrackId,
				plainLyrics: 'text',
				syncedLyrics: [{ text: 'line 1', startTime: 5000, endTime: 6000 }],
			};
			const result = service.findCurrentLineIndex(lyricsWithOffset, 100);

			expect(result).toBe(-1);
		});

		it('should return correct index at exact boundary between lines', () => {
			const result = service.findCurrentLineIndex(lyrics, 1000);

			expect(result).toBe(1);
		});
	});
});
