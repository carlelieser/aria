import { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import { Text, FAB } from 'react-native-paper';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { UserIcon, PencilIcon, CheckIcon } from 'lucide-react-native';
import { PageLayout } from '@/src/components/ui/page-layout';
import { PlayerAwareScrollView } from '@/src/components/ui/player-aware-scroll-view';
import { Icon } from '@/src/components/ui/icon';
import { AccountsSection } from '@/src/components/profile/accounts-section';
import { FLOATING_PLAYER_HEIGHT } from '@/src/components/floating-player';
import { useProfileStore } from '@/src/application/state/profile-store';
import { useHasActiveTrack } from '@/src/application/state/player-store';
import { useAppTheme, FontFamily } from '@/lib/theme';
import { useToast } from '@/src/hooks/use-toast';

const AVATAR_SIZE = 120;

export default function ProfileScreen() {
	const { colors } = useAppTheme();
	const { success } = useToast();
	const hasActiveTrack = useHasActiveTrack();
	const { name, email, avatarUri, setName, setEmail, setAvatarUri } = useProfileStore();

	const [isEditing, setIsEditing] = useState(false);
	const [draftName, setDraftName] = useState(name);
	const [draftEmail, setDraftEmail] = useState(email);

	const handlePickAvatar = useCallback(async () => {
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ['images'],
			allowsEditing: true,
			aspect: [1, 1],
			quality: 0.8,
		});

		if (!result.canceled && result.assets[0]) {
			setAvatarUri(result.assets[0].uri);
		}
	}, [setAvatarUri]);

	const handleEdit = useCallback(() => {
		setDraftName(name);
		setDraftEmail(email);
		setIsEditing(true);
	}, [name, email]);

	const handleSave = useCallback(() => {
		setName(draftName.trim());
		setEmail(draftEmail.trim());
		setIsEditing(false);
		success('Profile saved');
	}, [draftName, draftEmail, setName, setEmail, success]);

	return (
		<PageLayout header={{ title: 'Profile', showBack: true }}>
			<PlayerAwareScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
			>
				<Pressable
					style={[
						styles.avatarContainer,
						{ backgroundColor: colors.surfaceContainerHighest },
					]}
					onPress={isEditing ? handlePickAvatar : undefined}
					disabled={!isEditing}
				>
					{avatarUri ? (
						<Image
							source={{ uri: avatarUri }}
							style={styles.avatar}
							contentFit={'cover'}
						/>
					) : (
						<Icon as={UserIcon} size={56} color={colors.onSurfaceVariant} />
					)}
				</Pressable>

				{isEditing && (
					<Text
						variant={'labelMedium'}
						style={[styles.avatarHint, { color: colors.primary }]}
					>
						Tap photo to change
					</Text>
				)}

				<View style={styles.fields}>
					<ProfileField
						label={'Name'}
						value={isEditing ? draftName : name}
						placeholder={'Enter your name'}
						editing={isEditing}
						onChangeText={setDraftName}
					/>
					<ProfileField
						label={'Email'}
						value={isEditing ? draftEmail : email}
						placeholder={'Enter your email'}
						editing={isEditing}
						onChangeText={setDraftEmail}
						keyboardType={'email-address'}
					/>
				</View>

				<View style={styles.accountsContainer}>
					<AccountsSection />
				</View>
			</PlayerAwareScrollView>

			<FAB
				icon={({ color, size }) => (
					<View
						style={{
							width: size,
							height: size,
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						{isEditing ? (
							<CheckIcon size={28} color={color} />
						) : (
							<PencilIcon size={28} color={color} />
						)}
					</View>
				)}
				onPress={isEditing ? handleSave : handleEdit}
				style={[
					styles.fab,
					{ backgroundColor: colors.primaryContainer },
					hasActiveTrack && { bottom: 48 + FLOATING_PLAYER_HEIGHT },
				]}
				color={colors.onPrimaryContainer}
				size={'large'}
			/>
		</PageLayout>
	);
}

interface ProfileFieldProps {
	readonly label: string;
	readonly value: string;
	readonly placeholder: string;
	readonly editing: boolean;
	readonly onChangeText: (text: string) => void;
	readonly keyboardType?: 'default' | 'email-address';
}

function ProfileField({
	label,
	value,
	placeholder,
	editing,
	onChangeText,
	keyboardType = 'default',
}: ProfileFieldProps) {
	const { colors } = useAppTheme();

	return (
		<View style={styles.fieldRow}>
			<Text variant={'labelLarge'} style={{ color: colors.onSurfaceVariant }}>
				{label}
			</Text>
			{editing ? (
				<View
					style={[
						styles.inputWrapper,
						{ borderColor: colors.outline, backgroundColor: colors.surface },
					]}
				>
					<TextInput
						value={value}
						onChangeText={onChangeText}
						placeholder={placeholder}
						placeholderTextColor={colors.onSurfaceVariant}
						keyboardType={keyboardType}
						autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
						style={[styles.input, { color: colors.onSurface }]}
						textAlignVertical={'center'}
					/>
				</View>
			) : (
				<Text
					variant={'bodyLarge'}
					style={{ color: value ? colors.onSurface : colors.onSurfaceVariant }}
				>
					{value || placeholder}
				</Text>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		alignItems: 'center',
		paddingTop: 32,
	},
	avatarContainer: {
		width: AVATAR_SIZE,
		height: AVATAR_SIZE,
		borderRadius: AVATAR_SIZE / 2,
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
	},
	avatar: {
		width: AVATAR_SIZE,
		height: AVATAR_SIZE,
	},
	avatarHint: {
		marginTop: 12,
	},
	fields: {
		width: '100%',
		marginTop: 32,
		paddingHorizontal: 24,
		gap: 24,
	},
	accountsContainer: {
		width: '100%',
		marginTop: 8,
		paddingHorizontal: 10,
	},
	fieldRow: {
		gap: 6,
	},
	inputWrapper: {
		height: 48,
		borderWidth: 1,
		borderRadius: 12,
		justifyContent: 'center',
		paddingHorizontal: 14,
	},
	input: {
		height: 48,
		fontSize: 16,
		fontFamily: FontFamily.regular,
		includeFontPadding: false,
	},
	fab: {
		position: 'absolute',
		right: 24,
		bottom: 24,
		elevation: 4,
	},
});
