/**
 * Expo Config Plugin for react-native-track-player
 *
 * Configures Android for background audio playback with foreground service.
 * iOS background audio is configured via infoPlist in app.json.
 */

const { withAndroidManifest } = require('@expo/config-plugins');

function addForegroundServicePermissions(androidManifest) {
	const manifest = androidManifest.manifest;

	if (!manifest['uses-permission']) {
		manifest['uses-permission'] = [];
	}

	const permissions = manifest['uses-permission'];

	const requiredPermissions = [
		'android.permission.FOREGROUND_SERVICE',
		'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
	];

	for (const perm of requiredPermissions) {
		const hasPermission = permissions.some((p) => p.$?.['android:name'] === perm);
		if (!hasPermission) {
			permissions.push({ $: { 'android:name': perm } });
		}
	}

	return androidManifest;
}

function addMusicService(androidManifest) {
	const manifest = androidManifest.manifest;
	const application = manifest.application?.[0];

	if (!application) {
		return androidManifest;
	}

	if (!application.service) {
		application.service = [];
	}

	const services = application.service;
	const serviceName = 'com.doublesymmetry.trackplayer.service.MusicService';

	const hasService = services.some((s) => s.$?.['android:name'] === serviceName);

	if (!hasService) {
		services.push({
			$: {
				'android:name': serviceName,
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
		config.modResults = addMusicService(config.modResults);
		return config;
	});
};

module.exports = withTrackPlayer;
