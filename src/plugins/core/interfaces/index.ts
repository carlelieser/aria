/**
 * Plugin interfaces barrel export
 */

// Export legacy plugin interface
export type { Plugin, PluginManifest as BasePluginManifest } from './plugin';

// Export enhanced plugin system
export * from './base-plugin';
export * from './metadata-provider';
export * from './audio-source-provider';
export * from './playback-provider';
export * from './sync-provider';
