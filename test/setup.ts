import { vi, beforeAll, afterAll } from 'vitest';

vi.mock('react-native', () => ({
	Platform: {
		OS: 'ios',
		select: vi.fn((obj: Record<string, unknown>) => obj.ios),
	},
	Dimensions: {
		get: vi.fn(() => ({ width: 375, height: 812 })),
	},
	StyleSheet: {
		create: <T extends Record<string, unknown>>(styles: T) => styles,
		flatten: vi.fn((style: unknown) => style),
	},
	View: 'View',
	Text: 'Text',
	TouchableOpacity: 'TouchableOpacity',
	ScrollView: 'ScrollView',
	Image: 'Image',
	Switch: 'Switch',
	Animated: {
		View: 'Animated.View',
		Text: 'Animated.Text',
		Value: vi.fn(() => ({
			interpolate: vi.fn(),
			setValue: vi.fn(),
		})),
		timing: vi.fn(() => ({
			start: vi.fn(),
		})),
		spring: vi.fn(() => ({
			start: vi.fn(),
		})),
	},
}));

vi.mock('expo-router', () => ({
	router: {
		push: vi.fn(),
		back: vi.fn(),
		replace: vi.fn(),
	},
	useLocalSearchParams: vi.fn(() => ({})),
	useRouter: vi.fn(() => ({
		push: vi.fn(),
		back: vi.fn(),
		replace: vi.fn(),
	})),
	Stack: {
		Screen: 'Stack.Screen',
	},
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
	default: {
		getItem: vi.fn(),
		setItem: vi.fn(),
		removeItem: vi.fn(),
		clear: vi.fn(),
	},
}));

vi.mock('react-native-safe-area-context', () => ({
	SafeAreaView: 'SafeAreaView',
	SafeAreaProvider: 'SafeAreaProvider',
	useSafeAreaInsets: vi.fn(() => ({ top: 0, right: 0, bottom: 0, left: 0 })),
}));

const originalConsole = { ...console };

beforeAll(() => {
	global.console = {
		...console,
		log: vi.fn(),
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	};
});

afterAll(() => {
	global.console = originalConsole;
});
