import { useEffect } from 'react';
import { router } from 'expo-router';

/**
 * SoundCloud OAuth Callback Route
 *
 * Catches the aria://soundcloud/callback deep link after the system browser
 * completes the OAuth flow. The actual auth code processing is handled by
 * expo-web-browser's openAuthSessionAsync — this route just prevents
 * Expo Router from showing an "unmatched route" error.
 */
export default function SoundCloudCallback() {
	useEffect(() => {
		if (router.canGoBack()) {
			router.back();
		} else {
			router.replace('/');
		}
	}, []);

	return null;
}
