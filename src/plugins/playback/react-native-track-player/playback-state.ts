/**
 * Playback State Management
 *
 * Manages internal state for the playback provider including current track,
 * position, duration, volume, and queue state.
 */

import type { Track } from '@domain/entities/track';
import { Duration } from '@domain/value-objects/duration';
import type { PlaybackStatus, RepeatMode } from '@domain/value-objects/playback-state';

export class PlaybackState {
	private _playbackStatus: PlaybackStatus = 'idle';
	private _currentTrack: Track | null = null;
	private _trackMap: Map<string, Track> = new Map();
	private _position: Duration = Duration.ZERO;
	private _duration: Duration = Duration.ZERO;
	private _volume: number = 1.0;
	private _repeatMode: RepeatMode = 'off';
	private _isShuffled: boolean = false;
	private _queue: Track[] = [];
	private _currentIndex: number = -1;

	get playbackStatus(): PlaybackStatus {
		return this._playbackStatus;
	}

	set playbackStatus(status: PlaybackStatus) {
		this._playbackStatus = status;
	}

	get currentTrack(): Track | null {
		return this._currentTrack;
	}

	set currentTrack(track: Track | null) {
		this._currentTrack = track;
	}

	get trackMap(): Map<string, Track> {
		return this._trackMap;
	}

	get position(): Duration {
		return this._position;
	}

	set position(pos: Duration) {
		this._position = pos;
	}

	get duration(): Duration {
		return this._duration;
	}

	set duration(dur: Duration) {
		this._duration = dur;
	}

	get volume(): number {
		return this._volume;
	}

	set volume(vol: number) {
		this._volume = vol;
	}

	get repeatMode(): RepeatMode {
		return this._repeatMode;
	}

	set repeatMode(mode: RepeatMode) {
		this._repeatMode = mode;
	}

	get isShuffled(): boolean {
		return this._isShuffled;
	}

	set isShuffled(shuffled: boolean) {
		this._isShuffled = shuffled;
	}

	get queue(): Track[] {
		return this._queue;
	}

	set queue(tracks: Track[]) {
		this._queue = tracks;
	}

	get currentIndex(): number {
		return this._currentIndex;
	}

	set currentIndex(index: number) {
		this._currentIndex = index;
	}

	reset(): void {
		this._currentTrack = null;
		this._position = Duration.ZERO;
		this._duration = Duration.ZERO;
		this._playbackStatus = 'idle';
	}

	clear(): void {
		this.reset();
		this._trackMap.clear();
		this._queue = [];
		this._currentIndex = -1;
		this._repeatMode = 'off';
		this._isShuffled = false;
	}
}
