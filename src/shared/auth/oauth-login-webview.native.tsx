/**
 * OAuth Login WebView Component
 *
 * Generic WebView component for OAuth login flows.
 * Handles cookie polling, navigation tracking, and common UI patterns.
 */

import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Platform, Modal, Pressable } from 'react-native';
import { Text, ActivityIndicator, IconButton } from 'react-native-paper';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import {
	XIcon,
	RefreshCwIcon,
	MoreVerticalIcon,
	CheckCircleIcon,
	ClockIcon,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/lib/theme';
import { Button } from '@/src/components/ui/button';
import { EmptyState } from '@/src/components/ui/empty-state';
import { useCookiePolling } from './use-cookie-polling';

export type { WebViewNavigation };

export interface OAuthLoginConfig {
	/** URL to load in the WebView */
	loginUrl: string;
	/** Title displayed in the header */
	title: string;
	/** Text shown while the page is loading */
	loadingText: string;
	/** Text shown while polling for cookies */
	pollingText: string;
	/** Function to check for authentication cookies */
	checkCookies: () => Promise<string | null>;
	/** Determines if the current URL is a login/auth page */
	isLoginPage: (url: string) => boolean;
	/** Determines if the current URL is on a success domain (post-login) */
	isSuccessDomain: (url: string) => boolean;
	/** Optional redirect URI for OAuth Authorization Code flow.
	 *  When set, navigation to this URI is intercepted and the full URL is returned via onSuccess. */
	redirectUri?: string;
}

export interface OAuthLoginWebViewProps {
	/** Configuration for the login flow */
	config: OAuthLoginConfig;
	/** Called when authentication is successful with the cookie string */
	onSuccess: (cookies: string) => void;
	/** Called when the user cancels the login */
	onCancel: () => void;
	/** Optional callback for navigation state changes */
	onNavigate?: (navState: WebViewNavigation) => void;
}

export const OAuthLoginWebView = memo(function OAuthLoginWebView({
	config,
	onSuccess,
	onCancel,
	onNavigate,
}: OAuthLoginWebViewProps) {
	const { colors } = useAppTheme();
	const insets = useSafeAreaInsets();
	const webViewRef = useRef<WebView>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [menuVisible, setMenuVisible] = useState(false);
	const hasSeenLoginPage = useRef(false);
	const hasHandledRedirect = useRef(false);

	const redirectScheme = config.redirectUri?.split('://')[0];

	const originWhitelist = useMemo(
		() =>
			redirectScheme
				? ['https://*', 'http://*', `${redirectScheme}://*`]
				: ['https://*', 'http://*'],
		[redirectScheme]
	);

	const { isPolling, pollingTimedOut, startPolling, stopPolling, reset, manualCheck } =
		useCookiePolling({
			checkCookies: config.checkCookies,
			onSuccess,
		});

	const handleShouldStartLoad = useCallback(
		(event: { url: string }): boolean => {
			if (config.redirectUri && event.url.startsWith(config.redirectUri)) {
				if (!hasHandledRedirect.current) {
					hasHandledRedirect.current = true;
					stopPolling();
					onSuccess(event.url);
				}
				return false;
			}
			return true;
		},
		[config.redirectUri, onSuccess, stopPolling]
	);

	const handleNavigationStateChange = useCallback(
		(navState: WebViewNavigation) => {
			const url = navState.url;

			// Redirect-based OAuth: intercept the redirect URI
			if (config.redirectUri && url.startsWith(config.redirectUri)) {
				if (!hasHandledRedirect.current) {
					hasHandledRedirect.current = true;
					stopPolling();
					onSuccess(url);
				}
				return;
			}

			onNavigate?.(navState);

			// Track if we've seen the login page
			if (config.isLoginPage(url)) {
				hasSeenLoginPage.current = true;
			}

			// Start polling when we reach a success domain and are not on a login page.
			const shouldPoll = config.isSuccessDomain(url) && !config.isLoginPage(url);

			if (shouldPoll) {
				startPolling();
			}
		},
		[onNavigate, config, startPolling, stopPolling, onSuccess]
	);

	const handleLoadEnd = useCallback(() => {
		setIsLoading(false);
	}, []);

	const handleCancel = useCallback(() => {
		stopPolling();
		onCancel();
	}, [onCancel, stopPolling]);

	const handleRetry = useCallback(() => {
		reset();
		hasSeenLoginPage.current = false;
		hasHandledRedirect.current = false;
		webViewRef.current?.reload();
	}, [reset]);

	const handleMenuOpen = useCallback(() => setMenuVisible(true), []);
	const handleMenuClose = useCallback(() => setMenuVisible(false), []);

	const handleManualComplete = useCallback(async () => {
		setMenuVisible(false);
		await manualCheck();
	}, [manualCheck]);

	const handleRefresh = useCallback(() => {
		setMenuVisible(false);
		webViewRef.current?.reload();
	}, []);

	const showOverlay = isLoading || isPolling || pollingTimedOut;

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
					accessibilityLabel={'Close'}
				/>
				<Text
					variant={'titleMedium'}
					style={[styles.title, { color: colors.onSurface }]}
					numberOfLines={1}
				>
					{config.title}
				</Text>
				<IconButton
					icon={() => <MoreVerticalIcon size={24} color={colors.onSurface} />}
					onPress={handleMenuOpen}
					accessibilityLabel={'More options'}
				/>
			</View>

			<Modal
				visible={menuVisible}
				transparent
				animationType={'fade'}
				onRequestClose={handleMenuClose}
			>
				<Pressable style={styles.menuOverlay} onPress={handleMenuClose}>
					<View
						style={[
							styles.menuContainer,
							{
								backgroundColor: colors.surfaceContainerHigh,
								top: insets.top + 48,
							},
						]}
					>
						<Pressable
							style={({ pressed }) => [
								styles.menuItem,
								{
									backgroundColor: pressed
										? colors.surfaceContainerHighest
										: 'transparent',
								},
							]}
							onPress={handleManualComplete}
						>
							<CheckCircleIcon size={20} color={colors.onSurface} />
							<Text style={[styles.menuItemText, { color: colors.onSurface }]}>
								Complete sign in
							</Text>
						</Pressable>
						<Pressable
							style={({ pressed }) => [
								styles.menuItem,
								{
									backgroundColor: pressed
										? colors.surfaceContainerHighest
										: 'transparent',
								},
							]}
							onPress={handleRefresh}
						>
							<RefreshCwIcon size={20} color={colors.onSurface} />
							<Text style={[styles.menuItemText, { color: colors.onSurface }]}>
								Refresh
							</Text>
						</Pressable>
					</View>
				</Pressable>
			</Modal>

			<View style={styles.webviewContainer}>
				<WebView
					ref={webViewRef}
					source={{ uri: config.loginUrl }}
					originWhitelist={originWhitelist}
					onShouldStartLoadWithRequest={handleShouldStartLoad}
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
				{showOverlay && (
					<View style={[styles.loadingOverlay, { backgroundColor: colors.background }]}>
						{pollingTimedOut ? (
							<EmptyState
								icon={ClockIcon}
								title={'Sign in timed out'}
								description={'Please try signing in again'}
								action={
									<Button variant={'default'} onPress={handleRetry}>
										Try Again
									</Button>
								}
							/>
						) : (
							<>
								<ActivityIndicator size={'large'} color={colors.primary} />
								<Text
									variant={'bodyMedium'}
									style={[styles.loadingText, { color: colors.onSurfaceVariant }]}
								>
									{isPolling ? config.pollingText : config.loadingText}
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
	menuOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.3)',
	},
	menuContainer: {
		position: 'absolute',
		right: 8,
		borderRadius: 12,
		paddingVertical: 8,
		minWidth: 180,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 8,
		elevation: 8,
	},
	menuItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		paddingHorizontal: 16,
		gap: 12,
	},
	menuItemText: {
		fontSize: 16,
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
});
