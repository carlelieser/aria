import type { ComponentType } from 'react';
import { SpotifyLoginWebView } from './spotify-login-webview';
import { YouTubeMusicLoginWebView } from './youtube-music-login-webview';
import { SoundCloudLoginWebView } from './soundcloud-login-webview';

export interface LoginWebViewProps {
	readonly onSuccess: (credential: string) => void;
	readonly onCancel: () => void;
}

type LoginWebViewComponent = ComponentType<LoginWebViewProps>;

const LOGIN_WEBVIEWS: Record<string, LoginWebViewComponent> = {
	spotify: SpotifyLoginWebView,
	'youtube-music': YouTubeMusicLoginWebView,
	soundcloud: SoundCloudLoginWebView,
};

export function getLoginWebView(pluginId: string): LoginWebViewComponent | undefined {
	return LOGIN_WEBVIEWS[pluginId];
}
