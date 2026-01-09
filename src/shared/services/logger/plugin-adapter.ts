/**
 * Adapter to create PluginLogger instances from Logger service
 */

import type { PluginLogger } from '@plugins/core/interfaces/base-plugin';
import { LoggerService } from './logger-service';

/**
 * Creates a PluginLogger instance for use in plugins
 */
export function createPluginLogger(pluginId: string): PluginLogger {
  const logger = new LoggerService(pluginId);

  return {
    debug: (message, ...args) => logger.debug(message, ...args),
    info: (message, ...args) => logger.info(message, ...args),
    warn: (message, ...args) => logger.warn(message, ...args),
    error: (message, error, ...args) => logger.error(message, error, ...args),
  };
}
