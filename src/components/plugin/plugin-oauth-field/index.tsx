/**
 * Plugin OAuth Field Component
 *
 * Handles OAuth authentication flow for plugins using a WebView-based login.
 * Fully generic -- uses OAuthCapablePlugin interface and login component registry.
 */

import { memo, useCallback, useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import * as LucideIcons from 'lucide-react-native';
import { LinkIcon, CheckCircleIcon, type LucideIcon } from 'lucide-react-native';
import { SettingsItem } from '@/src/components/settings/settings-item';
import { Button } from '@/src/components/ui/button';
import { getLoginWebView } from '@/src/components/plugin/login-webview-registry';
import { useAppTheme } from '@/lib/theme';
import { useOAuthPlugin } from '@/src/hooks/use-plugin-registry';
import { getPluginManifest } from '@/src/application/services/plugin-registry-facade';
import type { OAuthCapablePlugin } from '@shared/types/oauth-capable-plugin';
import type { PluginOAuthFieldProps } from './types';

const DEFAULT_OAUTH_ICON = LinkIcon;

export const PluginOAuthField = memo(function PluginOAuthField({
	schema,
	pluginId,
}: PluginOAuthFieldProps) {
	const { colors } = useAppTheme();
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [showLoginModal, setShowLoginModal] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { getOAuthPlugin } = useOAuthPlugin(pluginId);

	const manifest = useMemo(() => getPluginManifest(pluginId), [pluginId]);
	const pluginIconUrl = manifest?.iconUrl;

	const IconComponent = useMemo((): LucideIcon => {
		const iconName = schema.icon ? `${schema.icon}Icon` : null;
		if (iconName && iconName in LucideIcons) {
			// eslint-disable-next-line import/namespace
			return LucideIcons[iconName as keyof typeof LucideIcons] as LucideIcon;
		}
		return DEFAULT_OAUTH_ICON;
	}, [schema.icon]);

	const LoginComponent = useMemo(() => getLoginWebView(pluginId), [pluginId]);

	const getPlugin = useCallback((): OAuthCapablePlugin | null => {
		return getOAuthPlugin();
	}, [getOAuthPlugin]);

	useEffect(() => {
		let cancelled = false;

		const checkAuthStatus = async () => {
			const plugin = getPlugin();

			if (!plugin) {
				setIsLoading(false);
				return;
			}

			const authenticated = await plugin.checkAuthentication();

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
				const result = await plugin.setCredential(credential);

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

	const StatusIcon = isAuthenticated && !pluginIconUrl ? CheckCircleIcon : IconComponent;

	return (
		<View style={styles.container}>
			<SettingsItem
				icon={StatusIcon}
				iconUrl={pluginIconUrl}
				title={schema.label}
				subtitle={isAuthenticated ? 'Connected' : 'Not connected'}
				rightElement={
					isLoading ? (
						<ActivityIndicator size={'small'} color={colors.primary} />
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
				<Text variant={'bodySmall'} style={[styles.error, { color: colors.error }]}>
					{error}
				</Text>
			)}

			<Modal
				visible={showLoginModal}
				animationType={'slide'}
				presentationStyle={'fullScreen'}
				onRequestClose={handleLoginCancel}
			>
				{LoginComponent && (
					<LoginComponent onSuccess={handleLoginSuccess} onCancel={handleLoginCancel} />
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
