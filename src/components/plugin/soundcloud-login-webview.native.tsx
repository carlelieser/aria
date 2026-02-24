/**
 * SoundCloud Login Component
 *
 * Opens the SoundCloud OAuth authorize page (with PKCE) in the system browser
 * via expo-web-browser. Intercepts the redirect to the custom URI scheme
 * to extract the authorization code.
 *
 * SoundCloud's OAuth 2.1 page opens Google/Facebook sign-in in popup windows
 * which WebViews cannot handle (see: github.com/soundcloud/api/issues/313).
 * Using the system browser (Chrome Custom Tab) supports popups natively.
 */

import { memo, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import {
	SOUNDCLOUD_OAUTH_REDIRECT_URI,
	getSoundCloudAuthManager,
} from '@/src/application/services/soundcloud-auth-facade';
import { getLogger } from '@shared/services/logger';

const logger = getLogger('SoundCloudLogin');

interface SoundCloudLoginWebViewProps {
	readonly onSuccess: (authCode: string) => void;
	readonly onCancel: () => void;
}

export const SoundCloudLoginWebView = memo(function SoundCloudLoginWebView({
	onSuccess,
	onCancel,
}: SoundCloudLoginWebViewProps) {
	useEffect(() => {
		let cancelled = false;

		const startAuth = async () => {
			try {
				const authManager = getSoundCloudAuthManager();
				if (!authManager) {
					logger.error('SoundCloud auth manager not available');
					onCancel();
					return;
				}

				const authUrl = await authManager.generateAuthUrl();

				const result = await WebBrowser.openAuthSessionAsync(
					authUrl,
					SOUNDCLOUD_OAUTH_REDIRECT_URI
				);

				if (cancelled) return;

				if (result.type === 'success' && result.url) {
					const url = new URL(result.url);
					const error = url.searchParams.get('error');

					if (error) {
						logger.error(`Authorization denied: ${error}`);
						onCancel();
						return;
					}

					const code = url.searchParams.get('code');
					if (!code) {
						logger.error('No authorization code in callback URL');
						onCancel();
						return;
					}

					onSuccess(code);
				} else {
					onCancel();
				}
			} catch (e) {
				logger.error('Auth flow failed', e instanceof Error ? e : undefined);
				if (!cancelled) {
					onCancel();
				}
			}
		};

		void startAuth();

		return () => {
			cancelled = true;
		};
	}, [onCancel, onSuccess]);

	return (
		<View style={styles.loading}>
			<ActivityIndicator size={'large'} />
		</View>
	);
});

const styles = StyleSheet.create({
	loading: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
});
