/**
 * YouTube Music Login WebView Component
 *
 * Displays a WebView for Google login and extracts authentication cookies after login.
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

export type { WebViewNavigation };

const YOUTUBE_MUSIC_LOGIN_URL =
	'https://accounts.google.com/ServiceLogin?service=youtube&continue=https://music.youtube.com';

const POLL_INTERVAL_MS = 500;
const POLL_TIMEOUT_MS = 30000;
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
	const { colors } = useAppTheme();
	const insets = useSafeAreaInsets();
	const webViewRef = useRef<WebView>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isPolling, setIsPolling] = useState(false);
	const [pollingTimedOut, setPollingTimedOut] = useState(false);
	const hasFoundCookies = useRef(false);
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
			const cookieString = Object.entries(allCookies)
				.filter(([, data]) => data.value)
				.map(([name, data]) => `${name}=${data.value}`)
				.join('; ');

			return cookieString;
		} catch {
			// Cookie access failed, continue polling
		}
		return null;
	}, []);

	const startPolling = useCallback(() => {
		if (pollIntervalRef.current || hasFoundCookies.current) {
			return;
		}

		setIsPolling(true);
		setPollingTimedOut(false);
		pollStartTimeRef.current = Date.now();

		const pollForCookies = async () => {
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
			if (hasFoundCookies.current) {
				stopPolling();
				return;
			}

			// Use native cookie access
			const cookies = await checkCookiesNatively();
			if (cookies && !hasFoundCookies.current) {
				hasFoundCookies.current = true;
				stopPolling();
				onSuccess(cookies);
			}
		};

		// Immediately check once
		void pollForCookies();

		// Then poll at intervals
		pollIntervalRef.current = setInterval(() => {
			void pollForCookies();
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
			const isOnLoginPage =
				url.includes('accounts.google.com') ||
				url.includes('/signin') ||
				url.includes('/ServiceLogin');
			if (isOnLoginPage) {
				hasSeenLoginPage.current = true;
			}

			// Start polling when:
			// 1. We've previously seen the login page
			// 2. We're now on YouTube Music domain
			// 3. We haven't already found the cookies
			const isOnYouTubeDomain =
				url.includes('music.youtube.com') || url.includes('youtube.com');
			const hasLeftLoginPage = hasSeenLoginPage.current && !isOnLoginPage;

			if (isOnYouTubeDomain && hasLeftLoginPage && !hasFoundCookies.current) {
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
		hasFoundCookies.current = false;
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
					Sign in to YouTube Music
				</Text>
				<View style={styles.headerSpacer} />
			</View>

			<View style={styles.webviewContainer}>
				<WebView
					ref={webViewRef}
					source={{ uri: YOUTUBE_MUSIC_LOGIN_URL }}
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
									{isPolling ? 'Completing sign in...' : 'Loading Google...'}
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
