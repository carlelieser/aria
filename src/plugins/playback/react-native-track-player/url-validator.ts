/**
 * URL Validator
 *
 * Validates whether a given URL can be handled by the RNTP playback provider.
 */

const SUPPORTED_EXTENSIONS = ['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.flac'];

export class UrlValidator {
	canHandle(url: string): boolean {
		if (url.startsWith('data:application/dash+xml')) {
			return false;
		}

		if (this.isHlsStream(url)) {
			return false;
		}

		if (this.hasSupportedExtension(url)) {
			return true;
		}

		if (this.isLocalFile(url)) {
			return true;
		}

		if (this.isHttpUrl(url)) {
			return true;
		}

		return false;
	}

	private isHlsStream(url: string): boolean {
		return url.includes('.m3u8') || url.includes('manifest/hls');
	}

	private hasSupportedExtension(url: string): boolean {
		return SUPPORTED_EXTENSIONS.some((ext) => url.endsWith(ext));
	}

	private isLocalFile(url: string): boolean {
		return url.startsWith('file://') || url.startsWith('/');
	}

	private isHttpUrl(url: string): boolean {
		return url.startsWith('http://') || url.startsWith('https://');
	}
}
