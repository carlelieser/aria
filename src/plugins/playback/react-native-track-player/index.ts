/**
 * React Native Track Player Playback Provider
 *
 * Orchestrates playback operations, queue management, event handling, and progress tracking.
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
import { ProgressTracker } from './progress-tracker';
import { PlayerInitializer } from './player-initializer';
import { UrlValidator } from './url-validator';

const logger = getLogger('RNTPProvider');
export class RNTPPlaybackProvider implements PlaybackProvider {
	readonly manifest: PluginManifest = PLUGIN_MANIFEST;
	readonly capabilities: Set<PlaybackCapability> = new Set(PLAYBACK_CAPABILITIES);
	readonly configSchema = [];

	status: PluginStatus = 'uninitialized';

	private isSetup: boolean = false;
	private readonly state: PlaybackState;
	private readonly eventHandler: EventHandler;
	private readonly queueHandler: QueueHandler;
	private readonly playbackOps: PlaybackOperations;
	private readonly progressTracker: ProgressTracker;
	private readonly initializer: PlayerInitializer;
	private readonly urlValidator: UrlValidator;

	constructor() {
		this.state = new PlaybackState();
		this.progressTracker = new ProgressTracker(this.state, this.emitEvent.bind(this));
		this.eventHandler = new EventHandler(
			this.state,
			this.progressTracker,
			this.updateStatus.bind(this)
		);
		const queueManager = new QueueManager(this.state);
		this.queueHandler = new QueueHandler(queueManager, this.state, this.emitEvent.bind(this));
		this.playbackOps = new PlaybackOperations(
			this.state,
			this.emitEvent.bind(this),
			this.updateStatus.bind(this)
		);
		this.initializer = new PlayerInitializer();
		this.urlValidator = new UrlValidator();
	}

	async onInit(_context?: PluginInitContext): AsyncResult<void, Error> {
		if (this.isSetup) {
			this.status = 'ready';
			return ok(undefined);
		}

		try {
			this.status = 'initializing';

			await this.initializer.setup(this.state.volume);
			this.eventHandler.setupEventListeners();
			this.progressTracker.start();

			this.isSetup = true;
			this.status = 'ready';
			return ok(undefined);
		} catch (error) {
			logger.error('Failed to setup RNTP', error instanceof Error ? error : undefined);
			this.status = 'error';
			return err(error instanceof Error ? error : new Error(String(error)));
		}
	}

	onActivate = async (): AsyncResult<void, Error> => {
		this.status = 'active';
		return ok(undefined);
	};

	onDeactivate = async (): AsyncResult<void, Error> => {
		this.status = 'ready';
		return ok(undefined);
	};

	async onDestroy(): AsyncResult<void, Error> {
		this.progressTracker.stop();
		this.eventHandler.removeEventListeners();
		await this.playbackOps.stop();
		this.eventHandler.clearListeners();
		this.state.clear();
		this.isSetup = false;
		this.status = 'disabled';
		return ok(undefined);
	}

	hasCapability = (capability: PlaybackCapability): boolean => this.capabilities.has(capability);

	canHandle = (url: string): boolean => this.urlValidator.canHandle(url);

	async play(
		track: Track,
		streamUrl: string,
		startPosition?: Duration,
		headers?: Record<string, string>
	): AsyncResult<void, Error> {
		if (!this.isSetup) {
			const initResult = await this.onInit();
			if (!initResult.success) return initResult;
		}
		return this.playbackOps.play(track, streamUrl, startPosition, headers);
	}

	pause = (): AsyncResult<void, Error> => this.playbackOps.pause();

	resume = (): AsyncResult<void, Error> => this.playbackOps.resume();

	stop = (): AsyncResult<void, Error> => this.playbackOps.stop();

	seek = (position: Duration): AsyncResult<void, Error> => this.playbackOps.seek(position);

	setPlaybackRate = (rate: number): AsyncResult<void, Error> =>
		this.playbackOps.setPlaybackRate(rate);

	setVolume = (volume: number): AsyncResult<void, Error> => this.playbackOps.setVolume(volume);

	getVolume = (): number => this.state.volume;

	getStatus = (): PlaybackStatus => this.state.playbackStatus;

	getPosition = (): Duration => this.state.position;

	getDuration = (): Duration => this.state.duration;

	getCurrentTrack = (): Track | null => this.state.currentTrack;

	getQueue = (): QueueItem[] => this.queueHandler.getQueue();

	setQueue = (tracks: Track[], startIndex: number = 0): AsyncResult<void, Error> =>
		this.queueHandler.setQueue(tracks, startIndex);

	addToQueue = (tracks: Track[], atIndex?: number): Result<void, Error> =>
		this.queueHandler.addToQueue(tracks, atIndex);

	removeFromQueue = (index: number): Result<void, Error> =>
		this.queueHandler.removeFromQueue(index);

	clearQueue = (): Result<void, Error> => this.queueHandler.clearQueue();

	skipToNext = (): AsyncResult<void, Error> => this.queueHandler.skipToNext();

	skipToPrevious = async (): AsyncResult<void, Error> =>
		(await this.playbackOps.shouldSeekToStart(this.state.position))
			? this.playbackOps.seek(Duration.ZERO)
			: this.queueHandler.skipToPrevious();

	setRepeatMode = (mode: RepeatMode): Result<void, Error> => this.playbackOps.setRepeatMode(mode);

	getRepeatMode = (): RepeatMode => this.state.repeatMode;

	setShuffle = (enabled: boolean): Result<void, Error> => this.playbackOps.setShuffle(enabled);

	isShuffle = (): boolean => this.state.isShuffled;

	addEventListener = (listener: PlaybackEventListener): (() => void) =>
		this.eventHandler.addEventListener(listener);

	removeEventListener = (listener: PlaybackEventListener): void =>
		this.eventHandler.removeEventListener(listener);

	private updateStatus = (newStatus: PlaybackStatus): void => {
		if (this.state.playbackStatus !== newStatus) {
			this.state.playbackStatus = newStatus;
			this.emitEvent({ type: 'status-change', status: newStatus, timestamp: Date.now() });
		}
	};

	private emitEvent = (event: Parameters<PlaybackEventListener>[0]): void =>
		this.eventHandler.emitEvent(event);
}

export const rntpPlaybackProvider = new RNTPPlaybackProvider();

export { PLUGIN_MANIFEST as RNTP_MANIFEST } from './config';
