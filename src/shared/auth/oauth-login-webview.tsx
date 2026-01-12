/**
 * OAuth Login WebView Component (Web Stub)
 *
 * Web platform stub - OAuth login via WebView is only supported on native platforms.
 */

import type { WebViewNavigation } from 'react-native-webview';

export type { WebViewNavigation };

export interface OAuthLoginConfig {
	loginUrl: string;
	title: string;
	loadingText: string;
	pollingText: string;
	checkCookies: () => Promise<string | null>;
	isLoginPage: (url: string) => boolean;
	isSuccessDomain: (url: string) => boolean;
}

export interface OAuthLoginWebViewProps {
	config: OAuthLoginConfig;
	onSuccess: (cookies: string) => void;
	onCancel: () => void;
	onNavigate?: (navState: WebViewNavigation) => void;
}

export function OAuthLoginWebView(_props: OAuthLoginWebViewProps): null {
	return null;
}
