import type { BasePlugin, PluginManifest } from './base-plugin';
import type { TrackAction, TrackActionContext } from '../../../domain/actions/track-action';

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
	 * @returns true if the action was handled, false otherwise.
	 */
	executeAction(actionId: string, context: TrackActionContext): Promise<boolean>;

	/**
	 * Check if this provider can handle a given action ID.
	 */
	canHandleAction(actionId: string): boolean;
}

export function isActionsProvider(plugin: BasePlugin): plugin is ActionsProvider {
	return plugin.manifest.category === 'actions-provider';
}
