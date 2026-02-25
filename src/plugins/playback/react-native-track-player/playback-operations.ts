/**
 * Playback Operations
 *
 * Core playback controls including play, pause, seek, volume, and rate control.
 */

import TrackPlayer, { RepeatMode as RNTPRepeatMode } from 'react-native-track-player';
import type { Track } from '@domain/entities/track';
import { Duration } from '@domain/value-objects/duration';
import type { RepeatMode } from '@domain/value-objects/playback-state';
import type { PlaybackEvent } from '@plugins/core/interfaces/playback-provider';
import { ok, err, type AsyncResult, type Result } from '@shared/types/result';
import { getLogger } from '@shared/services/logger';
import type { PlaybackState } from './playback-state';
import { mapToRNTPTrack } from './track-mapper';
import { OperationLock } from './operation-lock';
import {
	MIN_PLAYBACK_RATE,
	MAX_PLAYBACK_RATE,
	MIN_VOLUME,
	MAX_VOLUME,
	SKIP_PREVIOUS_THRESHOLD_SECONDS,
} from './constants';

const logger = getLogger('PlaybackOperations');

export class PlaybackOperations {
	private readonly _lock = new OperationLock();

	constructor(
		private readonly _state: PlaybackState,
		private readonly _emitEvent: (event: PlaybackEvent) => void,
		private readonly _updateStatus: (
			status: 'idle' | 'loading' | 'playing' | 'paused' | 'error'
		) => void
	) {}

	async play(
		track: Track,
		streamUrl: string,
		startPosition?: Duration,
		headers?: Record<string, string>
	): AsyncResult<void, Error> {
		logger.debug('play() called for track:', track.title);
		logger.debug('Stream URL:', streamUrl.substring(0, 100) + '...');
		logger.debug('Headers present:', headers ? Object.keys(headers).join(', ') : 'none');

		return this._lock.withLock(async () => {
			try {
				logger.debug('Acquired lock, resetting player...');

				this._state.isTransitioning = true;
				await TrackPlayer.reset();
				this._state.isTransitioning = false;
				logger.debug('Player reset complete');

				const rntpTrack = mapToRNTPTrack(track, streamUrl, headers);
				this._state.trackMap.set(rntpTrack.id, track);
				logger.debug('Adding track to player...');

				await TrackPlayer.add(rntpTrack);
				logger.debug('Track added successfully');

				this._state.currentTrack = track;
				this._state.position = Duration.ZERO;
				this._state.duration = track.duration;
				this._updateStatus('loading');

				if (startPosition && startPosition.totalMilliseconds > 0) {
					await TrackPlayer.seekTo(startPosition.totalSeconds);
				}

				logger.debug('Calling TrackPlayer.play()...');
				await TrackPlayer.play();
				logger.debug('TrackPlayer.play() returned');

				this._updateStatus('playing');
				this._emitEvent({ type: 'track-change', track, timestamp: Date.now() });
				this._emitEvent({
					type: 'duration-change',
					duration: track.duration,
					timestamp: Date.now(),
				});

				return ok(undefined);
			} catch (error) {
				this._state.isTransitioning = false;
				logger.error('Error during playback', error instanceof Error ? error : undefined);
				this._updateStatus('error');
				const errorObj = error instanceof Error ? error : new Error(String(error));
				this._emitEvent({ type: 'error', error: errorObj, timestamp: Date.now() });
				return err(errorObj);
			}
		});
	}

	async pause(): AsyncResult<void, Error> {
		return this._lock.withLock(async () => {
			if (this._state.playbackStatus === 'playing') {
				await TrackPlayer.pause();
				this._updateStatus('paused');
			}
			return ok(undefined);
		});
	}

	async resume(): AsyncResult<void, Error> {
		return this._lock.withLock(async () => {
			if (this._state.playbackStatus === 'paused') {
				await TrackPlayer.play();
				this._updateStatus('playing');
			}
			return ok(undefined);
		});
	}

	async stop(): AsyncResult<void, Error> {
		return this._lock.withLock(async () => {
			try {
				await TrackPlayer.stop();
				await TrackPlayer.reset();
			} catch (error) {
				logger.debug(
					'Stop/reset failed during stop',
					error instanceof Error ? error : undefined
				);
			}
			this._state.reset();
			this._updateStatus('idle');
			return ok(undefined);
		});
	}

	async seek(position: Duration): AsyncResult<void, Error> {
		return this._lock.withLock(async () => {
			const targetSeconds = position.totalSeconds;
			logger.debug(`seek() called: target=${targetSeconds}s`);

			try {
				this._state.isSeeking = true;
				await TrackPlayer.seekTo(targetSeconds);
				this._state.position = position;
				this._emitEvent({ type: 'position-change', position, timestamp: Date.now() });
				return ok(undefined);
			} catch (error) {
				const errorObj = error instanceof Error ? error : new Error(String(error));
				logger.error('Seek failed', errorObj);
				return err(errorObj);
			} finally {
				this._state.isSeeking = false;
			}
		});
	}

	async setPlaybackRate(rate: number): AsyncResult<void, Error> {
		return this._lock.withLock(async () => {
			const clampedRate = Math.max(MIN_PLAYBACK_RATE, Math.min(MAX_PLAYBACK_RATE, rate));
			await TrackPlayer.setRate(clampedRate);
			this._emitEvent({ type: 'rate-change', rate: clampedRate, timestamp: Date.now() });
			return ok(undefined);
		});
	}

	async setVolume(volume: number): AsyncResult<void, Error> {
		return this._lock.withLock(async () => {
			this._state.volume = Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, volume));
			await TrackPlayer.setVolume(this._state.volume);
			this._emitEvent({ type: 'volume-change', volume: this._state.volume, timestamp: Date.now() });
			return ok(undefined);
		});
	}

	setRepeatMode(mode: RepeatMode): Result<void, Error> {
		this._state.repeatMode = mode;
		const rntpMode = this._mapRepeatMode(mode);
		TrackPlayer.setRepeatMode(rntpMode);
		this._emitEvent({ type: 'repeat-mode-change', mode, timestamp: Date.now() });
		return ok(undefined);
	}

	setShuffle(enabled: boolean): Result<void, Error> {
		this._state.isShuffled = enabled;
		this._emitEvent({ type: 'shuffle-change', enabled, timestamp: Date.now() });
		return ok(undefined);
	}

	async shouldSeekToStart(position: Duration): Promise<boolean> {
		return position.totalSeconds > SKIP_PREVIOUS_THRESHOLD_SECONDS;
	}

	private _mapRepeatMode(mode: RepeatMode): RNTPRepeatMode {
		switch (mode) {
			case 'one':
				return RNTPRepeatMode.Track;
			case 'all':
				return RNTPRepeatMode.Queue;
			case 'off':
			default:
				return RNTPRepeatMode.Off;
		}
	}
}
