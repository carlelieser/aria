import { describe, it, expect } from 'vitest';
import { extractYearFromDateString, extractYearFromSubtitle } from '@shared/mappers/year-extractor';

describe('year-extractor', () => {
	describe('extractYearFromDateString', () => {
		it('should extract year from YYYY format', () => {
			const result = extractYearFromDateString('2023');

			expect(result).toBe(2023);
		});

		it('should extract year from YYYY-MM-DD format', () => {
			const result = extractYearFromDateString('2023-01-15');

			expect(result).toBe(2023);
		});

		it('should extract year from YYYY-MM format', () => {
			const result = extractYearFromDateString('2023-06');

			expect(result).toBe(2023);
		});

		it('should return undefined for undefined input', () => {
			const result = extractYearFromDateString(undefined);

			expect(result).toBeUndefined();
		});

		it('should return undefined for empty string', () => {
			const result = extractYearFromDateString('');

			expect(result).toBeUndefined();
		});

		it('should return undefined for non-date string', () => {
			const result = extractYearFromDateString('not a date');

			expect(result).toBeUndefined();
		});

		it('should handle year at boundary 1900', () => {
			const result = extractYearFromDateString('1900');

			expect(result).toBe(1900);
		});

		it('should handle year at boundary 2100', () => {
			const result = extractYearFromDateString('2100');

			expect(result).toBe(2100);
		});

		it('should reject year below 1900 in prefix position', () => {
			const result = extractYearFromDateString('1899-01-01');

			expect(result).toBeUndefined();
		});

		it('should reject year above 2100 in prefix position', () => {
			const result = extractYearFromDateString('2101-01-01');

			expect(result).toBeUndefined();
		});

		it('should find year anywhere in string when prefix fails', () => {
			const result = extractYearFromDateString('Released in 2023');

			expect(result).toBe(2023);
		});

		it('should find 19xx year in string', () => {
			const result = extractYearFromDateString('Recorded in 1975 at studio');

			expect(result).toBe(1975);
		});

		it('should not match non-year 4-digit numbers', () => {
			const result = extractYearFromDateString('Code: 5678');

			expect(result).toBeUndefined();
		});
	});

	describe('extractYearFromSubtitle', () => {
		it('should extract year from subtitle string', () => {
			const result = extractYearFromSubtitle('Artist Name • 2023');

			expect(result).toBe('2023');
		});

		it('should extract year from middle of subtitle', () => {
			const result = extractYearFromSubtitle('Album • 2020 • Pop');

			expect(result).toBe('2020');
		});

		it('should return undefined for undefined input', () => {
			const result = extractYearFromSubtitle(undefined);

			expect(result).toBeUndefined();
		});

		it('should return undefined for empty string', () => {
			const result = extractYearFromSubtitle('');

			expect(result).toBeUndefined();
		});

		it('should return undefined when no year is found', () => {
			const result = extractYearFromSubtitle('Artist Name • Pop');

			expect(result).toBeUndefined();
		});

		it('should match years starting with 19', () => {
			const result = extractYearFromSubtitle('Classic • 1985');

			expect(result).toBe('1985');
		});

		it('should match years starting with 20', () => {
			const result = extractYearFromSubtitle('Modern • 2024');

			expect(result).toBe('2024');
		});

		it('should return first matching year when multiple present', () => {
			const result = extractYearFromSubtitle('1999 to 2005');

			expect(result).toBe('1999');
		});
	});
});
