import type { ComponentType } from 'react';
import { SpotifyLoginWebView } from './spotify-login-webview';
import { YouTubeMusicLoginWebView } from './youtube-music-login-webview';

export interface LoginWebViewProps {
	onSuccess: (credential: string) => void;
	onCancel: () => void;
}

type LoginWebViewComponent = ComponentType<LoginWebViewProps>;

const LOGIN_WEBVIEWS: Record<string, LoginWebViewComponent> = {
	'spotify': SpotifyLoginWebView,
	'youtube-music': YouTubeMusicLoginWebView,
};

export function getLoginWebView(pluginId: string): LoginWebViewComponent | undefined {
	return LOGIN_WEBVIEWS[pluginId];
}
