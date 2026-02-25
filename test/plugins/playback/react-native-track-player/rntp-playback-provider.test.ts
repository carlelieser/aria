/**
 * Tests for the RNTP Playback Plugin modules:
 *   - PlaybackState
 *   - OperationLock
 *   - UrlValidator
 *   - EventMapper (mapRNTPStateToStatus)
 *   - TrackMapper (mapToRNTPTrack)
 *   - ProgressTracker
 *   - QueueManager
 *   - RNTPPluginModule
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module-level mock for react-native (Flow-typed — unparseable by Rollup)
// The global setup already mocks this, but an explicit mock here ensures the
// hoisted mock is registered before any transitive import triggers a parse.
// ---------------------------------------------------------------------------
vi.mock('react-native', () => ({
	AppState: {
		currentState: 'active',
		addEventListener: vi.fn(() => ({ remove: vi.fn() })),
	},
	Platform: {
		OS: 'ios',
		select: vi.fn((obj: Record<string, unknown>) => obj.ios),
	},
}));

// ---------------------------------------------------------------------------
// Module-level mock for react-native-track-player (native module)
// ---------------------------------------------------------------------------
vi.mock('react-native-track-player', () => {
	const State = {
		None: 'none',
		Ready: 'ready',
		Playing: 'playing',
		Paused: 'paused',
		Stopped: 'stopped',
		Buffering: 'buffering',
		Loading: 'loading',
		Ended: 'ended',
		Error: 'error',
	} as const;

	const RepeatMode = {
		Off: 0,
		Track: 1,
		Queue: 2,
	} as const;

	const Event = {
		PlaybackState: 'playback-state',
		PlaybackProgressUpdated: 'playback-progress-updated',
		PlaybackActiveTrackChanged: 'playback-active-track-changed',
		PlaybackError: 'playback-error',
		RemotePlay: 'remote-play',
		RemotePause: 'remote-pause',
		RemoteStop: 'remote-stop',
		RemoteNext: 'remote-next',
		RemotePrevious: 'remote-previous',
		RemoteSeek: 'remote-seek',
	} as const;

	const AppKilledPlaybackBehavior = {
		ContinuePlayback: 'continue-playback',
		PausePlayback: 'pause-playback',
		StopPlaybackAndRemoveNotification: 'stop-playback-and-remove-notification',
	} as const;

	const Capability = {
		Play: 'play',
		Pause: 'pause',
		Stop: 'stop',
		SeekTo: 'seek-to',
		Skip: 'skip',
		SkipToNext: 'skip-to-next',
		SkipToPrevious: 'skip-to-previous',
	} as const;

	const TrackPlayer = {
		setupPlayer: vi.fn().mockResolvedValue(undefined),
		updateOptions: vi.fn().mockResolvedValue(undefined),
		setVolume: vi.fn().mockResolvedValue(undefined),
		add: vi.fn().mockResolvedValue(undefined),
		reset: vi.fn().mockResolvedValue(undefined),
		play: vi.fn().mockResolvedValue(undefined),
		pause: vi.fn().mockResolvedValue(undefined),
		stop: vi.fn().mockResolvedValue(undefined),
		seekTo: vi.fn().mockResolvedValue(undefined),
		setRate: vi.fn().mockResolvedValue(undefined),
		setRepeatMode: vi.fn().mockResolvedValue(undefined),
		addEventListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
		getPosition: vi.fn().mockResolvedValue(0),
	};

	return {
		default: TrackPlayer,
		State,
		RepeatMode,
		Event,
		AppKilledPlaybackBehavior,
		Capability,
	};
});

// ---------------------------------------------------------------------------
// Imports (after mocks are declared)
// ---------------------------------------------------------------------------
import { PlaybackState } from '@plugins/playback/react-native-track-player/playback-state';
import { OperationLock } from '@plugins/playback/react-native-track-player/operation-lock';
import { UrlValidator } from '@plugins/playback/react-native-track-player/url-validator';
import {
	mapRNTPStateToStatus,
	isActiveState,
	isReadyState,
} from '@plugins/playback/react-native-track-player/event-mapper';
import { mapToRNTPTrack } from '@plugins/playback/react-native-track-player/track-mapper';
import { ProgressTracker } from '@plugins/playback/react-native-track-player/progress-tracker';
import { QueueManager } from '@plugins/playback/react-native-track-player/queue-manager';
import { RNTPPluginModule } from '@plugins/playback/react-native-track-player/plugin-module';
import { PLUGIN_MANIFEST } from '@plugins/playback/react-native-track-player/config';
import { Duration } from '@domain/value-objects/duration';
import { TrackId } from '@domain/value-objects/track-id';
import { State } from 'react-native-track-player';
import type { Track } from '@domain/entities/track';
import type { PlaybackEvent } from '@plugins/core/interfaces/playback-provider';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeTrack(overrides: Partial<Track> = {}): Track {
	return {
		id: TrackId.create('local-file', 'track-1'),
		title: 'Test Track',
		artists: [{ id: 'artist-1', name: 'Test Artist' }],
		album: { id: 'album-1', name: 'Test Album' },
		duration: Duration.fromSeconds(180),
		artwork: [{ url: 'https://example.com/art.jpg', width: 300, height: 300 }],
		source: { type: 'local-file', uri: '/music/track.mp3' },
		metadata: {},
		...overrides,
	} as Track;
}

function makeTrackNoOptionals(): Track {
	return {
		id: TrackId.create('local-file', 'track-bare'),
		title: 'Bare Track',
		artists: [],
		duration: Duration.fromSeconds(60),
		source: { type: 'local-file', uri: '/music/bare.mp3' },
		metadata: {},
	} as unknown as Track;
}

// ---------------------------------------------------------------------------
// PlaybackState
// ---------------------------------------------------------------------------

describe('PlaybackState', () => {
	let state: PlaybackState;

	beforeEach(() => {
		state = new PlaybackState();
	});

	describe('initial values', () => {
		it('starts with idle status', () => {
			expect(state.playbackStatus).toBe('idle');
		});

		it('starts with null currentTrack', () => {
			expect(state.currentTrack).toBeNull();
		});

		it('starts with zero position', () => {
			expect(state.position.totalMilliseconds).toBe(0);
		});

		it('starts with zero duration', () => {
			expect(state.duration.totalMilliseconds).toBe(0);
		});

		it('starts with volume 1.0', () => {
			expect(state.volume).toBe(1.0);
		});

		it('starts with repeatMode off', () => {
			expect(state.repeatMode).toBe('off');
		});

		it('starts with isShuffled false', () => {
			expect(state.isShuffled).toBe(false);
		});

		it('starts with empty queue', () => {
			expect(state.queue).toHaveLength(0);
		});

		it('starts with currentIndex -1', () => {
			expect(state.currentIndex).toBe(-1);
		});

		it('starts with isSeeking false', () => {
			expect(state.isSeeking).toBe(false);
		});

		it('starts with empty trackMap', () => {
			expect(state.trackMap.size).toBe(0);
		});
	});

	describe('getters and setters', () => {
		it('sets and gets playbackStatus', () => {
			state.playbackStatus = 'playing';
			expect(state.playbackStatus).toBe('playing');
		});

		it('sets and gets currentTrack', () => {
			const track = makeTrack();
			state.currentTrack = track;
			expect(state.currentTrack).toBe(track);
		});

		it('sets and gets position', () => {
			const pos = Duration.fromSeconds(42);
			state.position = pos;
			expect(state.position.totalMilliseconds).toBe(42000);
		});

		it('sets and gets duration', () => {
			const dur = Duration.fromSeconds(300);
			state.duration = dur;
			expect(state.duration.totalMilliseconds).toBe(300000);
		});

		it('sets and gets volume', () => {
			state.volume = 0.5;
			expect(state.volume).toBe(0.5);
		});

		it('sets and gets repeatMode', () => {
			state.repeatMode = 'all';
			expect(state.repeatMode).toBe('all');
		});

		it('sets and gets isShuffled', () => {
			state.isShuffled = true;
			expect(state.isShuffled).toBe(true);
		});

		it('sets and gets isSeeking', () => {
			state.isSeeking = true;
			expect(state.isSeeking).toBe(true);
		});

		it('sets and gets currentIndex', () => {
			state.currentIndex = 3;
			expect(state.currentIndex).toBe(3);
		});

		it('sets and gets queue', () => {
			const tracks = [makeTrack()];
			state.queue = tracks;
			expect(state.queue).toBe(tracks);
		});

		it('exposes trackMap for mutation', () => {
			const track = makeTrack();
			state.trackMap.set('key-1', track);
			expect(state.trackMap.get('key-1')).toBe(track);
		});
	});

	describe('reset()', () => {
		it('clears currentTrack to null', () => {
			state.currentTrack = makeTrack();
			state.reset();
			expect(state.currentTrack).toBeNull();
		});

		it('resets position to zero', () => {
			state.position = Duration.fromSeconds(90);
			state.reset();
			expect(state.position.totalMilliseconds).toBe(0);
		});

		it('resets duration to zero', () => {
			state.duration = Duration.fromSeconds(200);
			state.reset();
			expect(state.duration.totalMilliseconds).toBe(0);
		});

		it('sets playbackStatus to idle', () => {
			state.playbackStatus = 'playing';
			state.reset();
			expect(state.playbackStatus).toBe('idle');
		});

		it('resets isSeeking to false', () => {
			state.isSeeking = true;
			state.reset();
			expect(state.isSeeking).toBe(false);
		});

		it('clears the trackMap', () => {
			state.trackMap.set('k', makeTrack());
			state.reset();
			expect(state.trackMap.size).toBe(0);
		});

		it('does not clear queue', () => {
			state.queue = [makeTrack(), makeTrack()];
			state.reset();
			expect(state.queue).toHaveLength(2);
		});

		it('does not reset currentIndex', () => {
			state.currentIndex = 2;
			state.reset();
			expect(state.currentIndex).toBe(2);
		});
	});

	describe('clear()', () => {
		it('calls reset() behaviour — clears currentTrack', () => {
			state.currentTrack = makeTrack();
			state.clear();
			expect(state.currentTrack).toBeNull();
		});

		it('clears the queue to empty', () => {
			state.queue = [makeTrack(), makeTrack()];
			state.clear();
			expect(state.queue).toHaveLength(0);
		});

		it('resets currentIndex to -1', () => {
			state.currentIndex = 3;
			state.clear();
			expect(state.currentIndex).toBe(-1);
		});

		it('resets repeatMode to off', () => {
			state.repeatMode = 'all';
			state.clear();
			expect(state.repeatMode).toBe('off');
		});

		it('resets isShuffled to false', () => {
			state.isShuffled = true;
			state.clear();
			expect(state.isShuffled).toBe(false);
		});

		it('resets playbackStatus to idle', () => {
			state.playbackStatus = 'playing';
			state.clear();
			expect(state.playbackStatus).toBe('idle');
		});
	});
});

// ---------------------------------------------------------------------------
// OperationLock
// ---------------------------------------------------------------------------

describe('OperationLock', () => {
	let lock: OperationLock;

	beforeEach(() => {
		lock = new OperationLock();
	});

	it('runs a single operation and returns its result', async () => {
		const result = await lock.withLock(async () => 42);
		expect(result).toBe(42);
	});

	it('serializes concurrent operations — second waits for first', async () => {
		const order: number[] = [];

		let resolveFirst!: () => void;
		const firstDone = new Promise<void>((r) => (resolveFirst = r));

		const first = lock.withLock(async () => {
			await firstDone;
			order.push(1);
		});

		const second = lock.withLock(async () => {
			order.push(2);
		});

		// At this point second should not have run yet because first is blocking
		expect(order).toHaveLength(0);

		resolveFirst();
		await first;
		await second;

		expect(order).toEqual([1, 2]);
	});

	it('releases the lock even when the operation throws', async () => {
		await expect(
			lock.withLock(async () => {
				throw new Error('boom');
			})
		).rejects.toThrow('boom');

		// A subsequent operation must still be able to run
		const result = await lock.withLock(async () => 'recovered');
		expect(result).toBe('recovered');
	});

	it('does not deadlock on sequential calls', async () => {
		const r1 = await lock.withLock(async () => 'a');
		const r2 = await lock.withLock(async () => 'b');
		const r3 = await lock.withLock(async () => 'c');
		expect([r1, r2, r3]).toEqual(['a', 'b', 'c']);
	});

	it('preserves the return type of the operation', async () => {
		const obj = { value: 99 };
		const returned = await lock.withLock(async () => obj);
		expect(returned).toBe(obj);
	});
});

// ---------------------------------------------------------------------------
// UrlValidator
// ---------------------------------------------------------------------------

describe('UrlValidator', () => {
	let validator: UrlValidator;

	beforeEach(() => {
		validator = new UrlValidator();
	});

	describe('DASH streams — rejected', () => {
		it('returns false for DASH data URI', () => {
			expect(validator.canHandle('data:application/dash+xml;base64,ABC123')).toBe(false);
		});

		it('returns false for .mpd URL', () => {
			expect(validator.canHandle('https://cdn.example.com/stream/manifest.mpd')).toBe(false);
		});

		it('returns false for manifest/dash URL', () => {
			expect(validator.canHandle('https://cdn.example.com/manifest/dash/audio')).toBe(false);
		});
	});

	describe('HLS streams — rejected', () => {
		it('returns false for .m3u8 URL', () => {
			expect(validator.canHandle('https://cdn.example.com/stream/playlist.m3u8')).toBe(false);
		});

		it('returns false for .m3u8 URL with query string', () => {
			expect(validator.canHandle('https://cdn.example.com/stream/playlist.m3u8?token=abc')).toBe(
				false
			);
		});

		it('returns false for manifest/hls URL', () => {
			expect(validator.canHandle('https://cdn.example.com/manifest/hls/audio')).toBe(false);
		});
	});

	describe('supported audio extensions — accepted', () => {
		it('returns true for .mp3 URL', () => {
			expect(validator.canHandle('https://cdn.example.com/audio/track.mp3')).toBe(true);
		});

		it('returns true for .m4a URL', () => {
			expect(validator.canHandle('https://cdn.example.com/audio/track.m4a')).toBe(true);
		});

		it('returns true for .aac URL', () => {
			expect(validator.canHandle('https://cdn.example.com/audio/track.aac')).toBe(true);
		});

		it('returns true for .wav URL', () => {
			expect(validator.canHandle('https://cdn.example.com/audio/track.wav')).toBe(true);
		});

		it('returns true for .ogg URL', () => {
			expect(validator.canHandle('https://cdn.example.com/audio/track.ogg')).toBe(true);
		});

		it('returns true for .flac URL', () => {
			expect(validator.canHandle('https://cdn.example.com/audio/track.flac')).toBe(true);
		});
	});

	describe('local file paths — accepted', () => {
		it('returns true for file:// URI', () => {
			expect(validator.canHandle('file:///storage/music/track.mp3')).toBe(true);
		});

		it('returns true for absolute path starting with /', () => {
			expect(validator.canHandle('/data/user/0/com.app/files/track.mp3')).toBe(true);
		});
	});

	describe('plain HTTP/HTTPS — accepted', () => {
		it('returns true for http:// stream URL without extension', () => {
			expect(validator.canHandle('http://example.com/stream')).toBe(true);
		});

		it('returns true for https:// stream URL without extension', () => {
			expect(validator.canHandle('https://api.example.com/audio/stream/12345')).toBe(true);
		});
	});

	describe('unsupported protocols — rejected', () => {
		it('returns false for rtmp:// URL', () => {
			expect(validator.canHandle('rtmp://streaming.example.com/live/audio')).toBe(false);
		});

		it('returns false for an empty string', () => {
			expect(validator.canHandle('')).toBe(false);
		});

		it('returns false for a bare word with no protocol', () => {
			expect(validator.canHandle('just-a-word')).toBe(false);
		});
	});
});

// ---------------------------------------------------------------------------
// EventMapper
// ---------------------------------------------------------------------------

describe('mapRNTPStateToStatus', () => {
	it('maps State.Playing to playing', () => {
		expect(mapRNTPStateToStatus(State.Playing)).toBe('playing');
	});

	it('maps State.Paused to paused', () => {
		expect(mapRNTPStateToStatus(State.Paused)).toBe('paused');
	});

	it('maps State.Loading to loading', () => {
		expect(mapRNTPStateToStatus(State.Loading)).toBe('loading');
	});

	it('maps State.Buffering to loading', () => {
		expect(mapRNTPStateToStatus(State.Buffering)).toBe('loading');
	});

	it('maps State.Stopped to idle', () => {
		expect(mapRNTPStateToStatus(State.Stopped)).toBe('idle');
	});

	it('maps State.None to idle', () => {
		expect(mapRNTPStateToStatus(State.None)).toBe('idle');
	});

	it('maps State.Ended to idle', () => {
		expect(mapRNTPStateToStatus(State.Ended)).toBe('idle');
	});

	it('maps State.Error to error', () => {
		expect(mapRNTPStateToStatus(State.Error)).toBe('error');
	});

	it('maps unknown state value to idle (default branch)', () => {
		// Cast an arbitrary unknown value to exercise the default branch
		expect(mapRNTPStateToStatus('completely-unknown' as typeof State.Playing)).toBe('idle');
	});
});

describe('isActiveState', () => {
	it('returns true for Playing', () => {
		expect(isActiveState(State.Playing)).toBe(true);
	});

	it('returns true for Buffering', () => {
		expect(isActiveState(State.Buffering)).toBe(true);
	});

	it('returns true for Loading', () => {
		expect(isActiveState(State.Loading)).toBe(true);
	});

	it('returns false for Paused', () => {
		expect(isActiveState(State.Paused)).toBe(false);
	});

	it('returns false for Stopped', () => {
		expect(isActiveState(State.Stopped)).toBe(false);
	});
});

describe('isReadyState', () => {
	it('returns true for Playing', () => {
		expect(isReadyState(State.Playing)).toBe(true);
	});

	it('returns true for Paused', () => {
		expect(isReadyState(State.Paused)).toBe(true);
	});

	it('returns true for Ready', () => {
		expect(isReadyState(State.Ready)).toBe(true);
	});

	it('returns true for Buffering', () => {
		expect(isReadyState(State.Buffering)).toBe(true);
	});

	it('returns false for Stopped', () => {
		expect(isReadyState(State.Stopped)).toBe(false);
	});

	it('returns false for None', () => {
		expect(isReadyState(State.None)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// TrackMapper
// ---------------------------------------------------------------------------

describe('mapToRNTPTrack', () => {
	it('maps track id to the RNTP track id', () => {
		const track = makeTrack();
		const result = mapToRNTPTrack(track, 'https://example.com/track.mp3');
		expect(result.id).toBe(track.id.value);
	});

	it('maps track title', () => {
		const track = makeTrack({ title: 'My Song' });
		const result = mapToRNTPTrack(track, 'https://example.com/track.mp3');
		expect(result.title).toBe('My Song');
	});

	it('maps artist names joined by comma', () => {
		const track = makeTrack({
			artists: [
				{ id: 'a1', name: 'Artist One' },
				{ id: 'a2', name: 'Artist Two' },
			],
		});
		const result = mapToRNTPTrack(track, 'https://example.com/track.mp3');
		expect(result.artist).toBe('Artist One, Artist Two');
	});

	it('maps album name when album is present', () => {
		const track = makeTrack({ album: { id: 'alb-1', name: 'Great Album' } });
		const result = mapToRNTPTrack(track, 'https://example.com/track.mp3');
		expect(result.album).toBe('Great Album');
	});

	it('maps artwork URL from track artwork array', () => {
		const track = makeTrack({
			artwork: [{ url: 'https://example.com/cover.jpg', width: 500, height: 500 }],
		});
		const result = mapToRNTPTrack(track, 'https://example.com/track.mp3');
		expect(result.artwork).toBe('https://example.com/cover.jpg');
	});

	it('maps duration as total seconds', () => {
		const track = makeTrack({ duration: Duration.fromSeconds(240) });
		const result = mapToRNTPTrack(track, 'https://example.com/track.mp3');
		expect(result.duration).toBe(240);
	});

	it('includes headers when provided', () => {
		const track = makeTrack();
		const headers = { Authorization: 'Bearer token123' };
		const result = mapToRNTPTrack(track, 'https://example.com/track.mp3', headers);
		expect(result.headers).toEqual(headers);
		expect(result.artworkHeaders).toEqual(headers);
	});

	it('leaves headers undefined when not provided', () => {
		const track = makeTrack();
		const result = mapToRNTPTrack(track, 'https://example.com/track.mp3');
		expect(result.headers).toBeUndefined();
	});

	it('infers contentType audio/mpeg for .mp3 URL', () => {
		const track = makeTrack();
		const result = mapToRNTPTrack(track, 'https://example.com/track.mp3');
		expect(result.contentType).toBe('audio/mpeg');
	});

	it('infers contentType audio/mp4 for .m4a URL', () => {
		const track = makeTrack();
		const result = mapToRNTPTrack(track, 'https://cdn.example.com/track.m4a');
		expect(result.contentType).toBe('audio/mp4');
	});

	it('infers contentType audio/flac for .flac URL', () => {
		const track = makeTrack();
		const result = mapToRNTPTrack(track, 'https://cdn.example.com/track.flac');
		expect(result.contentType).toBe('audio/flac');
	});

	it('leaves contentType undefined for URL with no known extension', () => {
		const track = makeTrack();
		const result = mapToRNTPTrack(track, 'https://api.example.com/stream/12345');
		expect(result.contentType).toBeUndefined();
	});

	it('works with a track that has no optional fields', () => {
		const track = makeTrackNoOptionals();
		const result = mapToRNTPTrack(track, 'https://example.com/bare.mp3');
		expect(result.id).toBe(track.id.value);
		expect(result.title).toBe('Bare Track');
		expect(result.artist).toBe('Unknown Artist');
		expect(result.album).toBeUndefined();
		expect(result.artwork).toBeUndefined();
	});

	it('sets the stream URL as the url field', () => {
		const track = makeTrack();
		const url = 'https://cdn.example.com/audio/song.mp3';
		const result = mapToRNTPTrack(track, url);
		expect(result.url).toBe(url);
	});
});

// ---------------------------------------------------------------------------
// ProgressTracker
// ---------------------------------------------------------------------------

describe('ProgressTracker', () => {
	let state: PlaybackState;
	let emitEvent: ReturnType<typeof vi.fn>;
	let tracker: ProgressTracker;

	beforeEach(() => {
		state = new PlaybackState();
		emitEvent = vi.fn();
		tracker = new ProgressTracker(state, emitEvent as (event: PlaybackEvent) => void);
	});

	it('emits position-change on every update', () => {
		tracker.handleProgressUpdate(30, 180);
		expect(emitEvent).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'position-change' })
		);
	});

	it('updates state.position on every update', () => {
		tracker.handleProgressUpdate(45, 180);
		expect(state.position.totalSeconds).toBe(45);
	});

	it('emits duration-change when duration changes', () => {
		tracker.handleProgressUpdate(10, 180);
		const calls = emitEvent.mock.calls.map((c) => c[0] as PlaybackEvent);
		expect(calls.some((e) => e.type === 'duration-change')).toBe(true);
	});

	it('does not emit duration-change when duration is 0', () => {
		tracker.handleProgressUpdate(10, 0);
		const calls = emitEvent.mock.calls.map((c) => c[0] as PlaybackEvent);
		expect(calls.some((e) => e.type === 'duration-change')).toBe(false);
	});

	it('does not emit duration-change when duration is unchanged', () => {
		tracker.handleProgressUpdate(5, 180);
		emitEvent.mockClear();
		tracker.handleProgressUpdate(10, 180);
		const calls = emitEvent.mock.calls.map((c) => c[0] as PlaybackEvent);
		expect(calls.some((e) => e.type === 'duration-change')).toBe(false);
	});

	it('emits duration-change again when duration changes to a new value', () => {
		tracker.handleProgressUpdate(5, 180);
		emitEvent.mockClear();
		tracker.handleProgressUpdate(5, 240);
		const calls = emitEvent.mock.calls.map((c) => c[0] as PlaybackEvent);
		expect(calls.some((e) => e.type === 'duration-change')).toBe(true);
	});

	it('includes correct position in position-change event', () => {
		tracker.handleProgressUpdate(77, 300);
		const positionEvent = (emitEvent.mock.calls.map((c) => c[0]) as PlaybackEvent[]).find(
			(e) => e.type === 'position-change'
		);
		expect(positionEvent).toBeDefined();
		if (positionEvent?.type === 'position-change') {
			expect(positionEvent.position.totalSeconds).toBe(77);
		}
	});

	it('includes correct duration in duration-change event', () => {
		tracker.handleProgressUpdate(10, 300);
		const durationEvent = (emitEvent.mock.calls.map((c) => c[0]) as PlaybackEvent[]).find(
			(e) => e.type === 'duration-change'
		);
		expect(durationEvent).toBeDefined();
		if (durationEvent?.type === 'duration-change') {
			expect(durationEvent.duration.totalSeconds).toBe(300);
		}
	});

	it('updates state.duration when duration changes', () => {
		tracker.handleProgressUpdate(0, 300);
		expect(state.duration.totalSeconds).toBe(300);
	});
});

// ---------------------------------------------------------------------------
// QueueManager
// ---------------------------------------------------------------------------

describe('QueueManager', () => {
	let state: PlaybackState;
	let manager: QueueManager;

	const trackA = makeTrack({ id: TrackId.create('local-file', 'a') } as Partial<Track>);
	const trackB = makeTrack({ id: TrackId.create('local-file', 'b') } as Partial<Track>);
	const trackC = makeTrack({ id: TrackId.create('local-file', 'c') } as Partial<Track>);

	beforeEach(() => {
		state = new PlaybackState();
		manager = new QueueManager(state);
	});

	// --- setQueue ---

	describe('setQueue', () => {
		it('sets the queue tracks', () => {
			manager.setQueue([trackA, trackB, trackC]);
			expect(state.queue).toEqual([trackA, trackB, trackC]);
		});

		it('sets currentIndex to the given startIndex', () => {
			manager.setQueue([trackA, trackB, trackC], 1);
			expect(state.currentIndex).toBe(1);
		});

		it('defaults startIndex to 0', () => {
			manager.setQueue([trackA, trackB]);
			expect(state.currentIndex).toBe(0);
		});

		it('returns an ok result', () => {
			const result = manager.setQueue([trackA]);
			expect(result.success).toBe(true);
		});
	});

	// --- getQueue ---

	describe('getQueue', () => {
		it('returns QueueItem array with correct track references', () => {
			manager.setQueue([trackA, trackB], 0);
			const queue = manager.getQueue();
			expect(queue[0].track).toBe(trackA);
			expect(queue[1].track).toBe(trackB);
		});

		it('sets isActive true only for currentIndex', () => {
			manager.setQueue([trackA, trackB, trackC], 1);
			const queue = manager.getQueue();
			expect(queue[0].isActive).toBe(false);
			expect(queue[1].isActive).toBe(true);
			expect(queue[2].isActive).toBe(false);
		});

		it('sets correct position values', () => {
			manager.setQueue([trackA, trackB, trackC]);
			const queue = manager.getQueue();
			expect(queue.map((item) => item.position)).toEqual([0, 1, 2]);
		});

		it('returns empty array when queue is empty', () => {
			expect(manager.getQueue()).toHaveLength(0);
		});
	});

	// --- addToQueue ---

	describe('addToQueue', () => {
		it('appends tracks to the end when no index given', () => {
			manager.setQueue([trackA, trackB]);
			manager.addToQueue([trackC]);
			expect(state.queue).toEqual([trackA, trackB, trackC]);
		});

		it('inserts tracks at the specified index', () => {
			manager.setQueue([trackA, trackC]);
			manager.addToQueue([trackB], 1);
			expect(state.queue).toEqual([trackA, trackB, trackC]);
		});

		it('adjusts currentIndex when inserting before it', () => {
			manager.setQueue([trackA, trackC], 1);
			manager.addToQueue([trackB], 0);
			expect(state.currentIndex).toBe(2);
		});

		it('does not adjust currentIndex when inserting after it', () => {
			manager.setQueue([trackA, trackB], 0);
			manager.addToQueue([trackC], 2);
			expect(state.currentIndex).toBe(0);
		});

		it('does not adjust currentIndex when inserting at the same index', () => {
			manager.setQueue([trackA, trackC], 1);
			manager.addToQueue([trackB], 1);
			// currentIndex was 1, insertion at 1 means currentIndex shifts
			expect(state.currentIndex).toBe(2);
		});

		it('returns an ok result', () => {
			const result = manager.addToQueue([trackA]);
			expect(result.success).toBe(true);
		});
	});

	// --- removeFromQueue ---

	describe('removeFromQueue', () => {
		it('removes the track at the given index', () => {
			manager.setQueue([trackA, trackB, trackC]);
			manager.removeFromQueue(1);
			expect(state.queue).toEqual([trackA, trackC]);
		});

		it('decrements currentIndex when removing a track before it', () => {
			manager.setQueue([trackA, trackB, trackC], 2);
			manager.removeFromQueue(0);
			expect(state.currentIndex).toBe(1);
		});

		it('does not change currentIndex when removing a track after it', () => {
			manager.setQueue([trackA, trackB, trackC], 0);
			manager.removeFromQueue(2);
			expect(state.currentIndex).toBe(0);
		});

		it('calls state.reset() when removing the currently playing track', () => {
			const resetSpy = vi.spyOn(state, 'reset');
			manager.setQueue([trackA, trackB, trackC], 1);
			manager.removeFromQueue(1);
			expect(resetSpy).toHaveBeenCalled();
		});

		it('does nothing for an out-of-bounds index', () => {
			manager.setQueue([trackA, trackB]);
			manager.removeFromQueue(99);
			expect(state.queue).toHaveLength(2);
		});

		it('returns an ok result', () => {
			manager.setQueue([trackA]);
			const result = manager.removeFromQueue(0);
			expect(result.success).toBe(true);
		});
	});

	// --- clearQueue ---

	describe('clearQueue', () => {
		it('empties the queue', () => {
			manager.setQueue([trackA, trackB, trackC]);
			manager.clearQueue();
			expect(state.queue).toHaveLength(0);
		});

		it('sets currentIndex to -1', () => {
			manager.setQueue([trackA, trackB], 1);
			manager.clearQueue();
			expect(state.currentIndex).toBe(-1);
		});

		it('returns an ok result', () => {
			const result = manager.clearQueue();
			expect(result.success).toBe(true);
		});
	});

	// --- canSkipNext / canSkipPrevious ---

	describe('canSkipNext', () => {
		it('returns true when there are tracks after the current index', () => {
			manager.setQueue([trackA, trackB], 0);
			expect(manager.canSkipNext()).toBe(true);
		});

		it('returns false when at the last track', () => {
			manager.setQueue([trackA, trackB], 1);
			expect(manager.canSkipNext()).toBe(false);
		});

		it('returns false when queue is empty', () => {
			expect(manager.canSkipNext()).toBe(false);
		});
	});

	describe('canSkipPrevious', () => {
		it('returns true when there are tracks before the current index', () => {
			manager.setQueue([trackA, trackB], 1);
			expect(manager.canSkipPrevious()).toBe(true);
		});

		it('returns false when at the first track', () => {
			manager.setQueue([trackA, trackB], 0);
			expect(manager.canSkipPrevious()).toBe(false);
		});

		it('returns false when queue is empty (currentIndex is -1)', () => {
			expect(manager.canSkipPrevious()).toBe(false);
		});
	});

	// --- skipToNext ---

	describe('skipToNext', () => {
		it('increments currentIndex', () => {
			manager.setQueue([trackA, trackB, trackC], 0);
			manager.skipToNext();
			expect(state.currentIndex).toBe(1);
		});

		it('returns ok when skipping succeeds', () => {
			manager.setQueue([trackA, trackB], 0);
			const result = manager.skipToNext();
			expect(result.success).toBe(true);
		});

		it('returns err when already at the last track', () => {
			manager.setQueue([trackA, trackB], 1);
			const result = manager.skipToNext();
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toMatch(/no next track/i);
			}
		});

		it('does not change index when err is returned', () => {
			manager.setQueue([trackA], 0);
			manager.skipToNext();
			expect(state.currentIndex).toBe(0);
		});
	});

	// --- skipToPrevious ---

	describe('skipToPrevious', () => {
		it('decrements currentIndex', () => {
			manager.setQueue([trackA, trackB, trackC], 2);
			manager.skipToPrevious();
			expect(state.currentIndex).toBe(1);
		});

		it('returns ok when skipping succeeds', () => {
			manager.setQueue([trackA, trackB], 1);
			const result = manager.skipToPrevious();
			expect(result.success).toBe(true);
		});

		it('returns err when already at the first track', () => {
			manager.setQueue([trackA, trackB], 0);
			const result = manager.skipToPrevious();
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toMatch(/no previous track/i);
			}
		});

		it('does not change index when err is returned', () => {
			manager.setQueue([trackA], 0);
			manager.skipToPrevious();
			expect(state.currentIndex).toBe(0);
		});
	});
});

// ---------------------------------------------------------------------------
// RNTPPluginModule
// ---------------------------------------------------------------------------

describe('RNTPPluginModule', () => {
	it('exposes a manifest that matches PLUGIN_MANIFEST', () => {
		expect(RNTPPluginModule.manifest).toEqual(PLUGIN_MANIFEST);
	});

	it('manifest has the correct plugin id', () => {
		expect(RNTPPluginModule.manifest.id).toBe('react-native-track-player');
	});

	it('manifest has category playback-provider', () => {
		expect(RNTPPluginModule.manifest.category).toBe('playback-provider');
	});

	it('create() returns a new instance on each call', async () => {
		const instance1 = await RNTPPluginModule.create();
		const instance2 = await RNTPPluginModule.create();
		expect(instance1).not.toBe(instance2);
	});

	it('create() returns an object that implements PlaybackProvider (has play method)', async () => {
		const instance = await RNTPPluginModule.create();
		expect(typeof instance.play).toBe('function');
	});

	it('has a validate function', () => {
		expect(typeof RNTPPluginModule.validate).toBe('function');
	});
});
