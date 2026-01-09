import { describe, it, expect } from 'vitest';

describe('Testing Setup', () => {
	it('should run a basic test', () => {
		expect(1 + 1).toBe(2);
	});

	it('should handle async operations', async () => {
		const result = await Promise.resolve('success');
		expect(result).toBe('success');
	});
});
