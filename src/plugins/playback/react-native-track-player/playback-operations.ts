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
	private readonly lock = new OperationLock();

	constructor(
		private readonly state: PlaybackState,
		private readonly emitEvent: (event: PlaybackEvent) => void,
		private readonly updateStatus: (status: 'idle' | 'loading' | 'playing' | 'paused' | 'error') => void
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

		return this.lock.withLock(async () => {
			try {
				logger.debug('Acquired lock, resetting player...');

				await TrackPlayer.reset();
				logger.debug('Player reset complete');

				const rntpTrack = mapToRNTPTrack(track, streamUrl, headers);
				this.state.trackMap.set(rntpTrack.id, track);
				logger.debug('Adding track to player...');

				await TrackPlayer.add(rntpTrack);
				logger.debug('Track added successfully');

				this.state.currentTrack = track;
				this.state.position = Duration.ZERO;
				this.state.duration = track.duration;
				this.updateStatus('loading');

				if (startPosition && startPosition.totalMilliseconds > 0) {
					await TrackPlayer.seekTo(startPosition.totalSeconds);
				}

				logger.debug('Calling TrackPlayer.play()...');
				await TrackPlayer.play();
				logger.debug('TrackPlayer.play() returned');

				const state = await TrackPlayer.getPlaybackState();
				logger.debug('Actual playback state after play():', state.state);
				const activeTrack = await TrackPlayer.getActiveTrack();
				logger.debug('Active track:', activeTrack?.id, activeTrack?.url?.substring(0, 50));

				this.updateStatus('playing');
				this.emitEvent({ type: 'track-change', track, timestamp: Date.now() });
				this.emitEvent({
					type: 'duration-change',
					duration: track.duration,
					timestamp: Date.now(),
				});

				return ok(undefined);
			} catch (error) {
				logger.error('Error during playback', error instanceof Error ? error : undefined);
				this.updateStatus('error');
				const errorObj = error instanceof Error ? error : new Error(String(error));
				this.emitEvent({ type: 'error', error: errorObj, timestamp: Date.now() });
				return err(errorObj);
			}
		});
	}

	async pause(): AsyncResult<void, Error> {
		return this.lock.withLock(async () => {
			if (this.state.playbackStatus === 'playing') {
				await TrackPlayer.pause();
				this.updateStatus('paused');
			}
			return ok(undefined);
		});
	}

	async resume(): AsyncResult<void, Error> {
		return this.lock.withLock(async () => {
			if (this.state.playbackStatus === 'paused') {
				await TrackPlayer.play();
				this.updateStatus('playing');
			}
			return ok(undefined);
		});
	}

	async stop(): AsyncResult<void, Error> {
		return this.lock.withLock(async () => {
			try {
				await TrackPlayer.reset();
			} catch (error) {
				logger.debug('Reset failed during stop', error instanceof Error ? error : undefined);
			}
			this.state.reset();
			this.updateStatus('idle');
			return ok(undefined);
		});
	}

	async seek(position: Duration): AsyncResult<void, Error> {
		return this.lock.withLock(async () => {
			const targetSeconds = position.totalSeconds;
			logger.debug(`seek() called: target=${targetSeconds}s`);

			await TrackPlayer.seekTo(targetSeconds);
			this.state.position = position;

			return ok(undefined);
		});
	}

	async setPlaybackRate(rate: number): AsyncResult<void, Error> {
		return this.lock.withLock(async () => {
			const clampedRate = Math.max(MIN_PLAYBACK_RATE, Math.min(MAX_PLAYBACK_RATE, rate));
			await TrackPlayer.setRate(clampedRate);
			return ok(undefined);
		});
	}

	async setVolume(volume: number): AsyncResult<void, Error> {
		return this.lock.withLock(async () => {
			this.state.volume = Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, volume));
			await TrackPlayer.setVolume(this.state.volume);
			return ok(undefined);
		});
	}

	setRepeatMode(mode: RepeatMode): Result<void, Error> {
		this.state.repeatMode = mode;
		const rntpMode = this.mapRepeatMode(mode);
		TrackPlayer.setRepeatMode(rntpMode);
		return ok(undefined);
	}

	setShuffle(enabled: boolean): Result<void, Error> {
		this.state.isShuffled = enabled;
		return ok(undefined);
	}

	async shouldSeekToStart(position: Duration): Promise<boolean> {
		return position.totalSeconds > SKIP_PREVIOUS_THRESHOLD_SECONDS;
	}

	private mapRepeatMode(mode: RepeatMode): RNTPRepeatMode {
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
