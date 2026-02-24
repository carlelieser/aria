import type { Result } from '@shared/types/result';
import { ok, err, isErr } from '@shared/types/result';
import type {
	BasePlugin,
	PluginStatus,
	PluginInitContext,
	PluginConfig,
} from '../interfaces/base-plugin';
import type { MetadataProvider } from '../interfaces/metadata-provider';
import type { AudioSourceProvider } from '../interfaces/audio-source-provider';
import type { PlaybackProvider } from '../interfaces/playback-provider';
import type { SyncProvider } from '../interfaces/sync-provider';
import { EventBus } from '../events/event-bus';
import { createPluginLogger, getLogger } from '@shared/services/logger';
import {
	createProviderAccessor,
	type ProviderAccessor,
	type ProviderRegistryInterface,
} from './provider-registry-helper';
import { PROVIDER_CONFIGS } from './provider-configs';

const logger = getLogger('PluginRegistry');

export interface PluginRegistration {
	readonly plugin: BasePlugin;
	readonly priority?: number;
	readonly autoActivate?: boolean;
	readonly config?: PluginConfig;
}

interface RegisteredPlugin {
	readonly plugin: BasePlugin;
	readonly priority: number;
	readonly autoActivate: boolean;
	readonly config: PluginConfig;
	readonly registeredAt: number;
}

export type PluginRegistryEvent =
	| { type: 'plugin-registered'; pluginId: string }
	| { type: 'plugin-unregistered'; pluginId: string }
	| { type: 'plugin-initialized'; pluginId: string }
	| { type: 'plugin-activated'; pluginId: string; category: string }
	| { type: 'plugin-deactivated'; pluginId: string; category: string }
	| { type: 'plugin-error'; pluginId: string; error: Error };

export class PluginRegistry implements ProviderRegistryInterface {
	private static _instance: PluginRegistry | null = null;

	private _plugins = new Map<string, RegisteredPlugin>();
	private _activeProviders = new Map<string, Set<string>>();
	private _eventBus: EventBus;

	private readonly _metadata: ProviderAccessor<MetadataProvider>;
	private readonly _playback: ProviderAccessor<PlaybackProvider>;
	private readonly _sync: ProviderAccessor<SyncProvider>;
	private readonly _audioSource: ProviderAccessor<AudioSourceProvider>;

	private constructor() {
		this._eventBus = new EventBus();
		this._metadata = createProviderAccessor(this, PROVIDER_CONFIGS.metadata);
		this._playback = createProviderAccessor(this, PROVIDER_CONFIGS.playback);
		this._sync = createProviderAccessor(this, PROVIDER_CONFIGS.sync);
		this._audioSource = createProviderAccessor(this, PROVIDER_CONFIGS.audioSource);
	}

	static getInstance(): PluginRegistry {
		if (!PluginRegistry._instance) {
			PluginRegistry._instance = new PluginRegistry();
		}
		return PluginRegistry._instance;
	}

	static resetInstance(): void {
		if (PluginRegistry._instance) {
			PluginRegistry._instance.dispose();
			PluginRegistry._instance = null;
		}
	}

	register(registration: PluginRegistration): Result<void, Error> {
		const { plugin, priority = 0, autoActivate = false, config = {} } = registration;
		const pluginId = plugin.manifest.id;

		if (this._plugins.has(pluginId)) {
			return err(new Error(`Plugin "${pluginId}" is already registered`));
		}

		if (!plugin.manifest.id || !plugin.manifest.name) {
			return err(new Error('Plugin manifest must have id and name'));
		}

		this._plugins.set(pluginId, {
			plugin,
			priority,
			autoActivate,
			config,
			registeredAt: Date.now(),
		});

		this._emitEvent({ type: 'plugin-registered', pluginId });
		return ok(undefined);
	}

	async unregister(pluginId: string): Promise<Result<void, Error>> {
		const registered = this._plugins.get(pluginId);
		if (!registered) {
			return err(new Error(`Plugin "${pluginId}" is not registered`));
		}

		if (this.isActive(pluginId)) {
			const result = await this.deactivate(pluginId);
			if (!result.success) return result;
		}

		const destroyResult = await registered.plugin.onDestroy();
		if (isErr(destroyResult)) {
			return err(
				new Error(`Failed to destroy plugin "${pluginId}": ${destroyResult.error.message}`)
			);
		}

		this._plugins.delete(pluginId);
		this._emitEvent({ type: 'plugin-unregistered', pluginId });
		return ok(undefined);
	}

	async initialize(pluginId: string): Promise<Result<void, Error>> {
		const registered = this._plugins.get(pluginId);
		if (!registered) {
			return err(new Error(`Plugin "${pluginId}" is not registered`));
		}

		const { plugin, config } = registered;
		// Skip if already initialized/active, but allow re-initialization if disabled (hot reload)
		if (plugin.status !== 'uninitialized' && plugin.status !== 'disabled') {
			return ok(undefined);
		}

		const context: PluginInitContext = {
			manifest: plugin.manifest,
			eventBus: this._eventBus.scope(`plugin:${pluginId}`),
			config,
			logger: createPluginLogger(pluginId),
		};

		const result = await plugin.onInit(context);
		if (isErr(result)) {
			this._emitEvent({ type: 'plugin-error', pluginId, error: result.error });
			return result;
		}

		this._emitEvent({ type: 'plugin-initialized', pluginId });

		if (registered.autoActivate) {
			await this.activate(pluginId);
		}

		return ok(undefined);
	}

	async activate(pluginId: string): Promise<Result<void, Error>> {
		const registered = this._plugins.get(pluginId);
		if (!registered) {
			return err(new Error(`Plugin "${pluginId}" is not registered`));
		}

		const { plugin } = registered;
		const category = plugin.manifest.category;

		if (plugin.status === 'uninitialized') {
			const result = await this.initialize(pluginId);
			if (!result.success) return result;
		}

		if (plugin.onActivate) {
			const result = await plugin.onActivate();
			if (isErr(result)) {
				this._emitEvent({ type: 'plugin-error', pluginId, error: result.error });
				return result;
			}
		}

		const active = this._activeProviders.get(category) ?? new Set<string>();
		active.add(pluginId);
		this._activeProviders.set(category, active);
		this._emitEvent({ type: 'plugin-activated', pluginId, category });
		return ok(undefined);
	}

	async deactivate(pluginId: string): Promise<Result<void, Error>> {
		const registered = this._plugins.get(pluginId);
		if (!registered) {
			return err(new Error(`Plugin "${pluginId}" is not registered`));
		}

		const { plugin } = registered;
		const category = plugin.manifest.category;

		const active = this._activeProviders.get(category);
		if (!active?.has(pluginId)) {
			return ok(undefined);
		}

		if (plugin.onDeactivate) {
			const result = await plugin.onDeactivate();
			if (isErr(result)) {
				this._emitEvent({ type: 'plugin-error', pluginId, error: result.error });
				return result;
			}
		}

		active.delete(pluginId);
		if (active.size === 0) {
			this._activeProviders.delete(category);
		}
		this._emitEvent({ type: 'plugin-deactivated', pluginId, category });
		return ok(undefined);
	}

	getPlugin(pluginId: string): BasePlugin | undefined {
		return this._plugins.get(pluginId)?.plugin;
	}

	getAllPlugins(): BasePlugin[] {
		return Array.from(this._plugins.values()).map((r) => r.plugin);
	}

	getPluginsByCategory(category: string): BasePlugin[] {
		return Array.from(this._plugins.values())
			.filter((r) => r.plugin.manifest.category === category)
			.sort((a, b) => b.priority - a.priority)
			.map((r) => r.plugin);
	}

	getActivePluginsByCategory(category: string): BasePlugin[] {
		const active = this._activeProviders.get(category);
		if (!active || active.size === 0) return [];

		return Array.from(this._plugins.values())
			.filter(
				(r) => r.plugin.manifest.category === category && active.has(r.plugin.manifest.id)
			)
			.sort((a, b) => b.priority - a.priority)
			.map((r) => r.plugin);
	}

	getActiveProvider(category: string): BasePlugin | undefined {
		const active = this._activeProviders.get(category);
		if (!active || active.size === 0) return undefined;
		const firstId = active.values().next().value;
		return firstId ? this._plugins.get(firstId)?.plugin : undefined;
	}

	getActiveMetadataProvider(): MetadataProvider | undefined {
		return this._metadata.getActive();
	}

	getAllMetadataProviders(): MetadataProvider[] {
		return this._metadata.getAll();
	}

	getActiveMetadataProviders(): MetadataProvider[] {
		return this._metadata.getAllActive();
	}

	registerMetadataProvider(
		provider: MetadataProvider,
		options: Omit<PluginRegistration, 'plugin'> = {}
	): Promise<Result<void, Error>> {
		return this._metadata.register(provider, options);
	}

	getActivePlaybackProvider(): PlaybackProvider | undefined {
		return this._playback.getActive();
	}

	getAllPlaybackProviders(): PlaybackProvider[] {
		return this._playback.getAll();
	}

	getActivePlaybackProviders(): PlaybackProvider[] {
		return this._playback.getAllActive();
	}

	registerPlaybackProvider(
		provider: PlaybackProvider,
		options: Omit<PluginRegistration, 'plugin'> = {}
	): Promise<Result<void, Error>> {
		return this._playback.register(provider, options);
	}

	getActiveSyncProvider(): SyncProvider | undefined {
		return this._sync.getActive();
	}

	getAllSyncProviders(): SyncProvider[] {
		return this._sync.getAll();
	}

	registerSyncProvider(
		provider: SyncProvider,
		options: Omit<PluginRegistration, 'plugin'> = {}
	): Promise<Result<void, Error>> {
		return this._sync.register(provider, options);
	}

	getActiveAudioSourceProvider(): AudioSourceProvider | undefined {
		return this._audioSource.getActive();
	}

	getAllAudioSourceProviders(): AudioSourceProvider[] {
		return this._audioSource.getAll();
	}

	registerAudioSourceProvider(
		provider: AudioSourceProvider,
		options: Omit<PluginRegistration, 'plugin'> = {}
	): Promise<Result<void, Error>> {
		return this._audioSource.register(provider, options);
	}

	isActive(pluginId: string): boolean {
		const registered = this._plugins.get(pluginId);
		if (!registered) return false;
		const active = this._activeProviders.get(registered.plugin.manifest.category);
		return active?.has(pluginId) ?? false;
	}

	getStatus(pluginId: string): PluginStatus | undefined {
		return this._plugins.get(pluginId)?.plugin.status;
	}

	on(handler: (event: PluginRegistryEvent) => void): () => void {
		return this._eventBus.on('registry', handler);
	}

	getEventBus(): EventBus {
		return this._eventBus;
	}

	async dispose(): Promise<void> {
		for (const pluginId of Array.from(this._plugins.keys())) {
			try {
				await this.unregister(pluginId);
			} catch (error) {
				logger.error(
					`Error disposing plugin "${pluginId}"`,
					error instanceof Error ? error : undefined
				);
			}
		}
		this._plugins.clear();
		this._activeProviders.clear();
		this._eventBus.removeAllListeners();
	}

	private _emitEvent(event: PluginRegistryEvent): void {
		this._eventBus.emit<PluginRegistryEvent>('registry', event);
	}
}

export function getPluginRegistry(): PluginRegistry {
	return PluginRegistry.getInstance();
}
