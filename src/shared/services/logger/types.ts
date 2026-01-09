export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
	debug(message: string, ...args: unknown[]): void;
	info(message: string, ...args: unknown[]): void;
	warn(message: string, ...args: unknown[]): void;
	error(message: string, error?: Error, ...args: unknown[]): void;
}

export interface LoggerConfig {
	readonly minLevel?: LogLevel;

	readonly includeModule?: boolean;
}
