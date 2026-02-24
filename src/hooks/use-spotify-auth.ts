/**
 * useSpotifyAuth Hook
 *
 * Presentation-layer bridge for Spotify OAuth operations.
 * Delegates to the application-layer Spotify auth facade.
 */

export {
	SPOTIFY_OAUTH_REDIRECT_URI,
	getSpotifyAuthManager,
} from '@/src/application/services/spotify-auth-facade';
