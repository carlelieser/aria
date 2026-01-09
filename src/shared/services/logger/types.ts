/**
 * Logger types and interfaces
 */

/**
 * Log levels ordered by severity
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger interface - compatible with PluginLogger
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, error?: Error, ...args: unknown[]): void;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /** Minimum log level to output (default: 'debug') */
  readonly minLevel?: LogLevel;
  /** Whether to include module prefix (default: true) */
  readonly includeModule?: boolean;
}
