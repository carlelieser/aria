import type { Result } from '@shared/types/result';
import { ok } from '@shared/types/result';
import { AbstractBasePlugin, type PluginInitContext } from '../../core/interfaces/base-plugin';
import type { ActionsProvider } from '../../core/interfaces/actions-provider';
import type { TrackAction, TrackActionContext } from '@domain/actions/track-action';
import type { Track } from '@domain/entities/track';
import type { Lyrics } from '../../core/interfaces/metadata-provider';
import type {
	TrackActionsRequestEvent,
	TrackActionsResponseEvent,
	TrackActionResult,
	TrackActionExecuteRequestEvent,
	TrackActionExecuteResponseEvent,
} from '../../../application/events/track-action-events';
import { TRACK_ACTION_EVENTS } from '../../../application/events/track-action-events';
import { getPluginRegistry } from '../../core/registry/plugin-registry';
import type { LyricsProvider } from '../domain/lyrics-provider';
import { LyricsOrchestrator } from '../services/lyrics-orchestrator';
import { LyricsCache } from '../services/lyrics-cache';
import { getLyricsActions, executeLyricsAction } from '../actions/lyrics-actions';
import { createLrcLibProvider } from '../providers/lrclib';
import {
	PLUGIN_MANIFEST,
	HANDLED_ACTION_IDS,
	LYRICS_CONFIG_SCHEMA,
	DEFAULT_CACHE_TTL_MS,
} from './config';

export class LyricsPlugin extends AbstractBasePlugin implements Omit<ActionsProvider, 'manifest'> {
	private _unsubscribeRequest?: () => void;
	private _unsubscribeExecute?: () => void;
	private _orchestrator?: LyricsOrchestrator;
	private _cache?: LyricsCache;

	constructor() {
		super(PLUGIN_MANIFEST, LYRICS_CONFIG_SCHEMA);
	}

	async onInit(context: PluginInitContext): Promise<Result<void, Error>> {
		this.dependencies = context;

		const cacheTtlMinutes = (this.config.cacheDurationMinutes as number) ?? 30;
		const preferSynced = (this.config.preferSyncedLyrics as boolean) ?? true;

		this._cache = new LyricsCache(cacheTtlMinutes * 60 * 1000);
		this._orchestrator = new LyricsOrchestrator({
			cache: this._cache,
			logger: this.logger,
			preferSyncedLyrics: preferSynced,
		});

		this._registerBuiltInProviders();

		this.status = 'ready';
		return ok(undefined);
	}

	private _registerBuiltInProviders(): void {
		const lrcLibProvider = createLrcLibProvider({ priority: 10 });
		this._orchestrator?.registerProvider(lrcLibProvider);
		this.logger.debug('Registered built-in LRCLib provider');
	}

	async onActivate(): Promise<Result<void, Error>> {
		this.status = 'active';
		this._subscribeToEvents();
		this.logger.info('Lyrics plugin activated');
		return ok(undefined);
	}

	async onDeactivate(): Promise<Result<void, Error>> {
		this._unsubscribeFromEvents();
		this.status = 'ready';
		return ok(undefined);
	}

	async onDestroy(): Promise<Result<void, Error>> {
		this._unsubscribeFromEvents();
		this._orchestrator?.clearCache();
		this.status = 'uninitialized';
		return ok(undefined);
	}

	async onConfigUpdate(): Promise<Result<void, Error>> {
		const cacheTtlMinutes = (this.config.cacheDurationMinutes as number) ?? 30;
		const preferSynced = (this.config.preferSyncedLyrics as boolean) ?? true;

		if (this._cache) {
			this._cache.setTtl(cacheTtlMinutes * 60 * 1000);
		}

		if (this._orchestrator) {
			this._orchestrator.setPreferSyncedLyrics(preferSynced);
		}

		this.logger.debug('Lyrics plugin config updated');
		return ok(undefined);
	}

	// ActionsProvider implementation
	canHandleAction(actionId: string): boolean {
		return HANDLED_ACTION_IDS.has(actionId);
	}

	async getActionsForTrack(context: TrackActionContext): Promise<TrackAction[]> {
		return getLyricsActions(context);
	}

	async executeAction(actionId: string, context: TrackActionContext): Promise<TrackActionResult> {
		if (!this.canHandleAction(actionId)) {
			return { handled: false };
		}
		return executeLyricsAction(actionId, context);
	}

	// Lyrics provider management
	registerProvider(provider: LyricsProvider): void {
		this._orchestrator?.registerProvider(provider);
	}

	unregisterProvider(providerId: string): void {
		this._orchestrator?.unregisterProvider(providerId);
	}

	getProvider(providerId: string): LyricsProvider | undefined {
		return this._orchestrator?.getProvider(providerId);
	}

	getProviders(): LyricsProvider[] {
		return this._orchestrator?.getProviders() ?? [];
	}

	// Public API for getting lyrics
	async getLyrics(track: Track): Promise<Lyrics | null> {
		if (!this._orchestrator) {
			return null;
		}

		const result = await this._orchestrator.getLyrics(track);
		return result.success ? result.data : null;
	}

	clearCache(): void {
		this._orchestrator?.clearCache();
	}

	getCacheStats(): { size: number; ttlMs: number } {
		return this._cache?.getStats() ?? { size: 0, ttlMs: DEFAULT_CACHE_TTL_MS };
	}

	private _subscribeToEvents(): void {
		const globalEventBus = getPluginRegistry().getEventBus();

		this._unsubscribeRequest = globalEventBus.on<TrackActionsRequestEvent>(
			TRACK_ACTION_EVENTS.REQUEST_ACTIONS,
			async (event) => {
				const actions = await this.getActionsForTrack({
					track: event.track,
					source: event.source,
				});

				const response: TrackActionsResponseEvent = {
					requestId: event.requestId,
					actions: actions.map((action) => ({
						...action,
						sourcePlugin: PLUGIN_MANIFEST.id,
					})),
				};

				globalEventBus.emit(TRACK_ACTION_EVENTS.RESPOND_ACTIONS, response);
			}
		);

		this._unsubscribeExecute = globalEventBus.on<TrackActionExecuteRequestEvent>(
			TRACK_ACTION_EVENTS.EXECUTE_ACTION_REQUEST,
			async (event) => {
				if (!this.canHandleAction(event.actionId)) {
					return;
				}

				const result = await this.executeAction(event.actionId, {
					track: event.track,
					source: event.source,
				});

				const response: TrackActionExecuteResponseEvent = {
					requestId: event.requestId,
					result,
				};

				globalEventBus.emit(TRACK_ACTION_EVENTS.EXECUTE_ACTION_RESPONSE, response);
			}
		);
	}

	private _unsubscribeFromEvents(): void {
		this._unsubscribeRequest?.();
		this._unsubscribeExecute?.();
		this._unsubscribeRequest = undefined;
		this._unsubscribeExecute = undefined;
	}
}

export function createLyricsPlugin(): LyricsPlugin {
	return new LyricsPlugin();
}

// Singleton instance for service access
let _pluginInstance: LyricsPlugin | null = null;

export function getLyricsPlugin(): LyricsPlugin | null {
	return _pluginInstance;
}

export function setLyricsPluginInstance(plugin: LyricsPlugin): void {
	_pluginInstance = plugin;
}
