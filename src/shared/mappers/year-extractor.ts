/**
 * Year Extractor Utilities
 *
 * Shared utilities for extracting year from date strings across plugins.
 */

/**
 * Extracts year from a date string.
 * Supports formats like "2023", "2023-01-15", etc.
 * Returns undefined if no valid year found.
 */
export function extractYearFromDateString(dateString?: string): number | undefined {
	if (!dateString) {
		return undefined;
	}

	// Try to extract 4-digit year from beginning (YYYY format)
	const prefixYear = parseInt(dateString.substring(0, 4), 10);
	if (!isNaN(prefixYear) && prefixYear >= 1900 && prefixYear <= 2100) {
		return prefixYear;
	}

	// Try to find a 4-digit year anywhere in the string
	const yearMatch = dateString.match(/\b(19|20)\d{2}\b/);
	if (yearMatch) {
		return parseInt(yearMatch[0], 10);
	}

	return undefined;
}

/**
 * Extracts year from a text field that may contain "Artist • Year" format.
 */
export function extractYearFromSubtitle(subtitle?: string): string | undefined {
	if (!subtitle) {
		return undefined;
	}

	const yearMatch = subtitle.match(/\b(19|20)\d{2}\b/);
	return yearMatch ? yearMatch[0] : undefined;
}
