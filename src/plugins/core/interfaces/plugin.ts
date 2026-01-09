/**
 * Plugin manifest containing metadata about the plugin
 */
export interface PluginManifest {
  /** Unique identifier for the plugin (e.g., "expo-av", "youtube-music") */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** Plugin version */
  readonly version: string;
  /** Plugin description */
  readonly description?: string;
  /** Plugin capabilities/features */
  readonly capabilities: string[];
  /** Plugin author */
  readonly author?: string;
}

/**
 * Base plugin interface
 * All plugins must implement this interface
 */
export interface Plugin {
  /** Plugin metadata */
  readonly manifest: PluginManifest;

  /**
   * Initialize the plugin
   * Called when the plugin is registered
   */
  initialize(): Promise<void>;

  /**
   * Clean up resources when the plugin is unloaded
   */
  dispose(): Promise<void>;
}
