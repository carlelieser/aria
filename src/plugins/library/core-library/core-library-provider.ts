import type { Result } from '@shared/types/result';
import { ok } from '@shared/types/result';
import { AbstractBasePlugin, type PluginInitContext } from '../../core/interfaces/base-plugin';
import type { ActionsProvider } from '../../core/interfaces/actions-provider';
import type { TrackAction, TrackActionContext } from '../../../domain/actions/track-action';
import type {
	TrackActionsRequestEvent,
	TrackActionsResponseEvent,
	TrackActionResult,
	TrackActionExecuteRequestEvent,
	TrackActionExecuteResponseEvent,
} from '../../../application/events/track-action-events';
import { TRACK_ACTION_EVENTS } from '../../../application/events/track-action-events';
import { getPluginRegistry } from '../../core/registry/plugin-registry';
import { PLUGIN_MANIFEST, HANDLED_ACTION_IDS, CORE_ACTION_IDS } from './config';

import { getLibraryActions, executeLibraryAction } from './actions/library-actions';
import { getQueueActions, executeQueueAction } from './actions/queue-actions';
import { getFavoriteActions, executeFavoriteAction } from './actions/favorite-actions';
import { getPlaylistActions, executePlaylistAction } from './actions/playlist-actions';
import { getDownloadActions, executeDownloadAction } from './actions/download-actions';
import { getPlayerActions, executePlayerAction } from './actions/player-actions';
import { getNavigationActions, executeNavigationAction } from './actions/navigation-actions';

export class CoreLibraryProvider
	extends AbstractBasePlugin
	implements Omit<ActionsProvider, 'manifest'>
{
	private _unsubscribeRequest?: () => void;
	private _unsubscribeExecute?: () => void;

	constructor() {
		super(PLUGIN_MANIFEST, []);
	}

	async onInit(context: PluginInitContext): Promise<Result<void, Error>> {
		this.dependencies = context;
		this.status = 'ready';
		return ok(undefined);
	}

	async onActivate(): Promise<Result<void, Error>> {
		this.status = 'active';
		this._subscribeToEvents();
		this.logger.info('Core library actions provider activated');
		return ok(undefined);
	}

	async onDeactivate(): Promise<Result<void, Error>> {
		this._unsubscribeFromEvents();
		this.status = 'ready';
		return ok(undefined);
	}

	async onDestroy(): Promise<Result<void, Error>> {
		this._unsubscribeFromEvents();
		this.status = 'uninitialized';
		return ok(undefined);
	}

	canHandleAction(actionId: string): boolean {
		return HANDLED_ACTION_IDS.has(
			actionId as (typeof CORE_ACTION_IDS)[keyof typeof CORE_ACTION_IDS]
		);
	}

	async getActionsForTrack(context: TrackActionContext): Promise<TrackAction[]> {
		const actions: TrackAction[] = [];

		actions.push(...getLibraryActions(context));
		actions.push(...getQueueActions(context));
		actions.push(...getPlaylistActions(context));
		actions.push(...getFavoriteActions(context));
		actions.push(...getNavigationActions(context));
		actions.push(...getPlayerActions(context));
		actions.push(...getDownloadActions(context));

		return actions;
	}

	async executeAction(actionId: string, context: TrackActionContext): Promise<TrackActionResult> {
		if (!this.canHandleAction(actionId)) {
			return { handled: false };
		}

		const handlers = [
			executeLibraryAction,
			executeQueueAction,
			executePlaylistAction,
			executeFavoriteAction,
			executeNavigationAction,
			executePlayerAction,
			executeDownloadAction,
		];

		for (const handler of handlers) {
			const result = await handler(actionId, context);
			if (result.handled) return result;
		}

		return { handled: false };
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
					playlistId: event.playlistId,
					trackPosition: event.trackPosition,
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

export function createCoreLibraryProvider(): CoreLibraryProvider {
	return new CoreLibraryProvider();
}
