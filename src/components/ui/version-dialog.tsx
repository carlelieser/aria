/**
 * VersionDialog Component
 *
 * Material 3 styled dialog displaying app version information.
 */

import { StyleSheet, View, Platform, Linking } from 'react-native';
import { Dialog, Portal, Text, Button, Divider } from 'react-native-paper';
import Constants from 'expo-constants';
import { useAppTheme, M3Shapes } from '@/lib/theme';
import { Icon } from '@/components/ui/icon';
import { SmartphoneIcon, CpuIcon, PackageIcon, CodeIcon, GithubIcon } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

interface VersionDialogProps {
	visible: boolean;
	onDismiss: () => void;
}

interface InfoRowProps {
	icon: LucideIcon;
	label: string;
	value: string;
}

function InfoRow({ icon: IconComponent, label, value }: InfoRowProps) {
	const { colors } = useAppTheme();

	return (
		<View style={styles.infoRow}>
			<Icon as={IconComponent} size={18} color={colors.onSurfaceVariant} />
			<Text variant="bodyMedium" style={[styles.label, { color: colors.onSurfaceVariant }]}>
				{label}
			</Text>
			<Text variant="bodyMedium" style={[styles.value, { color: colors.onSurface }]}>
				{value}
			</Text>
		</View>
	);
}

export function VersionDialog({ visible, onDismiss }: VersionDialogProps) {
	const { colors } = useAppTheme();

	const appVersion = Constants.expoConfig?.version ?? '1.0.0';
	const buildNumber = Platform.select({
		ios: Constants.expoConfig?.ios?.buildNumber,
		android: Constants.expoConfig?.android?.versionCode?.toString(),
		default: undefined,
	});
	const expoSdkVersion = Constants.expoConfig?.sdkVersion ?? 'Unknown';
	const platformVersion = `${Platform.OS === 'ios' ? 'iOS' : 'Android'} ${Platform.Version}`;

	const handleOpenGitHub = () => {
		Linking.openURL('https://github.com');
	};

	return (
		<Portal>
			<Dialog
				visible={visible}
				onDismiss={onDismiss}
				style={[styles.dialog, { backgroundColor: colors.surfaceContainerHigh }]}
			>
				<Dialog.Title style={{ color: colors.onSurface }}>About Aria</Dialog.Title>
				<Dialog.Content>
					<View style={styles.headerSection}>
						<View
							style={[
								styles.iconContainer,
								{ backgroundColor: colors.primaryContainer },
							]}
						>
							<Icon as={PackageIcon} size={32} color={colors.onPrimaryContainer} />
						</View>
						<View style={styles.headerText}>
							<Text variant="headlineSmall" style={{ color: colors.onSurface }}>
								Aria
							</Text>
							<Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
								Music Player
							</Text>
						</View>
					</View>

					<Divider style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

					<View style={styles.infoSection}>
						<InfoRow
							icon={PackageIcon}
							label="Version"
							value={buildNumber ? `${appVersion} (${buildNumber})` : appVersion}
						/>
						<InfoRow icon={CodeIcon} label="Expo SDK" value={expoSdkVersion} />
						<InfoRow icon={SmartphoneIcon} label="Platform" value={platformVersion} />
						<InfoRow
							icon={CpuIcon}
							label="Architecture"
							value={Platform.OS === 'ios' ? 'arm64' : 'arm64-v8a'}
						/>
					</View>

					<Divider style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

					<Text
						variant="bodySmall"
						style={[styles.description, { color: colors.onSurfaceVariant }]}
					>
						A powerful music player with plugin support for multiple sources, offline
						downloads, and a customizable experience.
					</Text>
				</Dialog.Content>
				<Dialog.Actions style={styles.actions}>
					<Button
						mode="text"
						onPress={handleOpenGitHub}
						textColor={colors.primary}
						icon={({ size, color }) => (
							<Icon as={GithubIcon} size={size} color={color} />
						)}
					>
						GitHub
					</Button>
					<Button mode="text" onPress={onDismiss} textColor={colors.primary}>
						Close
					</Button>
				</Dialog.Actions>
			</Dialog>
		</Portal>
	);
}

const styles = StyleSheet.create({
	dialog: {
		borderRadius: M3Shapes.extraLarge,
	},
	headerSection: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 16,
		marginBottom: 16,
	},
	iconContainer: {
		width: 64,
		height: 64,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},
	headerText: {
		flex: 1,
	},
	divider: {
		marginVertical: 16,
	},
	infoSection: {
		gap: 12,
	},
	infoRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	label: {
		flex: 1,
	},
	value: {
		fontWeight: '500',
	},
	description: {
		lineHeight: 20,
	},
	actions: {
		paddingHorizontal: 16,
		paddingBottom: 16,
	},
});
