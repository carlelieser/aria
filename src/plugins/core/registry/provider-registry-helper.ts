/**
 * Generic provider registry helper for typed provider access
 */

import type { BasePlugin, PluginCategory } from '../interfaces/base-plugin';
import type { Result } from '@shared/types/result';

/**
 * Configuration for a provider type
 */
export interface ProviderConfig<T extends BasePlugin> {
  readonly category: PluginCategory;
  readonly typeGuard: (plugin: BasePlugin) => plugin is T;
}

/**
 * Provider accessor interface for typed access to providers
 */
export interface ProviderAccessor<T extends BasePlugin> {
  getActive(): T | undefined;
  getAll(): T[];
  register(
    provider: T,
    options?: { priority?: number; autoActivate?: boolean; config?: Record<string, unknown> }
  ): Promise<Result<void, Error>>;
}

/**
 * Registry interface required by the helper
 */
export interface ProviderRegistryInterface {
  getActiveProvider(category: string): BasePlugin | undefined;
  getPluginsByCategory(category: string): BasePlugin[];
  register(registration: {
    plugin: BasePlugin;
    priority?: number;
    autoActivate?: boolean;
    config?: Record<string, unknown>;
  }): Result<void, Error>;
  initialize(pluginId: string): Promise<Result<void, Error>>;
  activate(pluginId: string): Promise<Result<void, Error>>;
}

/**
 * Create a typed provider accessor for a specific provider type
 */
export function createProviderAccessor<T extends BasePlugin>(
  registry: ProviderRegistryInterface,
  config: ProviderConfig<T>
): ProviderAccessor<T> {
  return {
    getActive(): T | undefined {
      const provider = registry.getActiveProvider(config.category);
      if (provider && config.typeGuard(provider)) {
        return provider;
      }
      return undefined;
    },

    getAll(): T[] {
      return registry.getPluginsByCategory(config.category).filter(config.typeGuard);
    },

    async register(
      provider: T,
      options: { priority?: number; autoActivate?: boolean; config?: Record<string, unknown> } = {}
    ): Promise<Result<void, Error>> {
      const registerResult = registry.register({ plugin: provider, ...options });
      if (!registerResult.success) {
        return registerResult;
      }

      const initResult = await registry.initialize(provider.manifest.id);
      if (!initResult.success) {
        return initResult;
      }

      return registry.activate(provider.manifest.id);
    },
  };
}
