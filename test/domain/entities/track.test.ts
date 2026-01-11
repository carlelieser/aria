import { describe, it, expect } from 'vitest';
import {
	createTrack,
	getPrimaryArtist,
	getArtistNames,
	getArtworkUrl,
	type Track,
	type CreateTrackParams,
} from '@domain/entities/track';
import { TrackId } from '@domain/value-objects/track-id';
import { Duration } from '@domain/value-objects/duration';
import { createStreamingSource } from '@domain/value-objects/audio-source';
import type { ArtistReference } from '@domain/entities/artist';
import type { Artwork } from '@domain/value-objects/artwork';

describe('Track Entity', () => {
	const createTestTrackParams = (
		overrides: Partial<CreateTrackParams> = {}
	): CreateTrackParams => ({
		id: TrackId.create('youtube-music', 'test123'),
		title: 'Test Song',
		artists: [{ id: 'artist1', name: 'Test Artist' }],
		duration: Duration.fromSeconds(180),
		source: createStreamingSource('youtube-music', 'test123'),
		...overrides,
	});

	describe('createTrack', () => {
		it('should create a track with required properties', () => {
			const params = createTestTrackParams();
			const track = createTrack(params);

			expect(track.id).toBe(params.id);
			expect(track.title).toBe('Test Song');
			expect(track.artists).toEqual([{ id: 'artist1', name: 'Test Artist' }]);
			expect(track.duration.totalSeconds).toBe(180);
		});

		it('should create track with default metadata', () => {
			const track = createTrack(createTestTrackParams());
			expect(track.metadata).toEqual({});
		});

		it('should create track with custom metadata', () => {
			const track = createTrack(
				createTestTrackParams({
					metadata: {
						genre: 'Rock',
						year: 2023,
						explicit: true,
					},
				})
			);

			expect(track.metadata.genre).toBe('Rock');
			expect(track.metadata.year).toBe(2023);
			expect(track.metadata.explicit).toBe(true);
		});

		it('should set default values for optional properties', () => {
			const track = createTrack(createTestTrackParams());

			expect(track.addedAt).toBeUndefined();
			expect(track.playCount).toBe(0);
			expect(track.isFavorite).toBe(false);
		});

		it('should create track with album reference', () => {
			const track = createTrack(
				createTestTrackParams({
					album: { id: 'album1', name: 'Test Album' },
				})
			);

			expect(track.album).toEqual({ id: 'album1', name: 'Test Album' });
		});

		it('should create track with artwork array', () => {
			const artworks: Artwork[] = [
				{ url: 'https://example.com/small.jpg', width: 100, height: 100 },
				{ url: 'https://example.com/large.jpg', width: 500, height: 500 },
			];
			const track = createTrack(createTestTrackParams({ artwork: artworks }));

			expect(track.artwork).toHaveLength(2);
			expect(track.artwork?.[0].url).toBe('https://example.com/small.jpg');
		});

		it('should be frozen (immutable)', () => {
			const track = createTrack(createTestTrackParams());
			expect(Object.isFrozen(track)).toBe(true);
		});

		it('should create track with multiple artists', () => {
			const artists: ArtistReference[] = [
				{ id: 'artist1', name: 'Artist One' },
				{ id: 'artist2', name: 'Artist Two' },
				{ id: 'artist3', name: 'Artist Three' },
			];
			const track = createTrack(createTestTrackParams({ artists }));

			expect(track.artists).toHaveLength(3);
		});
	});

	describe('getPrimaryArtist', () => {
		it('should return first artist name', () => {
			const track = createTrack(
				createTestTrackParams({
					artists: [
						{ id: 'artist1', name: 'Primary Artist' },
						{ id: 'artist2', name: 'Featured Artist' },
					],
				})
			);

			expect(getPrimaryArtist(track)).toBe('Primary Artist');
		});

		it('should return Unknown Artist when no artists', () => {
			const track = createTrack(createTestTrackParams({ artists: [] }));
			expect(getPrimaryArtist(track)).toBe('Unknown Artist');
		});
	});

	describe('getArtistNames', () => {
		it('should return single artist name', () => {
			const track = createTrack(
				createTestTrackParams({
					artists: [{ id: 'artist1', name: 'Solo Artist' }],
				})
			);

			expect(getArtistNames(track)).toBe('Solo Artist');
		});

		it('should join multiple artist names with comma', () => {
			const track = createTrack(
				createTestTrackParams({
					artists: [
						{ id: 'artist1', name: 'Artist One' },
						{ id: 'artist2', name: 'Artist Two' },
						{ id: 'artist3', name: 'Artist Three' },
					],
				})
			);

			expect(getArtistNames(track)).toBe('Artist One, Artist Two, Artist Three');
		});

		it('should return Unknown Artist when no artists', () => {
			const track = createTrack(createTestTrackParams({ artists: [] }));
			expect(getArtistNames(track)).toBe('Unknown Artist');
		});
	});

	describe('getArtworkUrl', () => {
		it('should return undefined when no artwork', () => {
			const track = createTrack(createTestTrackParams({ artwork: undefined }));
			expect(getArtworkUrl(track)).toBeUndefined();
		});

		it('should return undefined for empty artwork array', () => {
			const track = createTrack(createTestTrackParams({ artwork: [] }));
			expect(getArtworkUrl(track)).toBeUndefined();
		});

		it('should return largest artwork when no preferred size specified', () => {
			const artworks: Artwork[] = [
				{ url: 'small.jpg', width: 100, height: 100 },
				{ url: 'large.jpg', width: 500, height: 500 },
				{ url: 'medium.jpg', width: 300, height: 300 },
			];
			const track = createTrack(createTestTrackParams({ artwork: artworks }));

			expect(getArtworkUrl(track)).toBe('large.jpg');
		});

		it('should return closest match to preferred size', () => {
			const artworks: Artwork[] = [
				{ url: 'small.jpg', width: 100, height: 100 },
				{ url: 'large.jpg', width: 500, height: 500 },
				{ url: 'medium.jpg', width: 300, height: 300 },
			];
			const track = createTrack(createTestTrackParams({ artwork: artworks }));

			expect(getArtworkUrl(track, 300)).toBe('medium.jpg');
			expect(getArtworkUrl(track, 100)).toBe('small.jpg');
			expect(getArtworkUrl(track, 400)).toBe('large.jpg');
		});

		it('should handle artwork without dimensions', () => {
			const artworks: Artwork[] = [
				{ url: 'no-dims.jpg' },
				{ url: 'with-dims.jpg', width: 300, height: 300 },
			];
			const track = createTrack(createTestTrackParams({ artwork: artworks }));

			expect(getArtworkUrl(track)).toBe('with-dims.jpg');
		});
	});
});
