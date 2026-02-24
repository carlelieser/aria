/**
 * OAuth-Capable Plugin Interface
 *
 * Shared interface for plugins supporting OAuth authentication.
 * Used by both plugin implementations and presentation-layer components.
 */

import type { Result } from './result';

export interface OAuthCapablePlugin {
	isAuthenticated(): boolean;
	checkAuthentication(): Promise<boolean>;
	getLoginUrl(): string;
	setCredential(credential: string): Promise<Result<void, Error>>;
	logout(): Promise<Result<void, Error>>;
}

export function isOAuthCapable(plugin: unknown): plugin is OAuthCapablePlugin {
	return (
		plugin !== null &&
		typeof plugin === 'object' &&
		'setCredential' in plugin &&
		'checkAuthentication' in plugin &&
		'logout' in plugin &&
		typeof (plugin as OAuthCapablePlugin).setCredential === 'function'
	);
}
