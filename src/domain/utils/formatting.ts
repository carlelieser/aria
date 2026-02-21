/**
 * Shared formatting utilities for display text.
 */

const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
	month: 'short',
	day: 'numeric',
	year: 'numeric',
};

export function formatListeners(count: number | undefined, suffix = 'listeners'): string | null {
	if (!count) return null;
	if (count >= 1_000_000) {
		return `${(count / 1_000_000).toFixed(1)}M ${suffix}`;
	}
	if (count >= 1_000) {
		return `${(count / 1_000).toFixed(0)}K ${suffix}`;
	}
	return `${count} ${suffix}`;
}

export function formatDuration(ms: number): string {
	const totalMinutes = Math.floor(ms / 60000);
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;

	if (hours > 0) {
		return `${hours} hr ${minutes} min`;
	}
	return `${minutes} min`;
}

export function formatDate(timestamp: number): string {
	const date = new Date(timestamp);
	return date.toLocaleDateString(undefined, DATE_FORMAT_OPTIONS);
}

export function truncateText(text: string | null, maxLength = 35): string {
	if (!text) return '';
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength - 3)}...`;
}

export function truncateFilename(filename: string | undefined, maxLength = 35): string {
	if (!filename) return '';
	if (filename.length <= maxLength) return filename;
	const extension = filename.split('.').pop() || '';
	const nameWithoutExt = filename.slice(0, filename.length - extension.length - 1);
	const truncatedName = nameWithoutExt.slice(0, maxLength - extension.length - 4);
	return `${truncatedName}...${extension}`;
}
