import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./test/setup.ts'],
		include: ['**/*.{test,spec}.{ts,tsx}'],
		exclude: ['node_modules', '.expo', 'android', 'ios'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules',
				'.expo',
				'android',
				'ios',
				'test',
				'**/*.d.ts',
				'**/*.config.*',
			],
		},
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './'),
			'@domain': path.resolve(__dirname, './src/domain'),
			'@application': path.resolve(__dirname, './src/application'),
			'@infrastructure': path.resolve(__dirname, './src/infrastructure'),
			'@plugins': path.resolve(__dirname, './src/plugins'),
			'@shared': path.resolve(__dirname, './src/shared'),
		},
	},
});
