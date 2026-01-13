import type { Track } from '@domain/entities/track';
import type {
	TrackAction,
	TrackActionContext,
	TrackActionSource,
} from '@domain/actions/track-action';
import { ACTION_GROUP_ORDER } from '@domain/actions/track-action';
import type {
	TrackActionsRequestEvent,
	TrackActionsResponseEvent,
	TrackActionResult,
	TrackActionExecuteRequestEvent,
	TrackActionExecuteResponseEvent,
} from '../events/track-action-events';
import { TRACK_ACTION_EVENTS } from '../events/track-action-events';
import { getPluginRegistry } from '../../plugins/core/registry/plugin-registry';

const PLUGIN_RESPONSE_TIMEOUT_MS = 100;

export class TrackActionsService {
	async getActionsForTrack(context: TrackActionContext): Promise<TrackAction[]> {
		const { track, source } = context;
		const pluginActions = await this._getPluginActions(track, source);
		return this._sortActions(pluginActions);
	}

	async executeAction(actionId: string, context: TrackActionContext): Promise<TrackActionResult> {
		return this._executeViaPlugins(actionId, context);
	}

	private async _executeViaPlugins(
		actionId: string,
		context: TrackActionContext
	): Promise<TrackActionResult> {
		const eventBus = getPluginRegistry().getEventBus();
		const requestId = `exec-${Date.now()}-${Math.random().toString(36).slice(2)}`;

		let result: TrackActionResult = { handled: false };

		const unsubscribe = eventBus.on<TrackActionExecuteResponseEvent>(
			TRACK_ACTION_EVENTS.EXECUTE_ACTION_RESPONSE,
			(event) => {
				if (event.requestId === requestId && event.result.handled) {
					result = event.result;
				}
			}
		);

		const request: TrackActionExecuteRequestEvent = {
			requestId,
			actionId,
			track: context.track,
			source: context.source,
			playlistId: context.playlistId,
			trackPosition: context.trackPosition,
		};

		eventBus.emit(TRACK_ACTION_EVENTS.EXECUTE_ACTION_REQUEST, request);

		await new Promise((resolve) => setTimeout(resolve, PLUGIN_RESPONSE_TIMEOUT_MS));

		unsubscribe();

		return result;
	}

	private async _getPluginActions(
		track: Track,
		source: TrackActionSource
	): Promise<TrackAction[]> {
		const eventBus = getPluginRegistry().getEventBus();
		const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

		const pluginActions: TrackAction[] = [];

		const unsubscribe = eventBus.on<TrackActionsResponseEvent>(
			TRACK_ACTION_EVENTS.RESPOND_ACTIONS,
			(event) => {
				if (event.requestId === requestId) {
					pluginActions.push(...event.actions);
				}
			}
		);

		const request: TrackActionsRequestEvent = { track, source, requestId };
		eventBus.emit(TRACK_ACTION_EVENTS.REQUEST_ACTIONS, request);

		await new Promise((resolve) => setTimeout(resolve, PLUGIN_RESPONSE_TIMEOUT_MS));

		unsubscribe();

		return pluginActions;
	}

	private _sortActions(actions: TrackAction[]): TrackAction[] {
		return actions.sort((a, b) => {
			const groupIndexA = ACTION_GROUP_ORDER.indexOf(a.group);
			const groupIndexB = ACTION_GROUP_ORDER.indexOf(b.group);
			const groupDiff = groupIndexA - groupIndexB;

			if (groupDiff !== 0) return groupDiff;
			return b.priority - a.priority;
		});
	}
}

export const trackActionsService = new TrackActionsService();
