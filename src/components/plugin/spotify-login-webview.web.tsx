/**
 * Spotify Login WebView Component (Web Platform)
 *
 * Web platform stub - Spotify login via WebView is only available on native platforms.
 */

import { memo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { XIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/lib/theme';
import type { WebViewNavigation } from 'react-native-webview';

export type { WebViewNavigation };

interface SpotifyLoginWebViewProps {
	onSuccess: (spDcCookie: string) => void;
	onCancel: () => void;
	onNavigate?: (navState: WebViewNavigation) => void;
}

export const SpotifyLoginWebView = memo(function SpotifyLoginWebView({
	onCancel,
}: SpotifyLoginWebViewProps) {
	const { colors } = useAppTheme();
	const insets = useSafeAreaInsets();

	useEffect(() => {
		const timer = setTimeout(() => {
			onCancel();
		}, 5000);
		return () => clearTimeout(timer);
	}, [onCancel]);

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
					onPress={onCancel}
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

			<View style={styles.content}>
				<Text variant="headlineSmall" style={{ color: colors.onSurface, marginBottom: 8 }}>
					Not Available on Web
				</Text>
				<Text
					variant="bodyMedium"
					style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}
				>
					Spotify login requires native cookie access and is only available on iOS and
					Android devices.
				</Text>
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
	content: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 24,
	},
});
