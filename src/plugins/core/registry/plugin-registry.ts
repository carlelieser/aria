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

/**
 * Plugin registration options
 */
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

/**
 * Plugin registry for managing all plugins
 */
export class PluginRegistry implements ProviderRegistryInterface {
  private static instance: PluginRegistry | null = null;

  private plugins = new Map<string, RegisteredPlugin>();
  private activeProviders = new Map<string, string>();
  private eventBus: EventBus;

  private readonly _metadata: ProviderAccessor<MetadataProvider>;
  private readonly _playback: ProviderAccessor<PlaybackProvider>;
  private readonly _sync: ProviderAccessor<SyncProvider>;
  private readonly _audioSource: ProviderAccessor<AudioSourceProvider>;

  private constructor() {
    this.eventBus = new EventBus();
    this._metadata = createProviderAccessor(this, PROVIDER_CONFIGS.metadata);
    this._playback = createProviderAccessor(this, PROVIDER_CONFIGS.playback);
    this._sync = createProviderAccessor(this, PROVIDER_CONFIGS.sync);
    this._audioSource = createProviderAccessor(this, PROVIDER_CONFIGS.audioSource);
  }

  static getInstance(): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry();
    }
    return PluginRegistry.instance;
  }

  static resetInstance(): void {
    if (PluginRegistry.instance) {
      PluginRegistry.instance.dispose();
      PluginRegistry.instance = null;
    }
  }

  register(registration: PluginRegistration): Result<void, Error> {
    const { plugin, priority = 0, autoActivate = false, config = {} } = registration;
    const pluginId = plugin.manifest.id;

    if (this.plugins.has(pluginId)) {
      return err(new Error(`Plugin "${pluginId}" is already registered`));
    }

    if (!plugin.manifest.id || !plugin.manifest.name) {
      return err(new Error('Plugin manifest must have id and name'));
    }

    this.plugins.set(pluginId, {
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
    const registered = this.plugins.get(pluginId);
    if (!registered) {
      return err(new Error(`Plugin "${pluginId}" is not registered`));
    }

    if (this.isActive(pluginId)) {
      const result = await this.deactivate(pluginId);
      if (!result.success) return result;
    }

    const destroyResult = await registered.plugin.onDestroy();
    if (isErr(destroyResult)) {
      return err(new Error(`Failed to destroy plugin "${pluginId}": ${destroyResult.error.message}`));
    }

    this.plugins.delete(pluginId);
    this._emitEvent({ type: 'plugin-unregistered', pluginId });
    return ok(undefined);
  }

  async initialize(pluginId: string): Promise<Result<void, Error>> {
    const registered = this.plugins.get(pluginId);
    if (!registered) {
      return err(new Error(`Plugin "${pluginId}" is not registered`));
    }

    const { plugin, config } = registered;
    if (plugin.status !== 'uninitialized') return ok(undefined);

    const context: PluginInitContext = {
      manifest: plugin.manifest,
      eventBus: this.eventBus.scope(`plugin:${pluginId}`),
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
    const registered = this.plugins.get(pluginId);
    if (!registered) {
      return err(new Error(`Plugin "${pluginId}" is not registered`));
    }

    const { plugin } = registered;
    const category = plugin.manifest.category;

    if (plugin.status === 'uninitialized') {
      const result = await this.initialize(pluginId);
      if (!result.success) return result;
    }

    const currentActive = this.activeProviders.get(category);
    if (currentActive && currentActive !== pluginId) {
      await this.deactivate(currentActive);
    }

    if (plugin.onActivate) {
      const result = await plugin.onActivate();
      if (isErr(result)) {
        this._emitEvent({ type: 'plugin-error', pluginId, error: result.error });
        return result;
      }
    }

    this.activeProviders.set(category, pluginId);
    this._emitEvent({ type: 'plugin-activated', pluginId, category });
    return ok(undefined);
  }

  async deactivate(pluginId: string): Promise<Result<void, Error>> {
    const registered = this.plugins.get(pluginId);
    if (!registered) {
      return err(new Error(`Plugin "${pluginId}" is not registered`));
    }

    const { plugin } = registered;
    const category = plugin.manifest.category;

    if (this.activeProviders.get(category) !== pluginId) {
      return ok(undefined);
    }

    if (plugin.onDeactivate) {
      const result = await plugin.onDeactivate();
      if (isErr(result)) {
        this._emitEvent({ type: 'plugin-error', pluginId, error: result.error });
        return result;
      }
    }

    this.activeProviders.delete(category);
    this._emitEvent({ type: 'plugin-deactivated', pluginId, category });
    return ok(undefined);
  }

  getPlugin(pluginId: string): BasePlugin | undefined {
    return this.plugins.get(pluginId)?.plugin;
  }

  getAllPlugins(): BasePlugin[] {
    return Array.from(this.plugins.values()).map(r => r.plugin);
  }

  getPluginsByCategory(category: string): BasePlugin[] {
    return Array.from(this.plugins.values())
      .filter(r => r.plugin.manifest.category === category)
      .sort((a, b) => b.priority - a.priority)
      .map(r => r.plugin);
  }

  getActiveProvider(category: string): BasePlugin | undefined {
    const pluginId = this.activeProviders.get(category);
    return pluginId ? this.plugins.get(pluginId)?.plugin : undefined;
  }

  // Typed provider accessors
  getActiveMetadataProvider(): MetadataProvider | undefined {
    return this._metadata.getActive();
  }

  getAllMetadataProviders(): MetadataProvider[] {
    return this._metadata.getAll();
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
    const registered = this.plugins.get(pluginId);
    if (!registered) return false;
    return this.activeProviders.get(registered.plugin.manifest.category) === pluginId;
  }

  getStatus(pluginId: string): PluginStatus | undefined {
    return this.plugins.get(pluginId)?.plugin.status;
  }

  on(handler: (event: PluginRegistryEvent) => void): () => void {
    return this.eventBus.on('registry', handler);
  }

  getEventBus(): EventBus {
    return this.eventBus;
  }

  async dispose(): Promise<void> {
    for (const pluginId of Array.from(this.plugins.keys())) {
      try {
        await this.unregister(pluginId);
      } catch (error) {
        logger.error(`Error disposing plugin "${pluginId}"`, error instanceof Error ? error : undefined);
      }
    }
    this.plugins.clear();
    this.activeProviders.clear();
    this.eventBus.removeAllListeners();
  }

  private _emitEvent(event: PluginRegistryEvent): void {
    this.eventBus.emit<PluginRegistryEvent>('registry', event);
  }
}

export function getPluginRegistry(): PluginRegistry {
  return PluginRegistry.getInstance();
}
