# Tidal Plugin Implementation Plan

## Overview

Full metadata + audio source provider with DRM support. Lives at `src/plugins/metadata/tidal/`. The most technically complex plugin due to DRM and hi-res audio.

## 1. API Strategy

### API Landscape

Tidal does not publish a stable public REST API for third-party developers.

**Recommended: Reverse-engineered `api.tidal.com/v1/` API.** The community has documented these extensively through projects like Python's `tidalapi`. Key endpoints follow predictable REST patterns.

**Official Developer Portal (Insufficient):** Read-only metadata subset, no streaming or user library access.

### Required Endpoints

| Purpose | Endpoint |
|---|---|
| Search | `GET /v1/search` |
| Track info | `GET /v1/tracks/{id}` |
| Album info | `GET /v1/albums/{id}` |
| Album tracks | `GET /v1/albums/{id}/tracks` |
| Artist info | `GET /v1/artists/{id}` |
| Artist top tracks | `GET /v1/artists/{id}/toptracks` |
| Artist albums | `GET /v1/artists/{id}/albums` |
| Playlist info | `GET /v1/playlists/{uuid}` |
| Playlist tracks | `GET /v1/playlists/{uuid}/tracks` |
| Stream resolution | `GET /v1/tracks/{id}/playbackinfopostpaywall` |
| User favorites | `GET /v1/users/{userId}/favorites/tracks` |
| User playlists | `GET /v1/users/{userId}/playlists` |
| Home feed | `GET /v1/pages/home` |
| Track credits | `GET /v1/tracks/{id}/credits` |
| Track lyrics | `GET /v1/tracks/{id}/lyrics` |
| OAuth2 token | `POST https://auth.tidal.com/v1/oauth2/token` |
| Device auth | `GET https://auth.tidal.com/v1/oauth2/device_authorization` |

### Rate Limits

Empirical: ~100 requests/minute sustained. 429 responses with `Retry-After` header. Per-IP and per-token limiting.

### Required Headers

- `Authorization: Bearer {accessToken}`
- `X-Tidal-Token: {clientId}` (some older endpoints)
- `Content-Type: application/json`
- `countryCode` parameter on most endpoints

---

## 2. Plugin Structure

```
src/plugins/metadata/tidal/
  config.ts                      # PluginManifest, PluginConfigSchema, constants
  plugin-module.ts               # PluginModule factory
  tidal-provider.ts              # Main provider class
  client.ts                      # TidalClient (HTTP, rate limiting, auth-aware)
  auth.ts                        # TidalAuthManager (OAuth2 PKCE device auth)
  types.ts                       # Raw Tidal API response types
  mappers.ts                     # Tidal -> Aria domain entity mappers
  search.ts                      # SearchOperations
  info.ts                        # InfoOperations (track, album, artist, playlist, lyrics, credits)
  streaming.ts                   # StreamingOperations (stream URL resolution, quality negotiation)
  recommendations.ts             # RecommendationOperations
  library.ts                     # LibraryOperations (favorites, playlists, saved albums)
  import-operations.ts           # ImportOperations (library import)
  home-feed-operations.ts        # HomeFeedOperations (editorial content, mixes)
  credits.ts                     # Credits/liner notes operations (Tidal-unique)
  quality.ts                     # Audio quality tier resolution, subscription-aware format selection
  index.ts                       # Barrel exports
```

---

## 3. Capabilities

### MetadataProvider

```typescript
export const METADATA_CAPABILITIES: MetadataCapability[] = [
  'search-tracks',
  'search-albums',
  'search-artists',
  'search-playlists',
  'get-track-info',
  'get-album-info',
  'get-artist-info',
  'get-playlist-info',
  'get-album-tracks',
  'get-artist-albums',
  'get-lyrics',          // Built-in synced lyrics
  'get-recommendations',
  'get-charts',
];
```

### AudioSourceProvider

```typescript
export const AUDIO_CAPABILITIES: AudioSourceCapability[] = [
  'get-stream-url',
  'get-formats',
  'quality-selection',
  'format-selection',
  'adaptive-streaming',
  'drm',                 // First plugin to declare this
];
```

### Other Interfaces
- `OAuthCapablePlugin`: Full OAuth2 PKCE
- `HomeFeedProvider`: Rich editorial content, mixes, personalized recommendations

---

## 4. Data Mapping

### Image URL Construction

Tidal uses UUID-based template system:
```typescript
// "ab12cd34-ef56-7890-abcd-ef1234567890" ->
// "https://resources.tidal.com/images/ab12cd34/ef56/7890/abcd/ef1234567890/640x640.jpg"
function buildTidalImageUrl(imageId: string | null, width: number, height: number): string | null
```

### Key Mappings

| Tidal Field | Aria Field | Notes |
|---|---|---|
| `track.id` (number) | `TrackId.create('tidal', String(id))` | Cast to string |
| `track.duration` (seconds) | `Duration.fromSeconds()` | NOT milliseconds |
| `track.volumeNumber` | `metadata.discNumber` | Different field name |
| `track.audioQuality` | Quality metadata | Tidal-specific |
| `track.audioModes` | Audio mode metadata | `STEREO`, `DOLBY_ATMOS`, `SONY_360RA` |
| `album.type` | `albumType` | `ALBUM` -> `album`, `SINGLE` -> `single`, etc. |
| `playlist.uuid` | `Playlist.id` | Already a string UUID |

---

## 5. Streaming and Audio Quality

### Quality Tiers

| Tidal Quality | Codec | Bitrate | DRM Required |
|---|---|---|---|
| `LOW` | AAC-LC | 96 kbps | No |
| `HIGH` | AAC-LC | 320 kbps | No |
| `LOSSLESS` | FLAC | ~1411 kbps | Yes (Widevine) |
| `HI_RES` | MQA (FLAC container) | ~24-bit | Yes (Widevine) |
| `HI_RES_LOSSLESS` | FLAC | Up to 192 kHz | Yes (Widevine) |

Dolby Atmos: E-AC-3 JOC in MP4, always DRM-protected.
Sony 360 Reality Audio: MPEG-H 3D Audio, always DRM-protected.

### Stream Resolution Flow

1. Call `GET /v1/tracks/{id}/playbackinfopostpaywall` with `audioquality`, `playbackmode=STREAM`, `assetpresentation=FULL`
2. Parse `TidalPlaybackInfo` response:
   - `manifestMimeType: 'application/vnd.tidal.bts'` -> BTS manifest (non-DRM, direct URL)
   - `manifestMimeType: 'application/dash+xml'` -> DASH MPD (DRM-protected)
3. Decode base64 `manifest` field

**BTS manifests (LOW/HIGH):**
- Decode to JSON: `{ mimeType: "audio/mp4", codecs: "mp4a.40.2", urls: ["https://..."] }`
- Extract direct URL from `urls[0]`
- Directly playable by react-native-track-player

**DASH manifests (LOSSLESS/HI_RES/HI_RES_LOSSLESS/ATMOS):**
- Decode to DASH MPD XML
- Extract PSSH (Widevine), segment URLs, codec info
- Requires DRM license acquisition from `https://sp-licensing.dl.tidal.com/license`

### Critical Insight

**AAC tiers (LOW/HIGH) are accessible without any DRM module.** The BTS manifest provides direct URLs playable by any HTTP-capable audio player with proper auth headers.

### Quality Resolution

```typescript
interface QualityConfig {
  readonly preferredQuality: TidalAudioQuality;
  readonly subscriptionTier: 'FREE' | 'HIFI' | 'HIFI_PLUS';
  readonly allowDolbyAtmos: boolean;
  readonly allow360RA: boolean;
  readonly wifiOnlyHighRes: boolean;
}
```

Mapping: `'low'` -> `LOW`, `'medium'` -> `HIGH`, `'high'` -> `LOSSLESS`, `'lossless'` -> `HI_RES_LOSSLESS`

---

## 6. Authentication

### OAuth2 PKCE Flow

Extends `BaseAuthManager` using `expo-crypto` for PKCE (same as Spotify).

**Auth endpoints:**
- Token: `POST https://auth.tidal.com/v1/oauth2/token`
- Authorization: `https://login.tidal.com/authorize`
- Device auth: `POST https://auth.tidal.com/v1/oauth2/device_authorization`
- Redirect URI: `aria://tidal/callback`

**Critical**: Token response includes `userId` and `countryCode` needed as parameters on almost every API call. These must be stored in auth state.

**Alternative: Device Code Flow** (useful for TV apps, can be added later):
1. POST to device_authorization, get `device_code` + `user_code`
2. User visits `https://link.tidal.com/{user_code}`
3. Poll token endpoint until approved

---

## 7. Unique Features

### Credits/Liner Notes
- `/v1/tracks/{id}/credits` returns Producer, Songwriter, Mixer, Mastering Engineer, etc.
- Surface via `ActionsProvider` ("View Credits" action) or dedicated credits view

### Synced Lyrics
- `/v1/tracks/{id}/lyrics` returns lyrics with LRC-format `subtitles` field
- Maps to the shared `Lyrics` type in `src/shared/types/lyrics.ts`

### Dolby Atmos / Sony 360 Reality Audio
- Phase 1: Detect and report via metadata badges, do not attempt playback
- Phase 2: Integrate with platform-level decoders (ExoPlayer on Android, AVPlayer on iOS)

### MQA (Master Quality Authenticated)
- Stored in FLAC containers. Base quality is 16-bit/44.1 kHz FLAC
- Software MQA unfolding is out of scope for Phase 1

### Editorial Content and Mixes
- `/v1/pages/home` and `/v1/pages/explore` return rich curated content
- Tidal Mixes: My Mix, Artist Mix, Track Mix, Mood Mix (dynamically generated playlists)

---

## 8. DRM Considerations

### Architecture

License server: `https://sp-licensing.dl.tidal.com/license`

**DRM Flow:**
1. Get DASH MPD manifest (base64 encoded)
2. Parse MPD XML, extract PSSH (ContentProtection element)
3. Send PSSH to Widevine CDM to generate license request
4. POST license request to Tidal's license server with auth token
5. CDM processes license response -> decrypt content keys
6. Feed encrypted segments to CDM-aware player

### Widevine Security Levels
- **L1** (hardware-backed): Highest quality streams available
- **L3** (software): Sufficient for audio content up to lossless

### React Native Integration
- Project already has `shaka-player` dependency and a DASH playback plugin
- Android: ExoPlayer supports Widevine L1/L3 natively via `MediaDrmCallback`
- iOS: Widevine requires proprietary CDM module (NDA from Google). Practical approach: cap at `HIGH` (320 kbps AAC) on iOS unless Widevine solution is implemented

---

## 9. Subscription Tiers

| Tier | Max Quality | Audio Modes |
|---|---|---|
| Free | `HIGH` (320 kbps AAC) | Stereo |
| HiFi | `LOSSLESS` (CD FLAC) | Stereo |
| HiFi Plus | `HI_RES_LOSSLESS` + Atmos + 360RA | All |

Determined via `/v1/users/{userId}/subscription` endpoint.

Plugin config exposes quality selection:
```typescript
{
  key: 'quality',
  type: 'select',
  label: 'Audio Quality',
  options: [
    { label: 'Normal (96 kbps)', value: 'LOW' },
    { label: 'High (320 kbps)', value: 'HIGH' },
    { label: 'HiFi (Lossless)', value: 'LOSSLESS' },
    { label: 'Master (MQA)', value: 'HI_RES' },
    { label: 'Max (Hi-Res FLAC)', value: 'HI_RES_LOSSLESS' },
  ],
  defaultValue: 'HIGH',
}
```

---

## 10. Type System Updates

### Domain Value Objects
- `track-id.ts`: Add `'tidal'` to `SourceType` union
- `album-id.ts`: Add `'tidal'` to `AlbumSourceType` union
- `audio-stream.ts`: Add `'dash'` to `AudioFormat` (Phase 2)
- `audio-source.ts`: Consider adding `'hires'` to `StreamQuality` (Phase 2)

### Tidal API Types (`types.ts`)

Key types: `TidalTrack`, `TidalAlbum`, `TidalArtist`, `TidalPlaylist`, `TidalPlaybackInfo`, `TidalSearchResponse`, `TidalCredit`, `TidalLyrics`, `TidalPageModule`, `TidalMediaMetadata`

Key enums: `TidalAudioQuality` (`LOW` | `HIGH` | `LOSSLESS` | `HI_RES` | `HI_RES_LOSSLESS`), `TidalAudioMode` (`STEREO` | `DOLBY_ATMOS` | `SONY_360RA`)

---

## 11. Testing Strategy

### Unit Test Files
```
src/plugins/metadata/tidal/__tests__/
  mappers.test.ts           # All Tidal -> Aria mappers, image URL construction
  auth.test.ts              # PKCE, token exchange/refresh, storage
  quality.test.ts           # Quality resolution per subscription tier
  streaming.test.ts         # BTS manifest parsing, DASH detection, quality fallback
  client.test.ts            # Rate limiting, auth header injection, country code
  search.test.ts            # Search result parsing, pagination
```

### Key Test Cases
- `buildTidalImageUrl()`: UUID to URL conversion
- BTS manifest parsing: base64 decode -> JSON -> URL extraction
- DASH manifest detection for graceful degradation
- Quality fallback chain (subscription limiting)
- Numeric ID -> string conversion
- Duration from seconds (not milliseconds)
- Token refresh on 401

### Mock Fixtures
```
__fixtures__/
  track-response.json
  album-response.json
  search-response.json
  playback-info-bts.json        # BTS manifest (AAC, non-DRM)
  playback-info-dash.json       # DASH manifest (FLAC/DRM)
  credits-response.json
  lyrics-response.json
  home-page-response.json
  subscription-response.json
```

---

## 12. Implementation Sequence

### Phase 1: Core Plugin (Non-DRM)

1. `types.ts` -- Tidal API response types
2. `config.ts` -- Plugin manifest, config schema, constants
3. `auth.ts` -- TidalAuthManager with OAuth2 PKCE
4. `client.ts` -- TidalClient with authenticated requests, rate limiting
5. `mappers.ts` -- All Tidal -> domain entity mappers
6. `quality.ts` -- Quality tier resolution and subscription awareness
7. `search.ts` -- Search operations
8. `info.ts` -- Track/album/artist/playlist info + lyrics + credits
9. `streaming.ts` -- BTS manifest (AAC) stream resolution
10. `recommendations.ts` -- Tidal mixes/radio
11. `library.ts` -- User favorites, playlists, saved albums
12. `import-operations.ts` -- Library import
13. `home-feed-operations.ts` -- Tidal home/explore pages
14. `credits.ts` -- Track credits/liner notes
15. `tidal-provider.ts` -- Main provider class
16. `plugin-module.ts` -- Plugin module factory
17. `index.ts` -- Barrel exports
18. Register in `plugin-index.ts`
19. Update type unions in `track-id.ts`, `album-id.ts`

### Phase 2: DRM and Hi-Res Audio

1. DASH manifest parser (base64 -> MPD XML)
2. Widevine license acquisition
3. Integration with DASH playback plugin
4. ExoPlayer DRM configuration (Android)
5. iOS DRM strategy
6. Add `'dash'` to AudioFormat, `'hires'` to StreamQuality

### Phase 3: Enhanced Features

1. Dolby Atmos playback
2. Device code authentication flow
3. Tidal Connect remote playback
4. Offline mode with DRM license caching
5. MQA software unfolding
