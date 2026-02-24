import { describe, it, expect } from 'vitest';
import { enrichTracksWithAlbumArtwork, getAlbumInfo } from '@domain/utils/album-utils';
import { createTrack } from '@domain/entities/track';
import { TrackId } from '@domain/value-objects/track-id';
import { Duration } from '@domain/value-objects/duration';

function makeTrack(
	overrides: {
		title?: string;
		artistName?: string;
		artistId?: string;
		albumId?: string;
		albumName?: string;
		artwork?: { url: string; width?: number; height?: number }[];
	} = {}
) {
	return createTrack({
		id: TrackId.create('youtube-music', overrides.title ?? 'test-id'),
		title: overrides.title ?? 'Test Track',
		artists: [{ id: overrides.artistId ?? 'a1', name: overrides.artistName ?? 'Artist A' }],
		album: overrides.albumId
			? { id: overrides.albumId, name: overrides.albumName ?? 'Album X' }
			: undefined,
		duration: Duration.fromSeconds(180),
		artwork: overrides.artwork,
		source: { type: 'streaming', sourcePlugin: 'youtube-music', sourceId: 'test-id' },
	});
}

describe('album-utils', () => {
	describe('enrichTracksWithAlbumArtwork', () => {
		it('should return tracks unchanged when albumArtworkUrl is undefined', () => {
			const tracks = [makeTrack()];

			const result = enrichTracksWithAlbumArtwork(tracks, undefined);

			expect(result).toEqual(tracks);
		});

		it('should not overwrite existing track artwork', () => {
			const existingArtwork = [{ url: 'https://example.com/track.jpg' }];
			const tracks = [makeTrack({ artwork: existingArtwork })];

			const result = enrichTracksWithAlbumArtwork(tracks, 'https://example.com/album.jpg');

			expect(result[0].artwork).toEqual(existingArtwork);
		});

		it('should add album artwork to tracks without artwork', () => {
			const tracks = [makeTrack({ artwork: undefined })];

			const result = enrichTracksWithAlbumArtwork(tracks, 'https://example.com/album.jpg');

			expect(result[0].artwork).toEqual([{ url: 'https://example.com/album.jpg' }]);
		});

		it('should add album artwork to tracks with empty artwork array', () => {
			const tracks = [makeTrack({ artwork: [] })];

			const result = enrichTracksWithAlbumArtwork(tracks, 'https://example.com/album.jpg');

			expect(result[0].artwork).toEqual([{ url: 'https://example.com/album.jpg' }]);
		});

		it('should handle mixed tracks with and without artwork', () => {
			const existingArtwork = [{ url: 'https://example.com/existing.jpg' }];
			const tracks = [
				makeTrack({ title: 'Track 1', artwork: existingArtwork }),
				makeTrack({ title: 'Track 2', artwork: undefined }),
			];

			const result = enrichTracksWithAlbumArtwork(tracks, 'https://example.com/album.jpg');

			expect(result[0].artwork).toEqual(existingArtwork);
			expect(result[1].artwork).toEqual([{ url: 'https://example.com/album.jpg' }]);
		});

		it('should return empty array when given empty tracks array', () => {
			const result = enrichTracksWithAlbumArtwork([], 'https://example.com/album.jpg');

			expect(result).toEqual([]);
		});
	});

	describe('getAlbumInfo', () => {
		it('should return album info from matching track', () => {
			const tracks = [
				makeTrack({
					albumId: 'album-1',
					albumName: 'My Album',
					artistName: 'Great Artist',
					artwork: [{ url: 'https://example.com/art.jpg', width: 300, height: 300 }],
				}),
			];

			const result = getAlbumInfo(tracks, 'album-1');

			expect(result.name).toBe('My Album');
			expect(result.artists).toBe('Great Artist');
			expect(result.artwork).toBeDefined();
		});

		it('should return fallback name when no track matches album id', () => {
			const tracks = [makeTrack({ albumId: 'other-album' })];

			const result = getAlbumInfo(tracks, 'missing-album', 'Fallback Album');

			expect(result.name).toBe('Fallback Album');
			expect(result.artists).toBe('Unknown Artist');
			expect(result.artwork).toBeUndefined();
		});

		it('should return "Unknown Album" when no match and no fallback', () => {
			const tracks = [makeTrack()];

			const result = getAlbumInfo(tracks, 'missing-album');

			expect(result.name).toBe('Unknown Album');
		});

		it('should return "Unknown Artist" when no track matches', () => {
			const result = getAlbumInfo([], 'any-album');

			expect(result.artists).toBe('Unknown Artist');
		});

		it('should return undefined artwork when matching track has no artwork', () => {
			const tracks = [makeTrack({ albumId: 'album-1', artwork: undefined })];

			const result = getAlbumInfo(tracks, 'album-1');

			expect(result.artwork).toBeUndefined();
		});
	});
});
