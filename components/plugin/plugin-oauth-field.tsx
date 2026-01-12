/**
 * Plugin OAuth Field Component
 *
 * Handles OAuth authentication flow for plugins using a WebView-based login.
 */

import { memo, useCallback, useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import * as LucideIcons from 'lucide-react-native';
import { LinkIcon, CheckCircleIcon, type LucideIcon } from 'lucide-react-native';
import { SettingsItem } from '@/components/settings/settings-item';
import { Button } from '@/components/ui/button';
import { SpotifyLoginWebView } from '@/components/plugin/spotify-login-webview';
import { YouTubeMusicLoginWebView } from '@/components/plugin/youtube-music-login-webview';
import { useAppTheme } from '@/lib/theme';
import { PluginRegistry } from '@/src/plugins/core/registry/plugin-registry';
import type { SpotifyLibraryProvider } from '@/src/plugins/metadata/spotify';
import type { YouTubeMusicLibraryProvider } from '@/src/plugins/metadata/youtube-music';
import type { PluginConfigSchema } from '@/src/plugins/core/interfaces/base-plugin';

type OAuthCapablePlugin = SpotifyLibraryProvider | YouTubeMusicLibraryProvider;

const OAUTH_PLUGIN_IDS = ['spotify', 'youtube-music'] as const;

const DEFAULT_OAUTH_ICON = LinkIcon;

interface PluginOAuthFieldProps {
	schema: PluginConfigSchema;
	pluginId: string;
}

export const PluginOAuthField = memo(function PluginOAuthField({
	schema,
	pluginId,
}: PluginOAuthFieldProps) {
	const { colors } = useAppTheme();
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [showLoginModal, setShowLoginModal] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const IconComponent = useMemo((): LucideIcon => {
		const iconName = schema.icon ? `${schema.icon}Icon` : null;
		if (iconName && iconName in LucideIcons) {
			// eslint-disable-next-line import/namespace
			return LucideIcons[iconName as keyof typeof LucideIcons] as LucideIcon;
		}
		return DEFAULT_OAUTH_ICON;
	}, [schema.icon]);

	const getPlugin = useCallback((): OAuthCapablePlugin | null => {
		const registry = PluginRegistry.getInstance();
		const plugin = registry.getPlugin(pluginId);

		if (
			!plugin ||
			!OAUTH_PLUGIN_IDS.includes(plugin.manifest.id as (typeof OAUTH_PLUGIN_IDS)[number])
		) {
			return null;
		}

		return plugin as OAuthCapablePlugin;
	}, [pluginId]);

	useEffect(() => {
		let cancelled = false;

		const checkAuthStatus = async () => {
			const plugin = getPlugin();
			console.log(
				'[PluginOAuthField] plugin:',
				plugin?.manifest.id,
				'status:',
				plugin?.status
			);

			if (!plugin) {
				console.log('[PluginOAuthField] No plugin found');
				setIsLoading(false);
				return;
			}

			const authenticated = await plugin.checkAuthentication();
			console.log('[PluginOAuthField] authenticated:', authenticated);

			if (!cancelled) {
				setIsAuthenticated(authenticated);
				setIsLoading(false);
			}
		};

		void checkAuthStatus();

		return () => {
			cancelled = true;
		};
	}, [getPlugin]);

	const handleConnect = useCallback(() => {
		setError(null);
		setShowLoginModal(true);
	}, []);

	const handleLoginSuccess = useCallback(
		async (credential: string) => {
			setShowLoginModal(false);
			setIsLoading(true);
			setError(null);

			const plugin = getPlugin();
			if (!plugin) {
				setError('Plugin not available');
				setIsLoading(false);
				return;
			}

			try {
				let result;

				if (plugin.manifest.id === 'spotify') {
					result = await (plugin as SpotifyLibraryProvider).setSpDcCookie(credential);
				} else if (plugin.manifest.id === 'youtube-music') {
					result = await (plugin as YouTubeMusicLibraryProvider).setCookies(credential);
				} else {
					throw new Error('Unknown plugin type');
				}

				if (result.success) {
					setIsAuthenticated(true);
				} else {
					setError(result.error.message);
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Authentication failed');
			} finally {
				setIsLoading(false);
			}
		},
		[getPlugin]
	);

	const handleLoginCancel = useCallback(() => {
		setShowLoginModal(false);
	}, []);

	const handleDisconnect = useCallback(async () => {
		const plugin = getPlugin();
		if (!plugin) {
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const result = await plugin.logout();

			if (result.success) {
				setIsAuthenticated(false);
			} else {
				setError(result.error.message);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Logout failed');
		} finally {
			setIsLoading(false);
		}
	}, [getPlugin]);

	const StatusIcon = isAuthenticated ? CheckCircleIcon : IconComponent;

	return (
		<View style={styles.container}>
			<SettingsItem
				icon={StatusIcon}
				title={schema.label}
				subtitle={isAuthenticated ? 'Connected' : 'Not connected'}
				rightElement={
					isLoading ? (
						<ActivityIndicator size="small" color={colors.primary} />
					) : (
						<Button
							variant={isAuthenticated ? 'outline' : 'default'}
							onPress={isAuthenticated ? handleDisconnect : handleConnect}
						>
							{isAuthenticated ? 'Disconnect' : 'Connect'}
						</Button>
					)
				}
			/>
			{error && (
				<Text variant="bodySmall" style={[styles.error, { color: colors.error }]}>
					{error}
				</Text>
			)}

			<Modal
				visible={showLoginModal}
				animationType="slide"
				presentationStyle="fullScreen"
				onRequestClose={handleLoginCancel}
			>
				{pluginId === 'spotify' && (
					<SpotifyLoginWebView
						onSuccess={handleLoginSuccess}
						onCancel={handleLoginCancel}
					/>
				)}
				{pluginId === 'youtube-music' && (
					<YouTubeMusicLoginWebView
						onSuccess={handleLoginSuccess}
						onCancel={handleLoginCancel}
					/>
				)}
			</Modal>
		</View>
	);
});

const styles = StyleSheet.create({
	container: {
		marginBottom: 4,
	},
	error: {
		paddingHorizontal: 16,
		paddingBottom: 8,
	},
});
