/**
 * Plugin core barrel export
 *
 * This module provides the core plugin system infrastructure including:
 * - Base plugin interfaces and abstractions
 * - Provider interfaces (metadata, playback, sync)
 * - Event bus for plugin communication
 * - Plugin registry for lifecycle management
 */

// Core interfaces
export * from './interfaces';

// Event system
export * from './events';

// Plugin registry
export * from './registry';
