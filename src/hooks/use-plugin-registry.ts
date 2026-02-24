/**
 * usePluginRegistry Hook
 *
 * Presentation-layer bridge for accessing plugin registry operations.
 * Components use this hook; it delegates to the application-layer facade.
 */

import { useCallback, useMemo } from 'react';
import {
	getOAuthPlugin as _getOAuthPlugin,
	getTypedPlugin as _getTypedPlugin,
	getPluginConfigSchema,
	getPluginManifest,
	getAllPluginManifests,
	hasPluginCapability,
	triggerPluginImport as _triggerPluginImport,
	subscribeToPluginEvents,
	getPluginStatus,
	type PluginManifestInfo,
} from '@/src/application/services/plugin-registry-facade';
import type { OAuthCapablePlugin } from '@shared/types/oauth-capable-plugin';
import type { PluginConfigSchema } from '@shared/types/plugin-config-schema';
import type { PluginStatus } from '@shared/types/plugin-types';

export type { PluginManifestInfo };

export function usePluginInstance(pluginId: string) {
	const getConfigSchema = useCallback((): PluginConfigSchema[] => {
		return getPluginConfigSchema(pluginId);
	}, [pluginId]);

	const getStatus = useCallback((): PluginStatus | undefined => {
		return getPluginStatus(pluginId);
	}, [pluginId]);

	return { getConfigSchema, getStatus };
}

export function useOAuthPlugin(pluginId: string) {
	const getOAuthPlugin = useCallback((): OAuthCapablePlugin | null => {
		return _getOAuthPlugin(pluginId);
	}, [pluginId]);

	return { getOAuthPlugin };
}

export function usePluginManifest(pluginId: string): PluginManifestInfo | null {
	return useMemo(() => getPluginManifest(pluginId), [pluginId]);
}

export function usePluginManifests(): PluginManifestInfo[] {
	return useMemo(() => getAllPluginManifests(), []);
}

export function usePluginRegistrySubscription() {
	return { subscribe: subscribeToPluginEvents };
}

/**
 * Gets a typed plugin from the registry with a cast.
 * For use in hook callbacks.
 */
export function getTypedPlugin<T>(pluginId: string): T | null {
	return _getTypedPlugin<T>(pluginId);
}

export function getPluginHasImportCapability(pluginId: string): boolean {
	return hasPluginCapability(pluginId, 'library-import');
}

export async function triggerPluginImport(pluginId: string): Promise<void> {
	return _triggerPluginImport(pluginId);
}
