import type { Result } from '../../../shared/types/result';
import type { PluginManifest as BasePluginManifest } from './plugin';

/**
 * Plugin lifecycle status
 */
export type PluginStatus =
  | 'uninitialized' // Plugin has been registered but not initialized
  | 'initializing'  // Plugin is currently initializing
  | 'ready'         // Plugin is initialized and ready
  | 'active'        // Plugin is active and handling requests
  | 'error'         // Plugin encountered an error
  | 'disabled';     // Plugin is disabled

/**
 * Plugin category for organization
 */
export type PluginCategory =
  | 'metadata-provider'      // Provides track/album/artist metadata
  | 'audio-source-provider'  // Provides audio stream URLs
  | 'playback-provider'      // Handles audio playback
  | 'sync-provider'          // Synchronizes data across devices
  | 'lyrics-provider'        // Provides lyrics
  | 'recommendation'         // Provides recommendations
  | 'visualizer';            // Provides audio visualizations

/**
 * Plugin capabilities flags
 */
export interface PluginCapabilities {
  /** Plugin can search for tracks */
  readonly canSearch?: boolean;
  /** Plugin can stream audio */
  readonly canStream?: boolean;
  /** Plugin can download for offline */
  readonly canDownload?: boolean;
  /** Plugin supports user authentication */
  readonly requiresAuth?: boolean;
  /** Plugin supports caching */
  readonly supportsCaching?: boolean;
  /** Plugin supports batch operations */
  readonly supportsBatch?: boolean;
}

/**
 * Extended plugin manifest with additional metadata
 */
export interface ExtendedPluginManifest extends BasePluginManifest {
  /** Plugin category */
  readonly category: PluginCategory;
  /** Plugin capabilities (detailed) */
  readonly capabilitiesDetail?: PluginCapabilities;
  /** Required plugin dependencies (plugin IDs) */
  readonly dependencies?: string[];
  /** Plugin homepage or repository URL */
  readonly homepage?: string;
  /** Plugin icon URL or data URI */
  readonly icon?: string;
}

/**
 * Re-export PluginManifest as ExtendedPluginManifest for consistency
 */
export type PluginManifest = ExtendedPluginManifest;

/**
 * Plugin configuration schema
 */
export interface PluginConfigSchema {
  /** Configuration key */
  readonly key: string;
  /** Configuration type */
  readonly type: 'string' | 'number' | 'boolean' | 'select';
  /** Configuration label for UI */
  readonly label: string;
  /** Configuration description */
  readonly description?: string;
  /** Default value */
  readonly defaultValue?: unknown;
  /** Required configuration */
  readonly required?: boolean;
  /** Possible values for select type */
  readonly options?: Array<{ label: string; value: unknown }>;
  /** Validation pattern (for strings) */
  readonly pattern?: string;
  /** Minimum value (for numbers) */
  readonly min?: number;
  /** Maximum value (for numbers) */
  readonly max?: number;
}

/**
 * Plugin configuration values
 */
export type PluginConfig = Record<string, unknown>;

/**
 * Logger interface for plugins
 */
export interface PluginLogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, error?: Error, ...args: unknown[]): void;
}

/**
 * Event bus interface for plugins
 */
export interface PluginEventBus {
  /** Emit an event */
  emit<T = unknown>(event: string, data: T): void;
  /** Listen to an event */
  on<T = unknown>(event: string, handler: (data: T) => void): () => void;
  /** Listen to an event once */
  once<T = unknown>(event: string, handler: (data: T) => void): () => void;
  /** Remove event listener */
  off(event: string, handler: (data: unknown) => void): void;
}

/**
 * Plugin dependencies injected by the plugin system
 */
export interface PluginDependencies {
  /** Event bus for plugin communication */
  readonly eventBus: PluginEventBus;
  /** Plugin configuration */
  readonly config: PluginConfig;
  /** Logger instance */
  readonly logger: PluginLogger;
}

/**
 * Plugin initialization context
 */
export interface PluginInitContext extends PluginDependencies {
  /** Plugin manifest */
  readonly manifest: PluginManifest;
  /** Data directory for plugin storage */
  readonly dataDir?: string;
  /** Cache directory for plugin caching */
  readonly cacheDir?: string;
}

/**
 * Base plugin interface that all plugins must implement
 */
export interface BasePlugin {
  /** Plugin manifest */
  readonly manifest: PluginManifest;

  /** Current plugin status */
  readonly status: PluginStatus;

  /** Configuration schema for this plugin */
  readonly configSchema: PluginConfigSchema[];

  /**
   * Initialize the plugin
   * Called once when the plugin is first loaded
   */
  onInit(context: PluginInitContext): Promise<Result<void, Error>>;

  /**
   * Activate the plugin
   * Called when the plugin becomes the active provider
   */
  onActivate?(): Promise<Result<void, Error>>;

  /**
   * Deactivate the plugin
   * Called when the plugin is no longer the active provider
   */
  onDeactivate?(): Promise<Result<void, Error>>;

  /**
   * Destroy the plugin
   * Called when the plugin is being removed or app is shutting down
   * Should clean up all resources
   */
  onDestroy(): Promise<Result<void, Error>>;

  /**
   * Update plugin configuration
   * Called when configuration changes
   */
  onConfigUpdate?(config: PluginConfig): Promise<Result<void, Error>>;

  /**
   * Health check for the plugin
   * Used to verify the plugin is functioning correctly
   */
  healthCheck?(): Promise<Result<boolean, Error>>;
}

/**
 * Abstract base class for plugins with common functionality
 */
export abstract class AbstractBasePlugin implements BasePlugin {
  public status: PluginStatus = 'uninitialized';
  protected dependencies?: PluginDependencies;

  constructor(
    public readonly manifest: PluginManifest,
    public readonly configSchema: PluginConfigSchema[] = []
  ) {}

  /**
   * Get the logger instance
   */
  protected get logger(): PluginLogger {
    if (!this.dependencies) {
      throw new Error('Plugin not initialized. Call onInit first.');
    }
    return this.dependencies.logger;
  }

  /**
   * Get the event bus
   */
  protected get eventBus(): PluginEventBus {
    if (!this.dependencies) {
      throw new Error('Plugin not initialized. Call onInit first.');
    }
    return this.dependencies.eventBus;
  }

  /**
   * Get the plugin configuration
   */
  protected get config(): PluginConfig {
    if (!this.dependencies) {
      throw new Error('Plugin not initialized. Call onInit first.');
    }
    return this.dependencies.config;
  }

  /**
   * Emit a plugin event
   */
  protected emitEvent<T>(event: string, data: T): void {
    this.eventBus.emit(`plugin:${this.manifest.id}:${event}`, data);
  }

  /**
   * Initialize the plugin
   */
  abstract onInit(context: PluginInitContext): Promise<Result<void, Error>>;

  /**
   * Destroy the plugin
   */
  abstract onDestroy(): Promise<Result<void, Error>>;

  /**
   * Health check implementation
   */
  async healthCheck(): Promise<Result<boolean, Error>> {
    return { success: true, data: this.status === 'ready' || this.status === 'active' };
  }
}
