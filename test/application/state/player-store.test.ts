import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayerStore } from '@application/state/player-store';
import { Duration } from '@domain/value-objects/duration';
import { TrackId } from '@domain/value-objects/track-id';
import { createStreamingSource } from '@domain/value-objects/audio-source';
import type { Track } from '@domain/entities/track';

const createTestTrack = (id: string): Track => ({
	id: TrackId.create('youtube-music', id),
	title: `Track ${id}`,
	artists: [{ id: `artist-${id}`, name: `Artist ${id}` }],
	duration: Duration.fromSeconds(180),
	source: createStreamingSource('youtube-music', id),
	metadata: {},
	playCount: 0,
	isFavorite: false,
});

describe('PlayerStore', () => {
	beforeEach(() => {
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
	});

	describe('Initial State', () => {
		it('should have idle status', () => {
			const state = usePlayerStore.getState();
			expect(state.status).toBe('idle');
		});

		it('should have null current track', () => {
			const state = usePlayerStore.getState();
			expect(state.currentTrack).toBeNull();
		});

		it('should have zero position and duration', () => {
			const state = usePlayerStore.getState();
			expect(state.position.isZero()).toBe(true);
			expect(state.duration.isZero()).toBe(true);
		});

		it('should have default volume of 1', () => {
			const state = usePlayerStore.getState();
			expect(state.volume).toBe(1);
		});

		it('should have repeat mode off', () => {
			const state = usePlayerStore.getState();
			expect(state.repeatMode).toBe('off');
		});

		it('should not be shuffled', () => {
			const state = usePlayerStore.getState();
			expect(state.isShuffled).toBe(false);
		});
	});

	describe('play', () => {
		it('should set current track and status to loading', () => {
			const track = createTestTrack('1');
			usePlayerStore.getState().play(track);

			const state = usePlayerStore.getState();
			expect(state.currentTrack).toEqual(track);
			expect(state.status).toBe('loading');
		});

		it('should reset position and duration', () => {
			usePlayerStore.setState({
				position: Duration.fromSeconds(60),
				duration: Duration.fromSeconds(180),
			});

			const track = createTestTrack('1');
			usePlayerStore.getState().play(track);

			const state = usePlayerStore.getState();
			expect(state.position.isZero()).toBe(true);
			expect(state.duration.isZero()).toBe(true);
		});

		it('should clear any error', () => {
			usePlayerStore.setState({ error: 'Previous error' });

			const track = createTestTrack('1');
			usePlayerStore.getState().play(track);

			const state = usePlayerStore.getState();
			expect(state.error).toBeNull();
		});
	});

	describe('pause', () => {
		it('should set status to paused when playing', () => {
			usePlayerStore.setState({ status: 'playing' });
			usePlayerStore.getState().pause();

			expect(usePlayerStore.getState().status).toBe('paused');
		});

		it('should not change status when not playing', () => {
			usePlayerStore.setState({ status: 'loading' });
			usePlayerStore.getState().pause();

			expect(usePlayerStore.getState().status).toBe('loading');
		});
	});

	describe('resume', () => {
		it('should set status to playing when paused', () => {
			usePlayerStore.setState({ status: 'paused' });
			usePlayerStore.getState().resume();

			expect(usePlayerStore.getState().status).toBe('playing');
		});

		it('should not change status when not paused', () => {
			usePlayerStore.setState({ status: 'loading' });
			usePlayerStore.getState().resume();

			expect(usePlayerStore.getState().status).toBe('loading');
		});
	});

	describe('stop', () => {
		it('should reset to idle state', () => {
			usePlayerStore.setState({
				status: 'playing',
				currentTrack: createTestTrack('1'),
				position: Duration.fromSeconds(60),
				duration: Duration.fromSeconds(180),
				error: 'Some error',
			});

			usePlayerStore.getState().stop();

			const state = usePlayerStore.getState();
			expect(state.status).toBe('idle');
			expect(state.currentTrack).toBeNull();
			expect(state.position.isZero()).toBe(true);
			expect(state.duration.isZero()).toBe(true);
			expect(state.error).toBeNull();
		});
	});

	describe('seekTo', () => {
		it('should set position', () => {
			const newPosition = Duration.fromSeconds(90);
			usePlayerStore.getState().seekTo(newPosition);

			expect(usePlayerStore.getState().position.totalSeconds).toBe(90);
		});
	});

	describe('setQueue', () => {
		it('should set queue and start playing first track', () => {
			const tracks = [createTestTrack('1'), createTestTrack('2'), createTestTrack('3')];
			usePlayerStore.getState().setQueue(tracks);

			const state = usePlayerStore.getState();
			expect(state.queue).toHaveLength(3);
			expect(state.queueIndex).toBe(0);
			expect(state.currentTrack?.title).toBe('Track 1');
			expect(state.status).toBe('loading');
		});

		it('should start playing at specified index', () => {
			const tracks = [createTestTrack('1'), createTestTrack('2'), createTestTrack('3')];
			usePlayerStore.getState().setQueue(tracks, 1);

			const state = usePlayerStore.getState();
			expect(state.queueIndex).toBe(1);
			expect(state.currentTrack?.title).toBe('Track 2');
		});

		it('should store original queue order', () => {
			const tracks = [createTestTrack('1'), createTestTrack('2'), createTestTrack('3')];
			usePlayerStore.getState().setQueue(tracks);

			const state = usePlayerStore.getState();
			expect(state.originalQueue).toHaveLength(3);
			expect(state.originalQueue[0].title).toBe('Track 1');
		});

		it('should handle empty queue', () => {
			usePlayerStore.getState().setQueue([]);

			const state = usePlayerStore.getState();
			expect(state.queue).toHaveLength(0);
			expect(state.currentTrack).toBeNull();
			expect(state.status).toBe('idle');
		});
	});

	describe('skipToNext', () => {
		beforeEach(() => {
			const tracks = [createTestTrack('1'), createTestTrack('2'), createTestTrack('3')];
			usePlayerStore.getState().setQueue(tracks);
		});

		it('should skip to next track', () => {
			usePlayerStore.getState().skipToNext();

			const state = usePlayerStore.getState();
			expect(state.queueIndex).toBe(1);
			expect(state.currentTrack?.title).toBe('Track 2');
		});

		it('should stop playback at end of queue with repeat off', () => {
			usePlayerStore.setState({ queueIndex: 2 });
			usePlayerStore.getState().skipToNext();

			const state = usePlayerStore.getState();
			expect(state.status).toBe('idle');
			expect(state.currentTrack).toBeNull();
		});

		it('should loop to beginning with repeat all', () => {
			usePlayerStore.setState({ queueIndex: 2, repeatMode: 'all' });
			usePlayerStore.getState().skipToNext();

			const state = usePlayerStore.getState();
			expect(state.queueIndex).toBe(0);
			expect(state.currentTrack?.title).toBe('Track 1');
		});

		it('should reset position with repeat one', () => {
			usePlayerStore.setState({
				queueIndex: 1,
				repeatMode: 'one',
				currentTrack: createTestTrack('2'),
				position: Duration.fromSeconds(60),
			});
			usePlayerStore.getState().skipToNext();

			const state = usePlayerStore.getState();
			expect(state.position.isZero()).toBe(true);
			expect(state.status).toBe('loading');
		});
	});

	describe('skipToPrevious', () => {
		beforeEach(() => {
			const tracks = [createTestTrack('1'), createTestTrack('2'), createTestTrack('3')];
			usePlayerStore.getState().setQueue(tracks, 1);
		});

		it('should skip to previous track when position < 3 seconds', () => {
			usePlayerStore.setState({ position: Duration.fromSeconds(2) });
			usePlayerStore.getState().skipToPrevious();

			const state = usePlayerStore.getState();
			expect(state.queueIndex).toBe(0);
			expect(state.currentTrack?.title).toBe('Track 1');
		});

		it('should restart current track when position >= 3 seconds', () => {
			usePlayerStore.setState({
				position: Duration.fromSeconds(5),
				currentTrack: createTestTrack('2'),
			});
			usePlayerStore.getState().skipToPrevious();

			const state = usePlayerStore.getState();
			expect(state.queueIndex).toBe(1);
			expect(state.position.isZero()).toBe(true);
		});

		it('should stay at first track when already at beginning', () => {
			usePlayerStore.setState({
				queueIndex: 0,
				position: Duration.fromSeconds(1),
			});
			usePlayerStore.getState().skipToPrevious();

			const state = usePlayerStore.getState();
			expect(state.queueIndex).toBe(0);
		});
	});

	describe('toggleShuffle', () => {
		beforeEach(() => {
			const tracks = [createTestTrack('1'), createTestTrack('2'), createTestTrack('3')];
			usePlayerStore.getState().setQueue(tracks, 0);
		});

		it('should enable shuffle', () => {
			usePlayerStore.getState().toggleShuffle();

			const state = usePlayerStore.getState();
			expect(state.isShuffled).toBe(true);
		});

		it('should disable shuffle', () => {
			usePlayerStore.setState({ isShuffled: true });
			usePlayerStore.getState().toggleShuffle();

			const state = usePlayerStore.getState();
			expect(state.isShuffled).toBe(false);
		});

		it('should restore original order when disabling shuffle', () => {
			usePlayerStore.getState().toggleShuffle();
			usePlayerStore.getState().toggleShuffle();

			const state = usePlayerStore.getState();
			expect(state.queue[0].title).toBe('Track 1');
			expect(state.queue[1].title).toBe('Track 2');
			expect(state.queue[2].title).toBe('Track 3');
		});
	});

	describe('cycleRepeatMode', () => {
		it('should cycle from off to one', () => {
			usePlayerStore.getState().cycleRepeatMode();
			expect(usePlayerStore.getState().repeatMode).toBe('one');
		});

		it('should cycle from one to all', () => {
			usePlayerStore.setState({ repeatMode: 'one' });
			usePlayerStore.getState().cycleRepeatMode();
			expect(usePlayerStore.getState().repeatMode).toBe('all');
		});

		it('should cycle from all to off', () => {
			usePlayerStore.setState({ repeatMode: 'all' });
			usePlayerStore.getState().cycleRepeatMode();
			expect(usePlayerStore.getState().repeatMode).toBe('off');
		});
	});

	describe('setVolume', () => {
		it('should set volume', () => {
			usePlayerStore.getState().setVolume(0.5);
			expect(usePlayerStore.getState().volume).toBe(0.5);
		});

		it('should clamp volume to 0-1 range', () => {
			usePlayerStore.getState().setVolume(-0.5);
			expect(usePlayerStore.getState().volume).toBe(0);

			usePlayerStore.getState().setVolume(1.5);
			expect(usePlayerStore.getState().volume).toBe(1);
		});

		it('should set isMuted to true when volume is 0', () => {
			usePlayerStore.getState().setVolume(0);
			expect(usePlayerStore.getState().isMuted).toBe(true);
		});

		it('should set isMuted to false when volume is not 0', () => {
			usePlayerStore.setState({ isMuted: true });
			usePlayerStore.getState().setVolume(0.5);
			expect(usePlayerStore.getState().isMuted).toBe(false);
		});
	});

	describe('toggleMute', () => {
		it('should toggle mute on', () => {
			usePlayerStore.getState().toggleMute();
			expect(usePlayerStore.getState().isMuted).toBe(true);
		});

		it('should toggle mute off', () => {
			usePlayerStore.setState({ isMuted: true });
			usePlayerStore.getState().toggleMute();
			expect(usePlayerStore.getState().isMuted).toBe(false);
		});
	});

	describe('Internal Setters', () => {
		describe('_setStatus', () => {
			it('should set status', () => {
				usePlayerStore.getState()._setStatus('playing');
				expect(usePlayerStore.getState().status).toBe('playing');
			});
		});

		describe('_setPosition', () => {
			it('should set position', () => {
				usePlayerStore.getState()._setPosition(Duration.fromSeconds(45));
				expect(usePlayerStore.getState().position.totalSeconds).toBe(45);
			});
		});

		describe('_setDuration', () => {
			it('should set duration', () => {
				usePlayerStore.getState()._setDuration(Duration.fromSeconds(240));
				expect(usePlayerStore.getState().duration.totalSeconds).toBe(240);
			});
		});

		describe('_setError', () => {
			it('should set error and status to error', () => {
				usePlayerStore.getState()._setError('Playback failed');

				const state = usePlayerStore.getState();
				expect(state.error).toBe('Playback failed');
				expect(state.status).toBe('error');
			});

			it('should clear error when null is passed', () => {
				usePlayerStore.setState({ error: 'Previous error', status: 'error' });
				usePlayerStore.getState()._setError(null);

				const state = usePlayerStore.getState();
				expect(state.error).toBeNull();
				expect(state.status).toBe('error');
			});
		});

		describe('_setCurrentTrack', () => {
			it('should set current track', () => {
				const track = createTestTrack('test');
				usePlayerStore.getState()._setCurrentTrack(track);
				expect(usePlayerStore.getState().currentTrack).toEqual(track);
			});

			it('should clear current track when null', () => {
				usePlayerStore.setState({ currentTrack: createTestTrack('test') });
				usePlayerStore.getState()._setCurrentTrack(null);
				expect(usePlayerStore.getState().currentTrack).toBeNull();
			});
		});
	});
});
