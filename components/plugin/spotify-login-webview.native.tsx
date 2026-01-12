/**
 * Spotify Login WebView Component
 *
 * Displays a WebView for Spotify login and extracts the sp_dc cookie after authentication.
 * Uses native CookieManager to access HttpOnly cookies that JavaScript cannot read.
 */

import { memo, useCallback, useMemo } from 'react';
import CookieManager from '@react-native-cookies/cookies';
import {
	OAuthLoginWebView,
	type OAuthLoginConfig,
	type WebViewNavigation,
} from '@shared/auth';
import { SPOTIFY_LOGIN_URL } from '@/src/plugins/metadata/spotify/config';

export type { WebViewNavigation };

interface SpotifyLoginWebViewProps {
	onSuccess: (spDcCookie: string) => void;
	onCancel: () => void;
	onNavigate?: (navState: WebViewNavigation) => void;
}

export const SpotifyLoginWebView = memo(function SpotifyLoginWebView({
	onSuccess,
	onCancel,
	onNavigate,
}: SpotifyLoginWebViewProps) {
	const checkCookies = useCallback(async (): Promise<string | null> => {
		try {
			const cookies = await CookieManager.get('https://open.spotify.com');
			if (cookies.sp_dc?.value) {
				return cookies.sp_dc.value;
			}
		} catch {
			// Cookie access failed, continue polling
		}
		return null;
	}, []);

	const isLoginPage = useCallback((url: string): boolean => {
		return url.includes('/login') || url.includes('/authorize');
	}, []);

	const isSuccessDomain = useCallback((url: string): boolean => {
		return url.includes('spotify.com') || url.includes('spotify.net');
	}, []);

	const config: OAuthLoginConfig = useMemo(
		() => ({
			loginUrl: SPOTIFY_LOGIN_URL,
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
