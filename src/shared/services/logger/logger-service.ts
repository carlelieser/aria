import type { Logger, LoggerConfig, LogLevel } from './types';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

const DEFAULT_CONFIG: Required<LoggerConfig> = {
	minLevel: 'debug',
	includeModule: true,
};

export class LoggerService implements Logger {
	private readonly config: Required<LoggerConfig>;

	constructor(
		public readonly module: string,
		config: LoggerConfig = {}
	) {
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	debug(message: string, ...args: unknown[]): void {
		this._log('debug', message, undefined, args);
	}

	info(message: string, ...args: unknown[]): void {
		this._log('info', message, undefined, args);
	}

	warn(message: string, ...args: unknown[]): void {
		this._log('warn', message, undefined, args);
	}

	error(message: string, error?: Error, ...args: unknown[]): void {
		this._log('error', message, error, args);
	}

	private _log(
		level: LogLevel,
		message: string,
		error: Error | undefined,
		args: unknown[]
	): void {
		if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.config.minLevel]) {
			return;
		}

		const prefix = this.config.includeModule && this.module ? `[${this.module}]` : '';
		const consoleMethod = console[level] || console.log;

		if (error) {
			consoleMethod(prefix, message, ...args, error);
		} else if (prefix) {
			consoleMethod(prefix, message, ...args);
		} else {
			consoleMethod(message, ...args);
		}
	}
}
