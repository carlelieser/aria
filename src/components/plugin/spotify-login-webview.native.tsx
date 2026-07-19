/**
 * Spotify Login WebView Component
 *
 * Opens the Spotify web login in a WebView and captures the `sp_dc` session
 * cookie after the user authenticates. `sp_dc` is the long-lived session cookie
 * the Spotify web player uses to mint short-lived access tokens; it is HttpOnly,
 * so it is read via the native CookieManager rather than page JavaScript.
 */

import { memo, useCallback, useMemo } from 'react';
import CookieManager from '@react-native-cookies/cookies';
import { OAuthLoginWebView, type OAuthLoginConfig, type WebViewNavigation } from '@shared/auth';

export type { WebViewNavigation };

const SPOTIFY_WEB_LOGIN_URL =
	'https://accounts.spotify.com/login?continue=https%3A%2F%2Fopen.spotify.com%2F';

const SESSION_COOKIE = 'sp_dc';

interface SpotifyLoginWebViewProps {
	readonly onSuccess: (spDcCookie: string) => void;
	readonly onCancel: () => void;
	readonly onNavigate?: (navState: WebViewNavigation) => void;
}

export const SpotifyLoginWebView = memo(function SpotifyLoginWebView({
	onSuccess,
	onCancel,
	onNavigate,
}: SpotifyLoginWebViewProps) {
	const checkCookies = useCallback(async (): Promise<string | null> => {
		try {
			const cookies = await CookieManager.get('https://open.spotify.com');
			const spDc = cookies[SESSION_COOKIE]?.value;
			return spDc ? spDc : null;
		} catch {
			// Cookie access failed, continue polling
			return null;
		}
	}, []);

	const isLoginPage = useCallback((url: string): boolean => {
		return (
			url.includes('accounts.spotify.com') ||
			url.includes('/login') ||
			url.includes('challenge.spotify.com')
		);
	}, []);

	const isSuccessDomain = useCallback((url: string): boolean => {
		return url.includes('open.spotify.com');
	}, []);

	const config: OAuthLoginConfig = useMemo(
		() => ({
			loginUrl: SPOTIFY_WEB_LOGIN_URL,
			title: 'Sign in to Spotify',
			loadingText: 'Loading Spotify...',
			pollingText: 'Completing sign in...',
			checkCookies,
			isLoginPage,
			isSuccessDomain,
		}),
		[checkCookies, isLoginPage, isSuccessDomain]
	);

	return (
		<OAuthLoginWebView
			config={config}
			onSuccess={onSuccess}
			onCancel={onCancel}
			onNavigate={onNavigate}
		/>
	);
});
