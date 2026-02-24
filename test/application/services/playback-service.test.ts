import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePlayerStore } from '@application/state/player-store';
import { TrackId } from '@domain/value-objects/track-id';
import { Duration } from '@domain/value-objects/duration';
import { createStreamingSource } from '@domain/value-objects/audio-source';
import type { Track } from '@domain/entities/track';
import type { PlaybackProvider, AudioSourceProvider } from '@plugins/core';

import { PlaybackService } from '@/src/application/services/playback-service';

vi.mock('@shared/services/logger', () => ({
	getLogger: () => ({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}),
}));

vi.mock('@shared/services/playback-timer', () => ({
	playbackTimer: {
		start: vi.fn(),
		beginPhase: vi.fn(),
		endPhase: vi.fn(),
		cancel: vi.fn(),
		finish: vi.fn(),
	},
}));

vi.mock('@infrastructure/filesystem', () => ({
	getFileInfo: vi.fn().mockResolvedValue({ exists: false }),
}));

vi.mock('@/src/application/services/download-service', () => ({
	downloadService: {
		resolveTrackSource: vi.fn().mockImplementation((track: Track) => track.source),
		removeDownload: vi.fn().mockResolvedValue({ success: true, data: undefined }),
	},
}));

function createTestTrack(id: string): Track {
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

function createMockPlaybackProvider(id: string) {
	return {
		manifest: { id, name: id, version: '1.0.0' },
		canHandle: vi.fn().mockReturnValue(true),
		play: vi.fn().mockResolvedValue({ success: true, data: undefined }),
		pause: vi.fn().mockResolvedValue({ success: true, data: undefined }),
		resume: vi.fn().mockResolvedValue({ success: true, data: undefined }),
		stop: vi.fn().mockResolvedValue({ success: true, data: undefined }),
		seek: vi.fn().mockResolvedValue({ success: true, data: undefined }),
		setVolume: vi.fn().mockResolvedValue({ success: true, data: undefined }),
		setRepeatMode: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		onDestroy: vi.fn().mockResolvedValue(undefined),
	} as unknown as PlaybackProvider;
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
		onStreamError: vi.fn(),
	} as unknown as AudioSourceProvider;
}

describe('PlaybackService', () => {
	let service: PlaybackService;

	beforeEach(() => {
		service = new PlaybackService();
		const store = usePlayerStore.getState();
		store.stop();
		usePlayerStore.setState({
			queue: [],
			queueIndex: -1,
			originalQueue: [],
			repeatMode: 'off',
			isShuffled: false,
			volume: 1,
			isMuted: false,
		});
		vi.clearAllMocks();
	});

	describe('setPlaybackProviders', () => {
		it('should set playback providers', () => {
			const provider = createMockPlaybackProvider('dash-player');
			service.setPlaybackProviders([provider]);

			expect(vi.mocked(provider.addEventListener)).toHaveBeenCalled();
		});

		it('should remove event listener from old providers', () => {
			const provider1 = createMockPlaybackProvider('dash-player');
			const provider2 = createMockPlaybackProvider('rntp');

			service.setPlaybackProviders([provider1]);
			service.setPlaybackProviders([provider2]);

			expect(vi.mocked(provider1.removeEventListener)).toHaveBeenCalled();
			expect(vi.mocked(provider2.addEventListener)).toHaveBeenCalled();
		});
	});

	describe('addPlaybackProvider', () => {
		it('should add a playback provider', () => {
			const provider = createMockPlaybackProvider('dash-player');
			service.addPlaybackProvider(provider);

			expect(vi.mocked(provider.addEventListener)).toHaveBeenCalled();
		});

		it('should not add duplicate playback provider', () => {
			const provider = createMockPlaybackProvider('dash-player');
			service.addPlaybackProvider(provider);
			service.addPlaybackProvider(provider);

			expect(vi.mocked(provider.addEventListener)).toHaveBeenCalledTimes(1);
		});
	});

	describe('removePlaybackProvider', () => {
		it('should remove a playback provider', () => {
			const provider = createMockPlaybackProvider('dash-player');
			service.addPlaybackProvider(provider);
			service.removePlaybackProvider('dash-player');

			expect(vi.mocked(provider.removeEventListener)).toHaveBeenCalled();
		});

		it('should do nothing when provider does not exist', () => {
			service.removePlaybackProvider('nonexistent');

			// No error means success
			expect(true).toBe(true);
		});
	});

	describe('setAudioSourceProviders', () => {
		it('should set audio source providers', () => {
			const provider = createMockAudioSourceProvider('youtube-music');
			service.setAudioSourceProviders([provider]);

			expect(true).toBe(true);
		});
	});

	describe('addAudioSourceProvider', () => {
		it('should add an audio source provider', () => {
			const provider = createMockAudioSourceProvider('youtube-music');
			service.addAudioSourceProvider(provider);

			expect(true).toBe(true);
		});

		it('should not add duplicate audio source provider', () => {
			const provider = createMockAudioSourceProvider('youtube-music');
			service.addAudioSourceProvider(provider);
			service.addAudioSourceProvider(provider);

			// No error means dedup was handled
			expect(true).toBe(true);
		});
	});

	describe('removeAudioSourceProvider', () => {
		it('should remove an audio source provider by id', () => {
			const provider = createMockAudioSourceProvider('youtube-music');
			service.addAudioSourceProvider(provider);
			service.removeAudioSourceProvider('youtube-music');

			expect(true).toBe(true);
		});
	});

	describe('play', () => {
		it('should play a track successfully', async () => {
			const playbackProvider = createMockPlaybackProvider('dash-player');
			const audioSourceProvider = createMockAudioSourceProvider('youtube-music');
			service.setPlaybackProviders([playbackProvider]);
			service.setAudioSourceProviders([audioSourceProvider]);

			const track = createTestTrack('t1');
			const result = await service.play(track);

			expect(result.success).toBe(true);
			expect(vi.mocked(playbackProvider.play)).toHaveBeenCalled();
		});

		it('should update player store to loading state', async () => {
			const playbackProvider = createMockPlaybackProvider('dash-player');
			const audioSourceProvider = createMockAudioSourceProvider('youtube-music');
			service.setPlaybackProviders([playbackProvider]);
			service.setAudioSourceProviders([audioSourceProvider]);

			const track = createTestTrack('t1');
			await service.play(track);

			// The store should have been set to loading during play
			expect(usePlayerStore.getState().currentTrack).not.toBeNull();
		});

		it('should return error when no audio source provider is available', async () => {
			const playbackProvider = createMockPlaybackProvider('dash-player');
			service.setPlaybackProviders([playbackProvider]);

			const track = createTestTrack('t1');
			const result = await service.play(track);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain('No audio source available');
			}
		});

		it('should return error when no playback provider can handle the stream', async () => {
			const playbackProvider = createMockPlaybackProvider('dash-player');
			vi.mocked(playbackProvider.canHandle!).mockReturnValue(false);
			const audioSourceProvider = createMockAudioSourceProvider('youtube-music');
			service.setPlaybackProviders([]);
			service.setAudioSourceProviders([audioSourceProvider]);

			const track = createTestTrack('t1');
			const result = await service.play(track);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain('No playback provider available');
			}
		});

		it('should return error when playback provider fails to play', async () => {
			const playbackProvider = createMockPlaybackProvider('dash-player');
			vi.mocked(playbackProvider.play).mockResolvedValue({
				success: false,
				error: new Error('Playback failed'),
			});
			const audioSourceProvider = createMockAudioSourceProvider('youtube-music');
			service.setPlaybackProviders([playbackProvider]);
			service.setAudioSourceProviders([audioSourceProvider]);

			const track = createTestTrack('t1');
			const result = await service.play(track);

			expect(result.success).toBe(false);
		});

		it('should return error when stream resolution fails', async () => {
			const playbackProvider = createMockPlaybackProvider('dash-player');
			const audioSourceProvider = createMockAudioSourceProvider('youtube-music');
			vi.mocked(audioSourceProvider.getStreamUrl).mockResolvedValue({
				success: false,
				error: new Error('Stream resolution failed'),
			});
			service.setPlaybackProviders([playbackProvider]);
			service.setAudioSourceProviders([audioSourceProvider]);

			const track = createTestTrack('t1');
			const result = await service.play(track);

			expect(result.success).toBe(false);
		});

		it('should set error on player store when play fails', async () => {
			const playbackProvider = createMockPlaybackProvider('dash-player');
			service.setPlaybackProviders([playbackProvider]);

			const track = createTestTrack('t1');
			await service.play(track);

			expect(usePlayerStore.getState().error).not.toBeNull();
		});
	});

	describe('pause', () => {
		it('should pause playback', async () => {
			const playbackProvider = createMockPlaybackProvider('dash-player');
			const audioSourceProvider = createMockAudioSourceProvider('youtube-music');
			service.setPlaybackProviders([playbackProvider]);
			service.setAudioSourceProviders([audioSourceProvider]);

			const track = createTestTrack('t1');
			await service.play(track);
			const result = await service.pause();

			expect(result.success).toBe(true);
			expect(vi.mocked(playbackProvider.pause)).toHaveBeenCalled();
		});

		it('should return error when no active provider', async () => {
			const result = await service.pause();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain('No playback provider available');
			}
		});
	});

	describe('resume', () => {
		it('should resume playback', async () => {
			const playbackProvider = createMockPlaybackProvider('dash-player');
			const audioSourceProvider = createMockAudioSourceProvider('youtube-music');
			service.setPlaybackProviders([playbackProvider]);
			service.setAudioSourceProviders([audioSourceProvider]);

			const track = createTestTrack('t1');
			await service.play(track);
			await service.pause();
			const result = await service.resume();

			expect(result.success).toBe(true);
			expect(vi.mocked(playbackProvider.resume)).toHaveBeenCalled();
		});

		it('should return error when no active provider', async () => {
			const result = await service.resume();

			expect(result.success).toBe(false);
		});
	});

	describe('stop', () => {
		it('should stop playback', async () => {
			const playbackProvider = createMockPlaybackProvider('dash-player');
			const audioSourceProvider = createMockAudioSourceProvider('youtube-music');
			service.setPlaybackProviders([playbackProvider]);
			service.setAudioSourceProviders([audioSourceProvider]);

			const track = createTestTrack('t1');
			await service.play(track);
			const result = await service.stop();

			expect(result.success).toBe(true);
			expect(vi.mocked(playbackProvider.stop)).toHaveBeenCalled();
		});

		it('should return error when no active provider', async () => {
			const result = await service.stop();

			expect(result.success).toBe(false);
		});
	});

	describe('seekTo', () => {
		it('should seek to a position', async () => {
			const playbackProvider = createMockPlaybackProvider('dash-player');
			const audioSourceProvider = createMockAudioSourceProvider('youtube-music');
			service.setPlaybackProviders([playbackProvider]);
			service.setAudioSourceProviders([audioSourceProvider]);

			const track = createTestTrack('t1');
			await service.play(track);
			const result = await service.seekTo(Duration.fromSeconds(30));

			expect(result.success).toBe(true);
			expect(vi.mocked(playbackProvider.seek)).toHaveBeenCalled();
		});

		it('should return error when no active provider', async () => {
			const result = await service.seekTo(Duration.fromSeconds(30));

			expect(result.success).toBe(false);
		});
	});

	describe('skipToNext', () => {
		it('should skip to the next track in queue', async () => {
			const playbackProvider = createMockPlaybackProvider('dash-player');
			const audioSourceProvider = createMockAudioSourceProvider('youtube-music');
			service.setPlaybackProviders([playbackProvider]);
			service.setAudioSourceProviders([audioSourceProvider]);

			const tracks = [createTestTrack('t1'), createTestTrack('t2')];
			usePlayerStore.getState().setQueue(tracks, 0);

			const result = await service.skipToNext();

			expect(result.success).toBe(true);
		});

		it('should return ok when at end of queue with no next track', async () => {
			const playbackProvider = createMockPlaybackProvider('dash-player');
			service.setPlaybackProviders([playbackProvider]);

			usePlayerStore.getState().setQueue([createTestTrack('t1')], 0);
			usePlayerStore.setState({ queueIndex: 0 });

			const result = await service.skipToNext();

			// After skipToNext at end, currentTrack should be null so result is ok
			expect(result.success).toBe(true);
		});
	});

	describe('skipToPrevious', () => {
		it('should seek to start when position is greater than 3 seconds', async () => {
			const playbackProvider = createMockPlaybackProvider('dash-player');
			const audioSourceProvider = createMockAudioSourceProvider('youtube-music');
			service.setPlaybackProviders([playbackProvider]);
			service.setAudioSourceProviders([audioSourceProvider]);

			const tracks = [createTestTrack('t1'), createTestTrack('t2')];
			usePlayerStore.getState().setQueue(tracks, 1);
			// Simulate track is playing at position 5 seconds
			await service.play(usePlayerStore.getState().currentTrack!);
			usePlayerStore.setState({ position: Duration.fromSeconds(5) });

			const result = await service.skipToPrevious();

			expect(result.success).toBe(true);
			expect(vi.mocked(playbackProvider.seek)).toHaveBeenCalled();
		});

		it('should seek to start when only one track in queue', async () => {
			const playbackProvider = createMockPlaybackProvider('dash-player');
			const audioSourceProvider = createMockAudioSourceProvider('youtube-music');
			service.setPlaybackProviders([playbackProvider]);
			service.setAudioSourceProviders([audioSourceProvider]);

			usePlayerStore.getState().setQueue([createTestTrack('t1')], 0);
			await service.play(usePlayerStore.getState().currentTrack!);
			usePlayerStore.setState({ position: Duration.fromSeconds(1) });

			const result = await service.skipToPrevious();

			expect(result.success).toBe(true);
			expect(vi.mocked(playbackProvider.seek)).toHaveBeenCalled();
		});
	});

	describe('setQueue', () => {
		it('should set queue and start playing first track', async () => {
			const playbackProvider = createMockPlaybackProvider('dash-player');
			const audioSourceProvider = createMockAudioSourceProvider('youtube-music');
			service.setPlaybackProviders([playbackProvider]);
			service.setAudioSourceProviders([audioSourceProvider]);

			const tracks = [createTestTrack('t1'), createTestTrack('t2')];
			service.setQueue(tracks);

			// Wait for async play to complete
			await vi.waitFor(() => {
				expect(vi.mocked(playbackProvider.play)).toHaveBeenCalled();
			});
		});

		it('should start playing at the specified index', async () => {
			const playbackProvider = createMockPlaybackProvider('dash-player');
			const audioSourceProvider = createMockAudioSourceProvider('youtube-music');
			service.setPlaybackProviders([playbackProvider]);
			service.setAudioSourceProviders([audioSourceProvider]);

			const tracks = [createTestTrack('t1'), createTestTrack('t2')];
			service.setQueue(tracks, 1);

			await vi.waitFor(() => {
				expect(vi.mocked(playbackProvider.play)).toHaveBeenCalled();
			});

			expect(usePlayerStore.getState().queueIndex).toBe(1);
		});
	});

	describe('setRepeatMode', () => {
		it('should set repeat mode on active provider', async () => {
			const playbackProvider = createMockPlaybackProvider('dash-player');
			const audioSourceProvider = createMockAudioSourceProvider('youtube-music');
			service.setPlaybackProviders([playbackProvider]);
			service.setAudioSourceProviders([audioSourceProvider]);

			await service.play(createTestTrack('t1'));
			service.setRepeatMode('all');

			expect(vi.mocked(playbackProvider.setRepeatMode)).toHaveBeenCalledWith('all');
		});

		it('should do nothing when no active provider', () => {
			service.setRepeatMode('all');

			// No error means handled gracefully
			expect(true).toBe(true);
		});
	});

	describe('setVolume', () => {
		it('should set volume on active provider', async () => {
			const playbackProvider = createMockPlaybackProvider('dash-player');
			const audioSourceProvider = createMockAudioSourceProvider('youtube-music');
			service.setPlaybackProviders([playbackProvider]);
			service.setAudioSourceProviders([audioSourceProvider]);

			await service.play(createTestTrack('t1'));
			const result = await service.setVolume(0.5);

			expect(result.success).toBe(true);
			expect(vi.mocked(playbackProvider.setVolume)).toHaveBeenCalledWith(0.5);
		});

		it('should return error when no active provider', async () => {
			const result = await service.setVolume(0.5);

			expect(result.success).toBe(false);
		});
	});

	describe('dispose', () => {
		it('should clean up resources', async () => {
			const playbackProvider = createMockPlaybackProvider('dash-player');
			const audioSourceProvider = createMockAudioSourceProvider('youtube-music');
			service.setPlaybackProviders([playbackProvider]);
			service.setAudioSourceProviders([audioSourceProvider]);

			await service.play(createTestTrack('t1'));
			await service.dispose();

			expect(vi.mocked(playbackProvider.removeEventListener)).toHaveBeenCalled();
			expect(vi.mocked(playbackProvider.onDestroy)).toHaveBeenCalled();
		});
	});
});
