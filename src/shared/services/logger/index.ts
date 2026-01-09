/**
 * Logger service exports
 */

export * from './types';
export { LoggerService } from './logger-service';
export { createPluginLogger } from './plugin-adapter';

import { LoggerService } from './logger-service';
import type { Logger, LoggerConfig } from './types';

let globalConfig: LoggerConfig = {};

/**
 * Set global logger configuration
 */
export function configureLogger(config: LoggerConfig): void {
  globalConfig = config;
}

/**
 * Create a logger for a specific module
 */
export function getLogger(module: string): Logger {
  return new LoggerService(module, globalConfig);
}
