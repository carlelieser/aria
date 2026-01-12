/**
 * Expo Config Plugin for react-native-track-player
 *
 * Configures Android for background audio playback with foreground service.
 * iOS background audio is configured via infoPlist in app.json.
 */

const { withAndroidManifest } = require('@expo/config-plugins');

function addForegroundServicePermissions(androidManifest) {
	const manifest = androidManifest.manifest;

	// Ensure uses-permission array exists
	if (!manifest['uses-permission']) {
		manifest['uses-permission'] = [];
	}

	const permissions = manifest['uses-permission'];

	// Add FOREGROUND_SERVICE permission if not present
	const hasForegroundService = permissions.some(
		(perm) => perm.$?.['android:name'] === 'android.permission.FOREGROUND_SERVICE'
	);
	if (!hasForegroundService) {
		permissions.push({
			$: { 'android:name': 'android.permission.FOREGROUND_SERVICE' },
		});
	}

	// Add FOREGROUND_SERVICE_MEDIA_PLAYBACK permission if not present
	const hasMediaPlayback = permissions.some(
		(perm) =>
			perm.$?.['android:name'] === 'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK'
	);
	if (!hasMediaPlayback) {
		permissions.push({
			$: { 'android:name': 'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK' },
		});
	}

	return androidManifest;
}

function addPlaybackService(androidManifest) {
	const manifest = androidManifest.manifest;
	const application = manifest.application?.[0];

	if (!application) {
		return androidManifest;
	}

	// Ensure service array exists
	if (!application.service) {
		application.service = [];
	}

	const services = application.service;

	// Check if TrackPlayer service already exists
	const hasTrackPlayerService = services.some(
		(service) =>
			service.$?.['android:name'] === 'com.doublesymmetry.trackplayer.service.MusicService'
	);

	if (!hasTrackPlayerService) {
		services.push({
			$: {
				'android:name': 'com.doublesymmetry.trackplayer.service.MusicService',
				'android:exported': 'true',
				'android:foregroundServiceType': 'mediaPlayback',
			},
			'intent-filter': [
				{
					action: [{ $: { 'android:name': 'android.media.browse.MediaBrowserService' } }],
				},
			],
		});
	}

	return androidManifest;
}

const withTrackPlayer = (config) => {
	return withAndroidManifest(config, (config) => {
		config.modResults = addForegroundServicePermissions(config.modResults);
		config.modResults = addPlaybackService(config.modResults);
		return config;
	});
};

module.exports = withTrackPlayer;
