import type { Result } from '@shared/types/result';
import type { PluginManifest as BasePluginManifest } from './plugin';

export type PluginStatus =
	| 'uninitialized'
	| 'initializing'
	| 'ready'
	| 'active'
	| 'error'
	| 'disabled';

export type PluginCategory =
	| 'metadata-provider'
	| 'audio-source-provider'
	| 'playback-provider'
	| 'sync-provider'
	| 'lyrics-provider'
	| 'recommendation'
	| 'visualizer'
	| 'actions-provider';

export interface PluginCapabilities {
	readonly canSearch?: boolean;

	readonly canStream?: boolean;

	readonly canDownload?: boolean;

	readonly requiresAuth?: boolean;

	readonly supportsCaching?: boolean;

	readonly supportsBatch?: boolean;
}

export interface ExtendedPluginManifest extends BasePluginManifest {
	readonly category: PluginCategory;

	readonly capabilitiesDetail?: PluginCapabilities;

	readonly dependencies?: string[];

	readonly homepage?: string;

	readonly icon?: string;
}

export type PluginManifest = ExtendedPluginManifest;

export interface PluginConfigSchema {
	readonly key: string;

	readonly type: 'string' | 'number' | 'boolean' | 'select' | 'folder-list' | 'oauth';

	readonly label: string;

	readonly description?: string;

	readonly defaultValue?: unknown;

	readonly required?: boolean;

	readonly options?: { label: string; value: unknown }[];

	readonly pattern?: string;

	readonly min?: number;

	readonly max?: number;

	readonly icon?: string;
}

export type PluginConfig = Record<string, unknown>;

export interface PluginLogger {
	debug(message: string, ...args: unknown[]): void;
	info(message: string, ...args: unknown[]): void;
	warn(message: string, ...args: unknown[]): void;
	error(message: string, error?: Error, ...args: unknown[]): void;
}

export interface PluginEventBus {
	emit<T = unknown>(event: string, data: T): void;

	on<T = unknown>(event: string, handler: (data: T) => void): () => void;

	once<T = unknown>(event: string, handler: (data: T) => void): () => void;

	off(event: string, handler: (data: unknown) => void): void;
}

export interface PluginDependencies {
	readonly eventBus: PluginEventBus;

	readonly config: PluginConfig;

	readonly logger: PluginLogger;
}

export interface PluginInitContext extends PluginDependencies {
	readonly manifest: PluginManifest;

	readonly dataDir?: string;

	readonly cacheDir?: string;
}

export interface BasePlugin {
	readonly manifest: PluginManifest;

	readonly status: PluginStatus;

	readonly configSchema: PluginConfigSchema[];

	onInit(context: PluginInitContext): Promise<Result<void, Error>>;

	onActivate?(): Promise<Result<void, Error>>;

	onDeactivate?(): Promise<Result<void, Error>>;

	onDestroy(): Promise<Result<void, Error>>;

	onConfigUpdate?(config: PluginConfig): Promise<Result<void, Error>>;

	healthCheck?(): Promise<Result<boolean, Error>>;
}

export abstract class AbstractBasePlugin implements BasePlugin {
	public status: PluginStatus = 'uninitialized';
	protected dependencies?: PluginDependencies;

	constructor(
		public readonly manifest: PluginManifest,
		public readonly configSchema: PluginConfigSchema[] = []
	) {}

	protected get logger(): PluginLogger {
		if (!this.dependencies) {
			throw new Error('Plugin not initialized. Call onInit first.');
		}
		return this.dependencies.logger;
	}

	protected get eventBus(): PluginEventBus {
		if (!this.dependencies) {
			throw new Error('Plugin not initialized. Call onInit first.');
		}
		return this.dependencies.eventBus;
	}

	protected get config(): PluginConfig {
		if (!this.dependencies) {
			throw new Error('Plugin not initialized. Call onInit first.');
		}
		return this.dependencies.config;
	}

	protected emitEvent<T>(event: string, data: T): void {
		this.eventBus.emit(`plugin:${this.manifest.id}:${event}`, data);
	}

	abstract onInit(context: PluginInitContext): Promise<Result<void, Error>>;

	abstract onDestroy(): Promise<Result<void, Error>>;

	async healthCheck(): Promise<Result<boolean, Error>> {
		return { success: true, data: this.status === 'ready' || this.status === 'active' };
	}
}
