import { useState, useEffect, useRef } from 'react';
import { getColors, ImageColorsResult } from 'react-native-image-colors';
import { Platform } from 'react-native';

export interface ArtworkColors {
	readonly dominant: string | null;
	readonly secondary: string | null;
	readonly isLoading: boolean;
	readonly error: string | null;
}

const DEFAULT_COLORS: ArtworkColors = {
	dominant: null,
	secondary: null,
	isLoading: false,
	error: null,
};

const LOADING_COLORS: ArtworkColors = {
	dominant: null,
	secondary: null,
	isLoading: true,
	error: null,
};

function extractColorsFromResult(
	result: ImageColorsResult
): Pick<ArtworkColors, 'dominant' | 'secondary'> {
	switch (result.platform) {
		case 'android':
			return {
				dominant: result.dominant ?? result.vibrant ?? null,
				secondary: result.muted ?? result.darkVibrant ?? null,
			};
		case 'ios':
			return {
				dominant: result.primary ?? result.background ?? null,
				secondary: result.secondary ?? result.detail ?? null,
			};
		case 'web':
			return {
				dominant: result.dominant ?? result.vibrant ?? null,
				secondary: result.muted ?? result.darkVibrant ?? null,
			};
		default:
			return { dominant: null, secondary: null };
	}
}

export function useArtworkColors(artworkUrl: string | undefined): ArtworkColors {
	const [colors, setColors] = useState<ArtworkColors>(DEFAULT_COLORS);
	const prevUrlRef = useRef<string | undefined>(undefined);
	const isMountedRef = useRef(true);

	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	useEffect(() => {
		if (!artworkUrl) {
			setColors(DEFAULT_COLORS);
			prevUrlRef.current = undefined;
			return;
		}

		if (prevUrlRef.current === artworkUrl) {
			return;
		}

		prevUrlRef.current = artworkUrl;
		setColors(LOADING_COLORS);

		const extractColors = async () => {
			try {
				const result = await getColors(artworkUrl, {
					fallback: '#7C3AED',
					cache: true,
					key: artworkUrl,
					...(Platform.OS === 'android' && {
						pixelSpacing: 5,
						quality: 'low',
					}),
				});

				if (!isMountedRef.current) return;

				const extracted = extractColorsFromResult(result);
				setColors({
					...extracted,
					isLoading: false,
					error: null,
				});
			} catch (err) {
				if (!isMountedRef.current) return;

				setColors({
					dominant: null,
					secondary: null,
					isLoading: false,
					error: err instanceof Error ? err.message : 'Failed to extract colors',
				});
			}
		};

		extractColors();
	}, [artworkUrl]);

	return colors;
}
