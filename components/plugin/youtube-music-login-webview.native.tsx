/**
 * YouTube Music Login WebView Component
 *
 * Displays a WebView for Google login and extracts authentication cookies after login.
 * Uses native CookieManager to access HttpOnly cookies that JavaScript cannot read.
 */

import { memo, useCallback, useMemo } from 'react';
import CookieManager from '@react-native-cookies/cookies';
import {
	OAuthLoginWebView,
	type OAuthLoginConfig,
	type WebViewNavigation,
} from '@shared/auth';

export type { WebViewNavigation };

const YOUTUBE_MUSIC_LOGIN_URL =
	'https://accounts.google.com/ServiceLogin?service=youtube&continue=https://music.youtube.com';

const REQUIRED_COOKIES = ['SID', 'HSID', 'SSID', 'SAPISID'] as const;

interface YouTubeMusicLoginWebViewProps {
	onSuccess: (cookies: string) => void;
	onCancel: () => void;
	onNavigate?: (navState: WebViewNavigation) => void;
}

export const YouTubeMusicLoginWebView = memo(function YouTubeMusicLoginWebView({
	onSuccess,
	onCancel,
	onNavigate,
}: YouTubeMusicLoginWebViewProps) {
	const checkCookies = useCallback(async (): Promise<string | null> => {
		try {
			// Get cookies from both Google and YouTube domains
			const [googleCookies, youtubeCookies] = await Promise.all([
				CookieManager.get('https://www.google.com'),
				CookieManager.get('https://www.youtube.com'),
			]);

			// Merge cookies, preferring YouTube-specific ones
			const allCookies = { ...googleCookies, ...youtubeCookies };

			// Check if all required cookies are present
			const hasAllRequired = REQUIRED_COOKIES.every((name) => allCookies[name]?.value);

			if (!hasAllRequired) {
				return null;
			}

			// Format cookies as semicolon-separated string for youtubei.js
			return Object.entries(allCookies)
				.filter(([, data]) => data.value)
				.map(([name, data]) => `${name}=${data.value}`)
				.join('; ');
		} catch {
			// Cookie access failed, continue polling
		}
		return null;
	}, []);

	const isLoginPage = useCallback((url: string): boolean => {
		return (
			url.includes('accounts.google.com') ||
			url.includes('/signin') ||
			url.includes('/ServiceLogin')
		);
	}, []);

	const isSuccessDomain = useCallback((url: string): boolean => {
		return url.includes('music.youtube.com') || url.includes('youtube.com');
	}, []);

	const config: OAuthLoginConfig = useMemo(
		() => ({
			loginUrl: YOUTUBE_MUSIC_LOGIN_URL,
			title: 'Sign in to YouTube Music',
			loadingText: 'Loading Google...',
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
