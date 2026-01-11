/**
 * Spotify Login WebView Component
 *
 * Displays a WebView for Spotify login and extracts the sp_dc cookie after authentication.
 * Uses polling to reliably detect the cookie after successful login.
 */

import { memo, useCallback, useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text, ActivityIndicator, IconButton } from 'react-native-paper';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { XIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/lib/theme';
import { SPOTIFY_LOGIN_URL } from '@/src/plugins/metadata/spotify/config';

const COOKIE_CHECK_SCRIPT = `
(function() {
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {});

  if (cookies.sp_dc) {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'cookie_found',
      spDc: cookies.sp_dc
    }));
  } else {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'cookie_not_found'
    }));
  }
})();
true;
`;

const POLL_INTERVAL_MS = 500;
const POLL_TIMEOUT_MS = 30000;

interface SpotifyLoginWebViewProps {
	onSuccess: (spDcCookie: string) => void;
	onCancel: () => void;
}

export const SpotifyLoginWebView = memo(function SpotifyLoginWebView({
	onSuccess,
	onCancel,
}: SpotifyLoginWebViewProps) {
	const { colors } = useAppTheme();
	const insets = useSafeAreaInsets();
	const webViewRef = useRef<WebView>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isPolling, setIsPolling] = useState(false);
	const hasFoundCookie = useRef(false);
	const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const pollStartTimeRef = useRef<number | null>(null);

	const stopPolling = useCallback(() => {
		if (pollIntervalRef.current) {
			clearInterval(pollIntervalRef.current);
			pollIntervalRef.current = null;
		}
		setIsPolling(false);
		pollStartTimeRef.current = null;
	}, []);

	const startPolling = useCallback(() => {
		if (pollIntervalRef.current || hasFoundCookie.current) {
			return;
		}

		setIsPolling(true);
		pollStartTimeRef.current = Date.now();

		// Immediately check once
		webViewRef.current?.injectJavaScript(COOKIE_CHECK_SCRIPT);

		// Then poll at intervals
		pollIntervalRef.current = setInterval(() => {
			// Check for timeout
			if (
				pollStartTimeRef.current &&
				Date.now() - pollStartTimeRef.current > POLL_TIMEOUT_MS
			) {
				stopPolling();
				return;
			}

			// Stop if already found
			if (hasFoundCookie.current) {
				stopPolling();
				return;
			}

			webViewRef.current?.injectJavaScript(COOKIE_CHECK_SCRIPT);
		}, POLL_INTERVAL_MS);
	}, [stopPolling]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (pollIntervalRef.current) {
				clearInterval(pollIntervalRef.current);
			}
		};
	}, []);

	const handleNavigationStateChange = useCallback(
		(navState: WebViewNavigation) => {
			// Detect successful login by checking if we've navigated away from the login page
			const isOnLoginPage =
				navState.url.includes('/login') || navState.url.includes('/authorize');
			const isOnSpotifyDomain =
				navState.url.includes('spotify.com') || navState.url.includes('spotify.net');

			// Start polling when we detect navigation away from login to a Spotify page
			if (isOnSpotifyDomain && !isOnLoginPage && !hasFoundCookie.current) {
				startPolling();
			}
		},
		[startPolling]
	);

	const handleMessage = useCallback(
		(event: { nativeEvent: { data: string } }) => {
			try {
				const data = JSON.parse(event.nativeEvent.data);

				if (data.type === 'cookie_found' && data.spDc && !hasFoundCookie.current) {
					hasFoundCookie.current = true;
					stopPolling();
					onSuccess(data.spDc);
				}
				// cookie_not_found is expected during polling, we just continue
			} catch {
				// Ignore parsing errors
			}
		},
		[onSuccess, stopPolling]
	);

	const handleLoadEnd = useCallback(() => {
		setIsLoading(false);
	}, []);

	const handleCancel = useCallback(() => {
		stopPolling();
		onCancel();
	}, [onCancel, stopPolling]);

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<View
				style={[
					styles.header,
					{
						paddingTop: insets.top,
						backgroundColor: colors.surfaceContainer,
						borderBottomColor: colors.outlineVariant,
					},
				]}
			>
				<IconButton
					icon={() => <XIcon size={24} color={colors.onSurface} />}
					onPress={handleCancel}
					accessibilityLabel="Close"
				/>
				<Text
					variant="titleMedium"
					style={[styles.title, { color: colors.onSurface }]}
					numberOfLines={1}
				>
					Sign in to Spotify
				</Text>
				<View style={styles.headerSpacer} />
			</View>

			<View style={styles.webviewContainer}>
				<WebView
					ref={webViewRef}
					source={{ uri: SPOTIFY_LOGIN_URL }}
					onNavigationStateChange={handleNavigationStateChange}
					onMessage={handleMessage}
					onLoadEnd={handleLoadEnd}
					javaScriptEnabled
					domStorageEnabled
					sharedCookiesEnabled
					thirdPartyCookiesEnabled
					incognito={false}
					userAgent={
						Platform.OS === 'ios'
							? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
							: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
					}
					style={styles.webview}
				/>
				{(isLoading || isPolling) && (
					<View
						style={[styles.loadingOverlay, { backgroundColor: colors.background }]}
					>
						<ActivityIndicator size="large" color={colors.primary} />
						<Text
							variant="bodyMedium"
							style={[styles.loadingText, { color: colors.onSurfaceVariant }]}
						>
							{isPolling ? 'Completing sign in...' : 'Loading Spotify...'}
						</Text>
					</View>
				)}
			</View>
		</View>
	);
});

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingBottom: 8,
		borderBottomWidth: 1,
	},
	title: {
		flex: 1,
		textAlign: 'center',
		fontWeight: '600',
	},
	headerSpacer: {
		width: 48,
	},
	webviewContainer: {
		flex: 1,
	},
	webview: {
		flex: 1,
	},
	loadingOverlay: {
		...StyleSheet.absoluteFillObject,
		justifyContent: 'center',
		alignItems: 'center',
		gap: 16,
	},
	loadingText: {
		marginTop: 8,
	},
});
