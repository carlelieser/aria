import type { BasePlugin, PluginCategory } from '../interfaces/base-plugin';
import type { Result } from '@shared/types/result';

export interface ProviderConfig<T extends BasePlugin> {
	readonly category: PluginCategory;
	readonly typeGuard: (plugin: BasePlugin) => plugin is T;
}

export interface ProviderAccessor<T extends BasePlugin> {
	getActive(): T | undefined;
	getAll(): T[];
	register(
		provider: T,
		options?: { priority?: number; autoActivate?: boolean; config?: Record<string, unknown> }
	): Promise<Result<void, Error>>;
}

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
			options: {
				priority?: number;
				autoActivate?: boolean;
				config?: Record<string, unknown>;
			} = {}
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
