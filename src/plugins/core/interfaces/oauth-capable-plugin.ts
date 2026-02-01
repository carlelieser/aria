import type { Result } from '@shared/types/result';
import type { BasePlugin } from './base-plugin';

/**
 * Interface for plugins that support OAuth-based authentication.
 * Provides a unified API for credential management across all OAuth plugins.
 */
export interface OAuthCapablePlugin extends BasePlugin {
	isAuthenticated(): boolean;
	checkAuthentication(): Promise<boolean>;
	getLoginUrl(): string;
	setCredential(credential: string): Promise<Result<void, Error>>;
	logout(): Promise<Result<void, Error>>;
}

export function isOAuthCapable(plugin: BasePlugin): plugin is OAuthCapablePlugin {
	return (
		'setCredential' in plugin &&
		'checkAuthentication' in plugin &&
		'logout' in plugin &&
		typeof (plugin as OAuthCapablePlugin).setCredential === 'function'
	);
}
