/**
 * DASH Playback Provider
 *
 * Orchestrates playback operations, queue management, and event handling
 * using expo-video's createVideoPlayer API for DASH and HLS streams.
 */

import type { Track } from '@domain/entities/track';
import { Duration } from '@domain/value-objects/duration';
import type { PlaybackStatus, RepeatMode } from '@domain/value-objects/playback-state';
import type {
	PlaybackProvider,
	PlaybackEventListener,
	PlaybackCapability,
	QueueItem,
} from '@plugins/core/interfaces/playback-provider';
import type {
	PluginManifest,
	PluginStatus,
	PluginInitContext,
} from '@plugins/core/interfaces/base-plugin';
import { ok, err, type Result, type AsyncResult } from '@shared/types/result';
import { getLogger } from '@shared/services/logger';
import { PLUGIN_MANIFEST, PLAYBACK_CAPABILITIES } from './config';
import { PlaybackState } from './playback-state';
import { EventHandler } from './event-handler';
import { QueueManager } from './queue-manager';
import { QueueHandler } from './queue-handler';
import { PlaybackOperations } from './playback-operations';
import { canHandleUrl } from './url-validator';

const logger = getLogger('DashPlayback');

export class DashPlaybackProvider implements PlaybackProvider {
	readonly manifest: PluginManifest = PLUGIN_MANIFEST;
	readonly capabilities: Set<PlaybackCapability> = new Set(PLAYBACK_CAPABILITIES);
	readonly configSchema = [];

	status: PluginStatus = 'uninitialized';

	private _isSetup = false;
	private readonly _state: PlaybackState;
	private readonly _eventHandler: EventHandler;
	private readonly _queueHandler: QueueHandler;
	private readonly _playbackOps: PlaybackOperations;

	constructor() {
		this._state = new PlaybackState();
		this._eventHandler = new EventHandler(this._state, this._updateStatus);
		const queueManager = new QueueManager(this._state);
		this._queueHandler = new QueueHandler(queueManager, this._state, this._emitEvent);
		this._playbackOps = new PlaybackOperations(
			this._state,
			this._eventHandler,
			this._emitEvent,
			this._updateStatus
		);
	}

	canHandle(url: string): boolean {
		return canHandleUrl(url);
	}

	async onInit(_context?: PluginInitContext): AsyncResult<void, Error> {
		if (this._isSetup) {
			this.status = 'ready';
			return ok(undefined);
		}

		try {
			this.status = 'initializing';
			this._isSetup = true;
			this.status = 'ready';
			return ok(undefined);
		} catch (error) {
			logger.error('Failed to initialize', error instanceof Error ? error : undefined);
			this.status = 'error';
			return err(error instanceof Error ? error : new Error(String(error)));
		}
	}

	async onActivate(): AsyncResult<void, Error> {
		this.status = 'active';
		return ok(undefined);
	}

	async onDeactivate(): AsyncResult<void, Error> {
		this.status = 'ready';
		return ok(undefined);
	}

	async onDestroy(): AsyncResult<void, Error> {
		await this._playbackOps.stop();
		this._eventHandler.clearListeners();
		this._state.clear();
		this._isSetup = false;
		this.status = 'disabled';
		return ok(undefined);
	}

	hasCapability = (capability: PlaybackCapability): boolean => this.capabilities.has(capability);

	async play(
		track: Track,
		streamUrl: string,
		startPosition?: Duration,
		headers?: Record<string, string>
	): AsyncResult<void, Error> {
		if (!this._isSetup) {
			const initResult = await this.onInit();
			if (!initResult.success) return initResult;
		}
		return this._playbackOps.play(track, streamUrl, startPosition, headers);
	}

	pause = (): AsyncResult<void, Error> => this._playbackOps.pause();

	resume = (): AsyncResult<void, Error> => this._playbackOps.resume();

	stop = (): AsyncResult<void, Error> => this._playbackOps.stop();

	seek = (position: Duration): AsyncResult<void, Error> => this._playbackOps.seek(position);

	setPlaybackRate = (rate: number): AsyncResult<void, Error> =>
		this._playbackOps.setPlaybackRate(rate);

	setVolume = (volume: number): AsyncResult<void, Error> => this._playbackOps.setVolume(volume);

	getVolume = (): number => this._state.volume;

	getStatus = (): PlaybackStatus => this._state.playbackStatus;

	getPosition = (): Duration => this._state.position;

	getDuration = (): Duration => this._state.duration;

	getCurrentTrack = (): Track | null => this._state.currentTrack;

	getQueue = (): QueueItem[] => this._queueHandler.getQueue();

	setQueue = (tracks: Track[], startIndex: number = 0): AsyncResult<void, Error> =>
		this._queueHandler.setQueue(tracks, startIndex);

	addToQueue = (tracks: Track[], atIndex?: number): Result<void, Error> =>
		this._queueHandler.addToQueue(tracks, atIndex);

	removeFromQueue = (index: number): Result<void, Error> =>
		this._queueHandler.removeFromQueue(index);

	clearQueue = (): Result<void, Error> => this._queueHandler.clearQueue();

	skipToNext = (): AsyncResult<void, Error> => this._queueHandler.skipToNext();

	skipToPrevious = async (): AsyncResult<void, Error> =>
		this._playbackOps.shouldSeekToStart(this._state.position)
			? this._playbackOps.seek(Duration.ZERO)
			: this._queueHandler.skipToPrevious();

	setRepeatMode = (mode: RepeatMode): Result<void, Error> =>
		this._playbackOps.setRepeatMode(mode);

	getRepeatMode = (): RepeatMode => this._state.repeatMode;

	setShuffle = (enabled: boolean): Result<void, Error> => this._playbackOps.setShuffle(enabled);

	isShuffle = (): boolean => this._state.isShuffled;

	addEventListener = (listener: PlaybackEventListener): (() => void) =>
		this._eventHandler.addEventListener(listener);

	removeEventListener = (listener: PlaybackEventListener): void =>
		this._eventHandler.removeEventListener(listener);

	private _updateStatus = (newStatus: PlaybackStatus): void => {
		this._state.playbackStatus = newStatus;
		this._emitEvent({ type: 'status-change', status: newStatus, timestamp: Date.now() });
	};

	private _emitEvent = (event: Parameters<PlaybackEventListener>[0]): void =>
		this._eventHandler.emitEvent(event);
}

export { PLUGIN_MANIFEST as DASH_MANIFEST } from './config';
