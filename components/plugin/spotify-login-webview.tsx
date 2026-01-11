/**
 * Spotify Login WebView Component
 *
 * Displays a WebView for Spotify login and extracts the sp_dc cookie after authentication.
 * Uses native CookieManager to access HttpOnly cookies that JavaScript cannot read.
 */

import { memo, useCallback, useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text, ActivityIndicator, IconButton } from 'react-native-paper';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { XIcon, RefreshCwIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CookieManager from '@react-native-cookies/cookies';
import { useAppTheme } from '@/lib/theme';
import { Button } from '@/components/ui/button';
import { SPOTIFY_LOGIN_URL } from '@/src/plugins/metadata/spotify/config';

export type { WebViewNavigation };

const POLL_INTERVAL_MS = 500;
const POLL_TIMEOUT_MS = 30000;

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
	const { colors } = useAppTheme();
	const insets = useSafeAreaInsets();
	const webViewRef = useRef<WebView>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isPolling, setIsPolling] = useState(false);
	const [pollingTimedOut, setPollingTimedOut] = useState(false);
	const hasFoundCookie = useRef(false);
	const hasSeenLoginPage = useRef(false);
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

	const checkCookiesNatively = useCallback(async (): Promise<string | null> => {
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

	const startPolling = useCallback(() => {
		if (pollIntervalRef.current || hasFoundCookie.current) {
			return;
		}

		setIsPolling(true);
		setPollingTimedOut(false);
		pollStartTimeRef.current = Date.now();

		const pollForCookie = async () => {
			// Check for timeout
			if (
				pollStartTimeRef.current &&
				Date.now() - pollStartTimeRef.current > POLL_TIMEOUT_MS
			) {
				stopPolling();
				setPollingTimedOut(true);
				return;
			}

			// Stop if already found
			if (hasFoundCookie.current) {
				stopPolling();
				return;
			}

			// Use native cookie access instead of JavaScript injection
			const spDcCookie = await checkCookiesNatively();
			if (spDcCookie && !hasFoundCookie.current) {
				hasFoundCookie.current = true;
				stopPolling();
				onSuccess(spDcCookie);
			}
		};

		// Immediately check once
		void pollForCookie();

		// Then poll at intervals
		pollIntervalRef.current = setInterval(() => {
			void pollForCookie();
		}, POLL_INTERVAL_MS);
	}, [stopPolling, checkCookiesNatively, onSuccess]);

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
			const url = navState.url;

			// Notify parent of navigation
			onNavigate?.(navState);

			// Track if we've seen the login page
			const isOnLoginPage = url.includes('/login') || url.includes('/authorize');
			if (isOnLoginPage) {
				hasSeenLoginPage.current = true;
			}

			// Only start polling if:
			// 1. We've previously seen the login page (user had chance to log in)
			// 2. We're now on a Spotify domain but NOT on login/authorize pages
			// 3. We haven't already found the cookie
			const isOnSpotifyDomain = url.includes('spotify.com') || url.includes('spotify.net');
			const hasLeftLoginPage = hasSeenLoginPage.current && !isOnLoginPage;

			if (isOnSpotifyDomain && hasLeftLoginPage && !hasFoundCookie.current) {
				startPolling();
			}
		},
		[onNavigate, startPolling]
	);

	const handleLoadEnd = useCallback(() => {
		setIsLoading(false);
	}, []);

	const handleCancel = useCallback(() => {
		stopPolling();
		onCancel();
	}, [onCancel, stopPolling]);

	const handleRetry = useCallback(() => {
		setPollingTimedOut(false);
		hasFoundCookie.current = false;
		hasSeenLoginPage.current = false;
		webViewRef.current?.reload();
	}, []);

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
				{(isLoading || isPolling || pollingTimedOut) && (
					<View style={[styles.loadingOverlay, { backgroundColor: colors.background }]}>
						{pollingTimedOut ? (
							<>
								<Text
									variant="bodyLarge"
									style={[styles.timeoutTitle, { color: colors.onSurface }]}
								>
									Sign in timed out
								</Text>
								<Text
									variant="bodyMedium"
									style={[styles.loadingText, { color: colors.onSurfaceVariant }]}
								>
									Please try signing in again
								</Text>
								<Button
									variant="default"
									onPress={handleRetry}
									style={styles.retryButton}
								>
									<RefreshCwIcon size={16} color={colors.onPrimary} />
									<Text style={{ color: colors.onPrimary, marginLeft: 8 }}>
										Try Again
									</Text>
								</Button>
							</>
						) : (
							<>
								<ActivityIndicator size="large" color={colors.primary} />
								<Text
									variant="bodyMedium"
									style={[styles.loadingText, { color: colors.onSurfaceVariant }]}
								>
									{isPolling ? 'Completing sign in...' : 'Loading Spotify...'}
								</Text>
							</>
						)}
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
		textAlign: 'center',
	},
	timeoutTitle: {
		fontWeight: '600',
		marginBottom: 4,
	},
	retryButton: {
		marginTop: 16,
		flexDirection: 'row',
		alignItems: 'center',
	},
});
