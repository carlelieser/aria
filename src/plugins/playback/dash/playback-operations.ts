/**
 * Playback Operations
 *
 * Core playback controls for the DASH provider using expo-video's
 * createVideoPlayer API. Manages player lifecycle, play/pause/seek,
 * volume, and rate control.
 */

import { createVideoPlayer, type VideoPlayer } from 'expo-video';
import type { Track } from '@domain/entities/track';
import { Duration } from '@domain/value-objects/duration';
import type { PlaybackStatus, RepeatMode } from '@domain/value-objects/playback-state';
import type { PlaybackEvent } from '@plugins/core/interfaces/playback-provider';
import { ok, err, type AsyncResult, type Result } from '@shared/types/result';
import { getLogger } from '@shared/services/logger';
import { getArtistNames, getArtworkUrl } from '@domain/entities/track';
import type { PlaybackState } from './playback-state';
import type { EventHandler } from './event-handler';
import { resolveContentType } from './url-validator';
import {
	MIN_PLAYBACK_RATE,
	MAX_PLAYBACK_RATE,
	MIN_VOLUME,
	MAX_VOLUME,
	SKIP_PREVIOUS_THRESHOLD_SECONDS,
} from './constants';

const logger = getLogger('DashPlaybackOps');

export class PlaybackOperations {
	private _player: VideoPlayer | null = null;

	constructor(
		private readonly _state: PlaybackState,
		private readonly _eventHandler: EventHandler,
		private readonly _emitEvent: (event: PlaybackEvent) => void,
		private readonly _updateStatus: (status: PlaybackStatus) => void
	) {}

	get player(): VideoPlayer | null {
		return this._player;
	}

	async play(
		track: Track,
		streamUrl: string,
		startPosition?: Duration,
		headers?: Record<string, string>
	): AsyncResult<void, Error> {
		try {
			this._releasePlayer();
			this._prepareState(track);
			this._createPlayer(track, streamUrl, headers);
			this._configurePlayer(startPosition);
			this._emitEvent({ type: 'track-change', track, timestamp: Date.now() });
			return ok(undefined);
		} catch (error) {
			logger.error('Error during playback', error instanceof Error ? error : undefined);
			this._updateStatus('error');
			const errorObj = error instanceof Error ? error : new Error(String(error));
			this._emitEvent({ type: 'error', error: errorObj, timestamp: Date.now() });
			return err(errorObj);
		}
	}

	async pause(): AsyncResult<void, Error> {
		if (this._player) {
			this._player.pause();
		}
		return ok(undefined);
	}

	async resume(): AsyncResult<void, Error> {
		if (this._player) {
			this._player.play();
		}
		return ok(undefined);
	}

	async stop(): AsyncResult<void, Error> {
		this._releasePlayer();
		this._state.reset();
		this._updateStatus('idle');
		return ok(undefined);
	}

	async seek(position: Duration): AsyncResult<void, Error> {
		if (this._player) {
			this._player.currentTime = position.totalSeconds;
			this._state.position = position;
			this._emitEvent({ type: 'position-change', position, timestamp: Date.now() });
		}
		return ok(undefined);
	}

	async setPlaybackRate(rate: number): AsyncResult<void, Error> {
		if (this._player) {
			this._player.playbackRate = Math.max(MIN_PLAYBACK_RATE, Math.min(MAX_PLAYBACK_RATE, rate));
		}
		return ok(undefined);
	}

	async setVolume(volume: number): AsyncResult<void, Error> {
		this._state.volume = Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, volume));
		if (this._player) {
			this._player.volume = this._state.volume;
		}
		return ok(undefined);
	}

	setRepeatMode(mode: RepeatMode): Result<void, Error> {
		this._state.repeatMode = mode;
		if (this._player) {
			this._player.loop = mode === 'one';
		}
		return ok(undefined);
	}

	setShuffle(enabled: boolean): Result<void, Error> {
		this._state.isShuffled = enabled;
		return ok(undefined);
	}

	shouldSeekToStart(position: Duration): boolean {
		return position.totalSeconds > SKIP_PREVIOUS_THRESHOLD_SECONDS;
	}

	private _releasePlayer(): void {
		if (!this._player) return;

		try {
			this._player.showNowPlayingNotification = false;
			this._player.pause();
		} catch (error) {
			logger.debug('Player cleanup failed', error instanceof Error ? error : undefined);
		}

		this._eventHandler.removeEventListeners();
		this._player.release();
		this._player = null;
	}

	private _prepareState(track: Track): void {
		this._state.currentTrack = track;
		this._state.position = Duration.ZERO;
		this._state.duration = Duration.ZERO;
		this._updateStatus('loading');
	}

	private _createPlayer(
		track: Track,
		streamUrl: string,
		headers?: Record<string, string>
	): void {
		const contentType = resolveContentType(streamUrl);
		logger.debug('Creating video player', contentType);

		this._player = createVideoPlayer({
			uri: streamUrl,
			contentType,
			metadata: {
				title: track.title,
				artist: getArtistNames(track),
				artwork: getArtworkUrl(track),
			},
			...(headers && Object.keys(headers).length > 0 ? { headers } : {}),
		});
	}

	private _configurePlayer(startPosition?: Duration): void {
		if (!this._player) return;

		this._player.volume = this._state.volume;
		this._player.staysActiveInBackground = true;
		this._player.showNowPlayingNotification = true;
		this._player.loop = this._state.repeatMode === 'one';

		this._eventHandler.setupEventListeners(this._player);

		if (startPosition && startPosition.totalMilliseconds > 0) {
			this._player.currentTime = startPosition.totalSeconds;
		}

		this._player.play();
	}
}
