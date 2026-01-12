/**
 * Extract audio format from file path.
 */
export function getFormatFromPath(
	filePath: string
): 'mp3' | 'aac' | 'opus' | 'flac' | 'webm' | 'ogg' | 'm4a' | 'wav' {
	const ext = filePath.split('.').pop()?.toLowerCase();
	const validFormats = ['mp3', 'aac', 'opus', 'flac', 'webm', 'ogg', 'm4a', 'wav'] as const;

	if (ext && validFormats.includes(ext as (typeof validFormats)[number])) {
		return ext as (typeof validFormats)[number];
	}

	return 'mp3';
}
