/**
 * Spotify Login WebView Component
 *
 * Opens the Spotify OAuth authorize page (with PKCE) in a WebView.
 * Intercepts the redirect to the custom URI scheme to extract the authorization code.
 */

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { OAuthLoginWebView, type OAuthLoginConfig, type WebViewNavigation } from '@shared/auth';
import { SPOTIFY_OAUTH_REDIRECT_URI, getSpotifyAuthManager } from '@/src/hooks/use-spotify-auth';
import { getLogger } from '@shared/services/logger';

const logger = getLogger('SpotifyLogin');

export type { WebViewNavigation };

interface SpotifyLoginWebViewProps {
	readonly onSuccess: (authCode: string) => void;
	readonly onCancel: () => void;
	readonly onNavigate?: (navState: WebViewNavigation) => void;
}

export const SpotifyLoginWebView = memo(function SpotifyLoginWebView({
	onSuccess,
	onCancel,
	onNavigate,
}: SpotifyLoginWebViewProps) {
	const [authUrl, setAuthUrl] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		const loadAuthUrl = async () => {
			const authManager = getSpotifyAuthManager();
			if (!authManager) {
				logger.error('Spotify auth manager not available');
				onCancel();
				return;
			}

			const url = await authManager.generateAuthUrl();
			if (!cancelled) {
				setAuthUrl(url);
			}
		};

		void loadAuthUrl();

		return () => {
			cancelled = true;
		};
	}, [onCancel]);

	const handleRedirect = useCallback(
		(callbackUrl: string) => {
			try {
				const url = new URL(callbackUrl);
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
			} catch (e) {
				logger.error('Failed to parse callback URL', e instanceof Error ? e : undefined);
				onCancel();
			}
		},
		[onSuccess, onCancel]
	);

	const checkCookies = useCallback(async (): Promise<string | null> => {
		return null;
	}, []);

	const isLoginPage = useCallback((url: string): boolean => {
		return (
			url.includes('/login') ||
			url.includes('/authorize') ||
			url.includes('challenge.spotify.com')
		);
	}, []);

	const isSuccessDomain = useCallback((_url: string): boolean => {
		return false;
	}, []);

	const config: OAuthLoginConfig | null = useMemo(() => {
		if (!authUrl) return null;
		return {
			loginUrl: authUrl,
			title: 'Sign in to Spotify',
			loadingText: 'Loading Spotify...',
			pollingText: 'Completing sign in...',
			checkCookies,
			isLoginPage,
			isSuccessDomain,
			redirectUri: SPOTIFY_OAUTH_REDIRECT_URI,
		};
	}, [authUrl, checkCookies, isLoginPage, isSuccessDomain]);

	if (!config) {
		return (
			<View style={styles.loading}>
				<ActivityIndicator size={'large'} />
			</View>
		);
	}

	return (
		<OAuthLoginWebView
			config={config}
			onSuccess={handleRedirect}
			onCancel={onCancel}
			onNavigate={onNavigate}
		/>
	);
});

const styles = StyleSheet.create({
	loading: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
});
