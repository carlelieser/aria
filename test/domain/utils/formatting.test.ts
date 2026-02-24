import { describe, it, expect } from 'vitest';
import {
	formatListeners,
	formatDuration,
	formatDate,
	truncateText,
	truncateFilename,
} from '@domain/utils/formatting';

describe('formatting', () => {
	describe('formatListeners', () => {
		it('should return null when count is undefined', () => {
			const result = formatListeners(undefined);

			expect(result).toBeNull();
		});

		it('should return null when count is zero', () => {
			const result = formatListeners(0);

			expect(result).toBeNull();
		});

		it('should format counts below 1000 as plain numbers', () => {
			const result = formatListeners(500);

			expect(result).toBe('500 listeners');
		});

		it('should format counts in thousands with K suffix', () => {
			const result = formatListeners(5_000);

			expect(result).toBe('5K listeners');
		});

		it('should format counts in millions with M suffix', () => {
			const result = formatListeners(1_500_000);

			expect(result).toBe('1.5M listeners');
		});

		it('should use custom suffix when provided', () => {
			const result = formatListeners(1_000_000, 'plays');

			expect(result).toBe('1.0M plays');
		});

		it('should format exactly 1000 as 1K', () => {
			const result = formatListeners(1_000);

			expect(result).toBe('1K listeners');
		});

		it('should format exactly 1 million as 1.0M', () => {
			const result = formatListeners(1_000_000);

			expect(result).toBe('1.0M listeners');
		});

		it('should round K values to nearest integer', () => {
			const result = formatListeners(1_499);

			expect(result).toBe('1K listeners');
		});
	});

	describe('formatDuration', () => {
		it('should format milliseconds as minutes only when under an hour', () => {
			const result = formatDuration(300_000);

			expect(result).toBe('5 min');
		});

		it('should format milliseconds with hours and minutes', () => {
			const result = formatDuration(5_400_000);

			expect(result).toBe('1 hr 30 min');
		});

		it('should format zero milliseconds as 0 min', () => {
			const result = formatDuration(0);

			expect(result).toBe('0 min');
		});

		it('should format exactly one hour', () => {
			const result = formatDuration(3_600_000);

			expect(result).toBe('1 hr 0 min');
		});

		it('should truncate partial minutes', () => {
			const result = formatDuration(90_000);

			expect(result).toBe('1 min');
		});
	});

	describe('formatDate', () => {
		it('should format a timestamp as a localized date string', () => {
			// Use a known timestamp: Jan 15, 2023
			const timestamp = new Date(2023, 0, 15).getTime();

			const result = formatDate(timestamp);

			// The output depends on locale, but it should contain "2023"
			expect(result).toContain('2023');
		});

		it('should handle epoch timestamp', () => {
			const result = formatDate(0);

			// epoch is Jan 1, 1970 UTC; locale timezone may shift to Dec 31, 1969
			const expectedDate = new Date(0);
			const expectedYear = expectedDate.getFullYear().toString();
			expect(result).toContain(expectedYear);
		});
	});

	describe('truncateText', () => {
		it('should return empty string when text is null', () => {
			const result = truncateText(null);

			expect(result).toBe('');
		});

		it('should return text unchanged when shorter than maxLength', () => {
			const result = truncateText('Hello', 35);

			expect(result).toBe('Hello');
		});

		it('should return text unchanged when exactly maxLength', () => {
			const text = 'a'.repeat(35);

			const result = truncateText(text, 35);

			expect(result).toBe(text);
		});

		it('should truncate and add ellipsis when text exceeds maxLength', () => {
			const text = 'a'.repeat(40);

			const result = truncateText(text, 35);

			expect(result).toBe('a'.repeat(32) + '...');
			expect(result.length).toBe(35);
		});

		it('should use default maxLength of 35', () => {
			const text = 'a'.repeat(40);

			const result = truncateText(text);

			expect(result.length).toBe(35);
		});

		it('should return empty string when text is empty', () => {
			const result = truncateText('');

			expect(result).toBe('');
		});
	});

	describe('truncateFilename', () => {
		it('should return empty string when filename is undefined', () => {
			const result = truncateFilename(undefined);

			expect(result).toBe('');
		});

		it('should return filename unchanged when shorter than maxLength', () => {
			const result = truncateFilename('song.mp3', 35);

			expect(result).toBe('song.mp3');
		});

		it('should truncate filename preserving extension', () => {
			const longName = 'a'.repeat(40) + '.mp3';

			const result = truncateFilename(longName, 35);

			expect(result).toContain('...');
			expect(result).toContain('mp3');
		});

		it('should return empty string for empty filename', () => {
			const result = truncateFilename('');

			expect(result).toBe('');
		});

		it('should handle filename without extension', () => {
			const longName = 'a'.repeat(40);

			const result = truncateFilename(longName, 35);

			expect(result).toContain('...');
		});

		it('should use default maxLength of 35', () => {
			const longName = 'a'.repeat(50) + '.mp3';

			const result = truncateFilename(longName);

			expect(result.length).toBeLessThanOrEqual(35);
		});
	});
});
