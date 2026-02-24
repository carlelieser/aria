import type { BasePlugin } from './base-plugin';
import type { OAuthCapablePlugin as SharedOAuthCapable } from '@shared/types/oauth-capable-plugin';
import { isOAuthCapable as sharedIsOAuthCapable } from '@shared/types/oauth-capable-plugin';

/**
 * Interface for plugins that support OAuth-based authentication.
 * Extends BasePlugin with OAuth credential management.
 */
export interface OAuthCapablePlugin extends BasePlugin, SharedOAuthCapable {}

// Re-export the shared type check for backward compatibility
export function isOAuthCapable(plugin: BasePlugin): plugin is OAuthCapablePlugin {
	return sharedIsOAuthCapable(plugin);
}
