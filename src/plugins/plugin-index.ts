/**
 * Plugin Index
 *
 * Central registry of all available plugins in the application.
 * This is the single source of truth for plugin discovery.
 *
 * To add a new plugin:
 * 1. Create a PluginModule in your plugin directory
 * 2. Add an entry to PLUGIN_ENTRIES below
 */

import type { PluginManifestEntry } from './core/interfaces/plugin-module';

// Import manifests statically for discovery (no code execution)
import { PLUGIN_MANIFEST as CORE_LIBRARY_MANIFEST } from './library/core-library/config';
import { PLUGIN_MANIFEST as YOUTUBE_MUSIC_MANIFEST } from './metadata/youtube-music/config';
import { PLUGIN_MANIFEST as SPOTIFY_MANIFEST } from './metadata/spotify/config';
import { PLUGIN_MANIFEST as LOCAL_LIBRARY_MANIFEST } from './metadata/local-library/config';
import { PLUGIN_MANIFEST as RNTP_MANIFEST } from './playback/react-native-track-player/config';
import { PLUGIN_MANIFEST as DASH_MANIFEST } from './playback/dash/config';

/**
 * All available plugin entries for registration
 *
 * Each entry contains:
 * - manifest: Static plugin metadata (loaded eagerly)
 * - load: Lazy loader function for the plugin module
 * - isBuiltIn: Whether this is a core plugin
 */
export const PLUGIN_ENTRIES: PluginManifestEntry[] = [
	// Core Actions Provider (always enabled, loaded first)
	{
		manifest: CORE_LIBRARY_MANIFEST,
		load: async () => {
			const { CoreLibraryPluginModule } =
				await import('./library/core-library/plugin-module');
			return CoreLibraryPluginModule;
		},
		isBuiltIn: true,
	},

	// Metadata Providers
	{
		manifest: YOUTUBE_MUSIC_MANIFEST,
		load: async () => {
			const { YouTubeMusicPluginModule } =
				await import('./metadata/youtube-music/plugin-module');
			return YouTubeMusicPluginModule;
		},
		isBuiltIn: true,
	},
	{
		manifest: SPOTIFY_MANIFEST,
		load: async () => {
			const { SpotifyPluginModule } = await import('./metadata/spotify/plugin-module');
			return SpotifyPluginModule;
		},
		isBuiltIn: false,
	},
	{
		manifest: LOCAL_LIBRARY_MANIFEST,
		load: async () => {
			const { LocalLibraryPluginModule } =
				await import('./metadata/local-library/plugin-module');
			return LocalLibraryPluginModule;
		},
		isBuiltIn: true,
	},

	// Playback Providers
	{
		manifest: RNTP_MANIFEST,
		load: async () => {
			const { RNTPPluginModule } =
				await import('./playback/react-native-track-player/plugin-module');
			return RNTPPluginModule;
		},
		isBuiltIn: true,
	},
	{
		manifest: DASH_MANIFEST,
		load: async () => {
			const { DashPlaybackPluginModule } = await import('./playback/dash/plugin-module');
			return DashPlaybackPluginModule;
		},
		isBuiltIn: true,
	},
];

/**
 * Get all plugin manifests (for UI display)
 */
export function getAllPluginManifests() {
	return PLUGIN_ENTRIES.map((entry) => entry.manifest);
}

/**
 * Get plugin manifests by category
 */
export function getPluginManifestsByCategory(category: string) {
	return PLUGIN_ENTRIES.filter((entry) => entry.manifest.category === category).map(
		(entry) => entry.manifest
	);
}

/**
 * Get built-in plugin manifests
 */
export function getBuiltInPluginManifests() {
	return PLUGIN_ENTRIES.filter((entry) => entry.isBuiltIn).map((entry) => entry.manifest);
}
