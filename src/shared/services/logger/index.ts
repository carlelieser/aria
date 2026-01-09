export * from './types';
export { LoggerService } from './logger-service';
export { createPluginLogger } from './plugin-adapter';

import { LoggerService } from './logger-service';
import type { Logger, LoggerConfig } from './types';

let globalConfig: LoggerConfig = {};

export function configureLogger(config: LoggerConfig): void {
	globalConfig = config;
}

export function getLogger(module: string): Logger {
	return new LoggerService(module, globalConfig);
}
