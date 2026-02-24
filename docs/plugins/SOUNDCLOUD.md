# SoundCloud Plugin Implementation Plan

## Overview

Full metadata + audio source provider (like YouTube Music). Lives at `src/plugins/metadata/soundcloud/`.

## 1. API Strategy

### Public API

SoundCloud maintains an official public API at `developers.soundcloud.com/docs` requiring app registration at `soundcloud.com/you/apps`.

**Authentication modes:**

- **Client Credentials**: Public-only access (search, playback, URL resolution). No user session needed.
- **Authorization Code + PKCE**: User-specific data (likes, playlists, reposts, private tracks). SoundCloud mandates PKCE for all auth code exchanges.

### Critical API Timeline

1. **URN Migration (June 30, 2025)**: Numeric `id` field is deprecated. All identifiers must use the `urn` field (e.g., `soundcloud:tracks:123456`). The plugin MUST use URN-based identifiers from day one.
2. **AAC HLS Migration (November 15, 2025)**: MP3 and Opus transcodings are deprecated in favor of `hls_aac_160_url` and `hls_aac_96_url`.

### Required Endpoints

| Purpose        | Endpoint                                                | Auth Required      |
| -------------- | ------------------------------------------------------- | ------------------ |
| Search         | `GET /tracks`, `GET /playlists`, `GET /users` with `q=` | Client Credentials |
| Track info     | `GET /tracks/{urn}`                                     | Client Credentials |
| Stream URL     | `GET /tracks/{urn}/streams`                             | Client Credentials |
| Resolve URL    | `GET /resolve?url=PERMALINK`                            | Client Credentials |
| User info      | `GET /users/{urn}`                                      | Client Credentials |
| User tracks    | `GET /users/{urn}/tracks`                               | Client Credentials |
| Playlist info  | `GET /playlists/{urn}`                                  | Client Credentials |
| User likes     | `GET /me/likes`                                         | Authorization Code |
| User playlists | `GET /me/playlists`                                     | Authorization Code |
| User reposts   | `GET /me/reposts`                                       | Authorization Code |
| Like a track   | `POST /me/likes/tracks/{urn}`                           | Authorization Code |
| Follow user    | `PUT /me/followings/{urn}`                              | Authorization Code |
| Track comments | `GET /tracks/{urn}/comments`                            | Client Credentials |

### Rate Limits

Stream-related requests: 15,000 per 24-hour window. General API requests have separate limits. HTTP 429 responses include `Retry-After` headers.

### NPM Library Decision

**Do NOT use `soundcloud.ts` or similar wrappers.** They rely on scraping `client_id` from web traffic and use the undocumented v2 API, violating ToS. Build a thin HTTP client (matching the `SpotifyClient` pattern) targeting the official API.

---

## 2. Plugin Structure

```
src/plugins/metadata/soundcloud/
  config.ts                      # PluginManifest, config schema, constants
  plugin-module.ts               # PluginModule factory with lazy loading
  soundcloud-provider.ts         # Main provider class implementing interfaces
  client.ts                      # SoundCloudClient HTTP wrapper + rate limiting
  auth.ts                        # SoundCloudAuthManager extending BaseAuthManager
  types.ts                       # SoundCloud API response type definitions
  mappers.ts                     # SC -> Aria domain entity mappers
  search.ts                      # SearchOperations factory
  info.ts                        # InfoOperations factory
  streaming.ts                   # StreamingOperations factory (stream URL resolution)
  recommendations.ts             # RecommendationOperations (related tracks)
  home-feed-operations.ts        # HomeFeedOperations (charts, trending, discover)
  library.ts                     # LibraryOperations (likes, playlists, following)
  import-operations.ts           # ImportOperations (import likes/playlists to Aria)
  index.ts                       # Barrel exports
```

---

## 3. Capabilities

### MetadataCapability Support

| Capability            | Supported | Notes                                   |
| --------------------- | --------- | --------------------------------------- |
| `search-tracks`       | YES       | `GET /tracks?q=`                        |
| `search-albums`       | NO        | SoundCloud has no album concept         |
| `search-artists`      | YES       | Mapped from `GET /users?q=`             |
| `search-playlists`    | YES       | `GET /playlists?q=` (SoundCloud "sets") |
| `get-track-info`      | YES       | `GET /tracks/{urn}`                     |
| `get-album-info`      | NO        | No album entity exists on SoundCloud    |
| `get-artist-info`     | YES       | Mapped from `GET /users/{urn}`          |
| `get-playlist-info`   | YES       | `GET /playlists/{urn}`                  |
| `get-album-tracks`    | NO        | N/A                                     |
| `get-artist-albums`   | NO        | SoundCloud users don't have albums      |
| `get-lyrics`          | NO        | SoundCloud does not provide lyrics      |
| `get-recommendations` | YES       | `GET /tracks/{urn}/related`             |
| `get-charts`          | YES       | SoundCloud trending/top charts          |

### AudioSourceCapability Support

| Capability           | Supported | Notes                                             |
| -------------------- | --------- | ------------------------------------------------- |
| `get-stream-url`     | YES       | `GET /tracks/{urn}/streams` returns HLS URLs      |
| `get-formats`        | YES       | API returns available transcodings                |
| `quality-selection`  | PARTIAL   | Free: 128kbps MP3 / 64kbps Opus. Go+: 256kbps AAC |
| `adaptive-streaming` | YES       | HLS is adaptive by nature                         |
| `drm`                | NO        | SoundCloud doesn't use DRM                        |

---

## 4. Data Mapping

### The Album Problem

SoundCloud has NO album entity. This is the single biggest conceptual mismatch with Aria's domain model:

- **SoundCloud Track** -> **Aria `Track`** (direct mapping)
- **SoundCloud User** -> **Aria `Artist`** (users are the closest analogue to artists)
- **SoundCloud Playlist/Set** -> **Aria `Playlist`** (direct mapping)
- **SoundCloud Album** -> **NOT MAPPED**

### Track Mapping

```
SC track.urn               -> TrackId.create('soundcloud', extractIdFromUrn(urn))
SC track.title             -> Track.title
SC track.user              -> Track.artists (single ArtistReference)
SC track.duration (ms)     -> Duration.fromMilliseconds(track.duration)
SC track.artwork_url       -> Track.artwork (upgrade URL template to large size)
SC track.genre             -> Track.metadata.genre
SC track.created_at        -> Track.metadata.year (extract year)
SC track.playback_count    -> Track.metadata.popularity (normalized)
SC track.waveform_url      -> (stored in metadata as custom field)
```

### User -> Artist Mapping

```
SC user.urn                -> Artist.id (e.g., 'soundcloud:12345')
SC user.username           -> Artist.name
SC user.avatar_url         -> Artist.artwork (upgrade to t500x500 size)
SC user.description        -> Artist.bio
SC user.followers_count    -> Artist.monthlyListeners (approximate proxy)
```

### Artwork URL Upgrade

SoundCloud artwork URLs contain size tokens like `-large`, `-t500x500`, `-original`:

```typescript
function upgradeSoundCloudArtworkUrl(url: string): string {
	return url.replace(/-large\b/, '-t500x500');
}
```

---

## 5. Streaming

### Stream URL Resolution

The `/tracks/{urn}/streams` endpoint returns available transcodings:

```typescript
interface SoundCloudStreamsResponse {
	readonly hls_aac_160_url?: string; // Go+ or high quality
	readonly hls_aac_96_url?: string; // Standard quality
	// Deprecated (removing Nov 2025):
	readonly http_mp3_128_url?: string;
	readonly hls_mp3_128_url?: string;
	readonly hls_opus_64_url?: string;
	readonly preview_mp3_128_url?: string;
}
```

### Quality Tier Strategy

| Requested Quality | Free Tier                     | Go+ Tier                        |
| ----------------- | ----------------------------- | ------------------------------- |
| `high`            | `hls_aac_96_url` (96kbps AAC) | `hls_aac_160_url` (160kbps AAC) |
| `medium`          | `hls_aac_96_url`              | `hls_aac_96_url`                |
| `low`             | `hls_aac_96_url`              | `hls_aac_96_url`                |

Stream URLs expire. `AudioStream.expiresAt` must be set, and `onStreamError` should trigger a fresh fetch.

---

## 6. Authentication

### OAuth2 Flow

Following the `SpotifyAuthManager` pattern, extending `BaseAuthManager`:

**Constants:**

```typescript
export const SOUNDCLOUD_CLIENT_ID = '<registered_app_client_id>';
export const SOUNDCLOUD_CLIENT_SECRET = '<registered_app_client_secret>';
export const SOUNDCLOUD_REDIRECT_URI = 'aria://soundcloud/callback';
export const SOUNDCLOUD_TOKEN_URL = 'https://secure.soundcloud.com/oauth/token';
export const SOUNDCLOUD_AUTH_URL = 'https://secure.soundcloud.com/authorize';
```

**Key differences from Spotify:**

- SoundCloud requires `client_secret` in token exchange (confidential client)
- Access tokens have a 6-hour TTL
- `display=popup` parameter should be added for mobile optimization

**Dual-mode client**: Uses Client Credentials for public operations AND an optional user token for personalized features.

---

## 7. Unique Features

### Reposts

- Custom home feed section: "Your Reposts" and "Stream" (activity feed)
- `GET /me/activities` returns a mixed feed of likes, reposts, and follows

### Waveform Data

- `waveform_url` on every track, pointing to JSON amplitude data
- Stored in `Track.metadata` as `waveformUrl: string`
- Future: waveform-based progress bar in player UI

### Comments

- Timed comments on tracks
- `commentCount` in track metadata
- Future: timed-comments display in player UI (similar to lyrics)

### Likes

- "Like on SoundCloud" action via `ActionsProvider`

---

## 8. Edge Cases

### Geo-Restrictions

- Check `track.policy` field (`ALLOW`, `BLOCK`, `SNIP` for preview-only)
- Check `track.access` field: `playable`, `preview`, `blocked`

### Private Tracks

- Only accessible with authenticated token from track's owner
- Check `track.sharing` field: `public` or `private`

### Go+ vs Free Tier

- Free users may get "preview-only" tracks for Go+-exclusive content
- `track.monetization_model` and `track.policy` indicate tier restrictions
- Higher quality transcodings may not be available for free-tier users

### API Deprecation Risks

1. URN Migration: Use `urn` field for all identifiers
2. AAC HLS Migration: Prefer `hls_aac_*` URLs, fall back to legacy formats only until deprecation
3. App Registration: SoundCloud periodically restricts new registrations

---

## 9. Type System Updates

### `track-id.ts` SourceType

Add `'soundcloud'` to the union.

### `album-id.ts` AlbumSourceType

Add `'soundcloud'` to the union.

### SoundCloud API Types (`types.ts`)

Key types to define:

- `SoundCloudUser`
- `SoundCloudTrack` (with `media.transcodings`, `policy`, `access`, `waveform_url`)
- `SoundCloudPlaylist`
- `SoundCloudTranscoding` (with `format.protocol`, `format.mime_type`, `quality`)
- `SoundCloudStreamsResponse`
- `SoundCloudSearchResponse<T>`
- `SoundCloudActivity` / `SoundCloudActivitiesResponse`
- `SoundCloudTokenResponse`
- `SoundCloudErrorResponse`

### Plugin Registration

In `src/plugins/plugin-index.ts`:

```typescript
{
  manifest: SOUNDCLOUD_MANIFEST,
  load: async () => {
    const { SoundCloudPluginModule } = await import('./metadata/soundcloud/plugin-module');
    return SoundCloudPluginModule;
  },
  isBuiltIn: false,
},
```

---

## 10. Testing Strategy

### Unit Test Files

```
src/plugins/metadata/soundcloud/__tests__/
  mappers.test.ts               # SC -> Aria entity mappings
  auth.test.ts                  # Token exchange, refresh, PKCE
  client.test.ts                # Request construction, rate limiting, errors
  search.test.ts                # Search result parsing, pagination
  info.test.ts                  # Track/user/playlist detail fetching
  streaming.test.ts             # Stream URL selection, quality, expiry
  recommendations.test.ts       # Related tracks mapping
  home-feed-operations.test.ts  # Feed section construction
```

### Key Test Cases

- Track with null artwork
- Track with `access: 'blocked'`
- Artwork URL upgrade (large -> t500x500)
- Duration mapping from milliseconds
- URN parsing and ID extraction
- PKCE code_verifier/code_challenge generation
- Rate limit detection and 429 handling
- Selecting highest quality transcoding
- Handling `SNIP` policy (preview-only) tracks
- Stream URL expiry detection

---

## 11. Implementation Sequence

### Phase 1: Foundation

1. `config.ts` with manifest, constants, and schema
2. `types.ts` with all API response interfaces
3. `auth.ts` with SoundCloudAuthManager (PKCE + Client Credentials)
4. `client.ts` with SoundCloudClient (HTTP wrapper with rate limiting)

### Phase 2: Data Layer

5. `mappers.ts` with all entity mapping functions
6. `search.ts` with SearchOperations
7. `info.ts` with InfoOperations
8. Update SourceType unions in domain value objects

### Phase 3: Streaming

9. `streaming.ts` with StreamingOperations
10. AAC HLS stream URL resolution and quality selection
11. Stream URL caching and expiry

### Phase 4: Provider Assembly

12. `soundcloud-provider.ts` implementing MetadataProvider, AudioSourceProvider, OAuthCapablePlugin
13. `plugin-module.ts` with factory
14. Register in `plugin-index.ts`

### Phase 5: Advanced Features

15. `recommendations.ts` (related tracks)
16. `home-feed-operations.ts` (trending, charts, activity stream)
17. `library.ts` (likes, playlists, following)
18. `import-operations.ts` (import likes/playlists to Aria library)

### Phase 6: Testing

19. Unit tests for all modules
20. Mock fixture data
21. Integration test the full search-to-playback flow
