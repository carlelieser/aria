export interface PluginManifest {
	readonly id: string;

	readonly name: string;

	readonly version: string;

	readonly description?: string;

	readonly capabilities: string[];

	readonly author?: string;
}

export interface Plugin {
	readonly manifest: PluginManifest;

	initialize(): Promise<void>;

	dispose(): Promise<void>;
}
