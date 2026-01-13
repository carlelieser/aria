import type { BasePlugin, PluginManifest } from './base-plugin';
import type { TrackAction, TrackActionContext } from '../../../domain/actions/track-action';
import type { TrackActionResult } from '../../../application/events/track-action-events';

export type ActionsCapability = 'provide-track-actions' | 'execute-track-actions';

export interface ActionsProvider extends BasePlugin {
	readonly manifest: PluginManifest & {
		readonly category: 'actions-provider';
	};

	/**
	 * Get actions available for a given track context.
	 * Called when REQUEST_ACTIONS event is received.
	 */
	getActionsForTrack(context: TrackActionContext): Promise<TrackAction[]>;

	/**
	 * Execute an action this provider owns.
	 * @returns Result with feedback and navigation intents.
	 */
	executeAction(actionId: string, context: TrackActionContext): Promise<TrackActionResult>;

	/**
	 * Check if this provider can handle a given action ID.
	 */
	canHandleAction(actionId: string): boolean;
}

export function isActionsProvider(plugin: BasePlugin): plugin is ActionsProvider {
	return plugin.manifest.category === 'actions-provider';
}
