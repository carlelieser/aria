import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ProfileState {
	readonly name: string;
	readonly email: string;
	readonly avatarUri: string | null;

	setName: (name: string) => void;
	setEmail: (email: string) => void;
	setAvatarUri: (uri: string | null) => void;
}

const customStorage = {
	getItem: async (name: string): Promise<string | null> => {
		return AsyncStorage.getItem(name);
	},
	setItem: async (name: string, value: string): Promise<void> => {
		await AsyncStorage.setItem(name, value);
	},
	removeItem: async (name: string): Promise<void> => {
		await AsyncStorage.removeItem(name);
	},
};

export const useProfileStore = create<ProfileState>()(
	persist(
		(set) => ({
			name: '',
			email: '',
			avatarUri: null,

			setName: (name: string) => {
				set({ name });
			},
			setEmail: (email: string) => {
				set({ email });
			},
			setAvatarUri: (uri: string | null) => {
				set({ avatarUri: uri });
			},
		}),
		{
			name: 'aria-profile-storage',
			storage: createJSONStorage(() => customStorage),
			version: 1,
		}
	)
);
