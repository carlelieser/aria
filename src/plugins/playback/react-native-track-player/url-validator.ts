/**
 * URL Validator
 *
 * Validates whether a given URL can be handled by the RNTP playback provider.
 */

const SUPPORTED_EXTENSIONS = ['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.flac'];

export class UrlValidator {
	canHandle(url: string): boolean {
		if (this._isDashStream(url)) {
			return false;
		}

		if (this._isHlsStream(url)) {
			return false;
		}

		if (this._hasSupportedExtension(url)) {
			return true;
		}

		if (this._isLocalFile(url)) {
			return true;
		}

		if (this._isHttpUrl(url)) {
			return true;
		}

		return false;
	}

	private _isDashStream(url: string): boolean {
		return (
			url.startsWith('data:application/dash+xml') ||
			url.endsWith('.mpd') ||
			url.includes('manifest/dash')
		);
	}

	private _isHlsStream(url: string): boolean {
		return url.includes('.m3u8') || url.includes('manifest/hls');
	}

	private _hasSupportedExtension(url: string): boolean {
		return SUPPORTED_EXTENSIONS.some((ext) => url.endsWith(ext));
	}

	private _isLocalFile(url: string): boolean {
		return url.startsWith('file://') || url.startsWith('/');
	}

	private _isHttpUrl(url: string): boolean {
		return url.startsWith('http://') || url.startsWith('https://');
	}
}
