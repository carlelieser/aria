# Deezer Plugin Implementation Plan

## Overview

Metadata-only provider (like Spotify). The public API only provides 30-second preview URLs -- full streaming is not feasible. Playback resolves through YouTube Music's cross-source search. Lives at `src/plugins/metadata/deezer/`.

## 1. API Strategy

### Base URL
`https://api.deezer.com`

### Authentication
Deezer uses a **non-standard OAuth2 flow** (NOT PKCE):
1. Redirect to `https://connect.deezer.com/oauth/auth.php?app_id={APP_ID}&redirect_uri={REDIRECT_URI}&perms={SCOPES}`
2. User grants permissions; Deezer redirects with `?code={CODE}`
3. Exchange code via `https://connect.deezer.com/oauth/access_token.php?app_id={APP_ID}&secret={APP_SECRET}&code={CODE}`
4. Response is **URL-encoded** (NOT JSON): `access_token=TOKEN&expires=SECONDS`

**Critical**: Deezer requires `app_secret` in token exchange. No PKCE support. Secret must be embedded in app (same trade-off as Spotify's client ID).

### Rate Limits
50 requests per 5-second window per IP/token. HTTP 429 when exceeded.

### OAuth Scopes
| Scope | Purpose |
|---|---|
| `basic_access` | Read user info, access public data |
| `email` | Access user email |
| `offline_access` | Token does not expire |
| `manage_library` | Add/remove tracks, albums, artists to favorites |
| `listening_history` | Access listening history |

### Available Endpoints

| Endpoint | Auth Required | Description |
|---|---|---|
| `GET /search/track` | No | Search tracks |
| `GET /search/album` | No | Search albums |
| `GET /search/artist` | No | Search artists |
| `GET /search/playlist` | No | Search playlists |
| `GET /track/{id}` | No | Track details (includes `preview` URL) |
| `GET /album/{id}` | No | Album details |
| `GET /album/{id}/tracks` | No | Album tracklist |
| `GET /artist/{id}` | No | Artist details |
| `GET /artist/{id}/top` | No | Artist top tracks |
| `GET /artist/{id}/albums` | No | Artist albums |
| `GET /artist/{id}/related` | No | Related artists |
| `GET /playlist/{id}` | No | Playlist details |
| `GET /genre` | No | List all genres |
| `GET /chart` | No | Overall charts |
| `GET /chart/{genre_id}/tracks` | No | Charts by genre |
| `GET /editorial` | No | List editorials |
| `GET /editorial/{id}/selection` | No | Curated selections |
| `GET /editorial/{id}/releases` | No | New releases |
| `GET /radio` | No | List radios |
| `GET /user/me` | Yes | Current user info |
| `GET /user/me/tracks` | Yes | Favorite tracks |
| `GET /user/me/albums` | Yes | Favorite albums |
| `GET /user/me/playlists` | Yes | User playlists |
| `GET /user/me/flow` | Yes | Personalized Flow |
| `GET /user/me/recommendations/tracks` | Yes | Recommended tracks |
| `GET /user/me/history` | Yes | Listening history |
| `POST /user/me/tracks` | Yes | Add to favorites |
| `DELETE /user/me/tracks` | Yes | Remove from favorites |

### What the Public API CANNOT Do
- **Full-length audio streaming**: Only 30-second preview URLs. Full tracks require a commercial partnership.
- **Lyrics**: No lyrics endpoint.
- **Audio features/analysis**: No equivalent of Spotify's audio features.

---

## 2. Plugin Structure

```
src/plugins/metadata/deezer/
  config.ts              # PluginManifest, constants, scopes
  types.ts               # Deezer API response type definitions
  client.ts              # DeezerClient with rate limiting
  auth.ts                # DeezerAuthManager extending BaseAuthManager
  mappers.ts             # Deezer -> Aria domain entity mappers
  search.ts              # SearchOperations
  info.ts                # InfoOperations
  charts.ts              # ChartOperations (chart/editorial endpoints)
  library.ts             # LibraryOperations (user favorites)
  recommendations.ts     # RecommendationOperations
  home-feed.ts           # DeezerHomeFeedOperations
  import-operations.ts   # ImportOperations (library import)
  streaming.ts           # StreamingOperations (preview URL playback, optional)
  deezer-provider.ts     # DeezerProvider class
  plugin-module.ts       # DeezerPluginModule factory
  index.ts               # Public exports barrel
```

---

## 3. Capabilities

### MetadataProvider

| Capability | Supported | Endpoint |
|---|---|---|
| `search-tracks` | Yes | `GET /search/track` |
| `search-albums` | Yes | `GET /search/album` |
| `search-artists` | Yes | `GET /search/artist` |
| `search-playlists` | Yes | `GET /search/playlist` |
| `get-track-info` | Yes | `GET /track/{id}` |
| `get-album-info` | Yes | `GET /album/{id}` |
| `get-artist-info` | Yes | `GET /artist/{id}` |
| `get-playlist-info` | Yes | `GET /playlist/{id}` |
| `get-album-tracks` | Yes | `GET /album/{id}/tracks` |
| `get-artist-albums` | Yes | `GET /artist/{id}/albums` |
| `get-lyrics` | No | No public API endpoint |
| `get-recommendations` | Yes (auth) | `GET /user/me/recommendations/tracks` |
| `get-charts` | Yes | `GET /chart/{genre_id}/*` |

### AudioSourceProvider

**NOT implemented as primary.** Plugin manifest sets `canStream: false`. Optionally provides 30-second preview playback as a togglable feature.

---

## 4. Data Mapping

### Key Mappings

| Deezer Field | Aria Field | Notes |
|---|---|---|
| `id` (number) | `TrackId.create('deezer', String(id))` | Numeric IDs cast to string |
| `duration` | `Duration.fromSeconds(duration)` | **SECONDS, not milliseconds** |
| `rank` | `metadata.popularity` | 0-1,000,000 scale, needs normalization |
| `explicit_lyrics` | `metadata.explicit` | |
| `cover_small/medium/big/xl` | `artwork[]` | Four named URL fields |
| `record_type` | `albumType` | `album`/`single`/`ep`/`compile` |
| `nb_fan` | `monthlyListeners` | Not exact equivalent, closest proxy |
| `preview` | Used in streaming | 30-second preview MP3 URL |
| `contributors[]` | `artists[]` | Full track has multiple |

### Artwork Mapping

Deezer provides 4 image sizes per entity:
- `cover_small` / `picture_small`: 56x56
- `cover_medium` / `picture_medium`: 250x250
- `cover_big` / `picture_big`: 500x500
- `cover_xl` / `picture_xl`: 1000x1000

```typescript
function mapDeezerImages(
  coverSmall?: string,
  coverMedium?: string,
  coverBig?: string,
  coverXl?: string
): Artwork[]
```

---

## 5. Streaming: Honest Assessment

### The 30-Second Preview Reality

The Deezer public API provides a `preview` field: a URL to a 30-second MP3 clip (128kbps). This is the **only** audio available. Full-length streaming requires a commercial partnership agreement.

### Recommended Mode: Metadata-Primary

1. Plugin categorized as `'metadata-provider'` (same as Spotify)
2. When user plays a Deezer-sourced track, YouTube Music resolves it via search (cross-source resolution already built into the architecture)
3. Optional: preview playback as a togglable "Quick Listen" feature with clear 30-second UI indication

---

## 6. Authentication

### Auth Manager

Extends `BaseAuthManager`:

```typescript
class DeezerAuthManager extends BaseAuthManager<DeezerStoredAuth, DeezerAuthState> {
  // generateAuthUrl(): builds https://connect.deezer.com/oauth/auth.php?...
  // exchangeAuthCode(code): calls token endpoint, parses URL-encoded response
  // getAccessToken(): returns stored token (no refresh needed with offline_access)
}
```

**Key differences from Spotify:**
- **No PKCE**: App secret required in token exchange
- **No refresh tokens**: With `offline_access` scope, token never expires
- **URL-encoded response**: `access_token=X&expires=Y`, not JSON
- **Comma-separated scopes**: Not space-separated

---

## 7. Unique Features

### Flow (Personalized Radio)
- `GET /user/me/flow` returns a personalized infinite stream of tracks
- Maps to `HomeFeedProvider.getHomeFeed()` as a "Your Flow" section
- Supports `loadMore()` for infinite scrolling

### Charts by Country/Genre
- `GET /chart/{genre_id}/tracks|albums|artists`
- Combined with `GET /genre` for the genre list
- Region-specific editorial content

### Editorial Content
- `GET /editorial/{id}/selection`, `/charts`, `/releases`
- Each editorial ID represents a country/region
- Perfect for localized home feed

### Genre Browsing
- `GET /genre` lists all Deezer genres with pictures
- `GET /genre/{id}/artists` returns genre artists
- Unique browsing mode for home feed or genre exploration

### Radio Stations
- `GET /radio` and `GET /radio/{id}/tracks`
- Pre-built radio playlists

### Rich Recommendations
- Four recommendation types (auth required):
  - `GET /user/me/recommendations/tracks`
  - `GET /user/me/recommendations/albums`
  - `GET /user/me/recommendations/artists`
  - `GET /user/me/recommendations/playlists`

### Home Feed Composition
```typescript
// Always available (no auth):
// 1. "Top Charts" from GET /chart/0/tracks
// 2. "New Releases" from GET /editorial/0/releases
// 3. "Editor's Picks" from GET /editorial/0/selection
// 4. "Genres" from GET /genre

// Authenticated only:
// 5. "Your Flow" from GET /user/me/flow
// 6. "Recommended for You" from GET /user/me/recommendations/tracks
// 7. "Your Playlists" from GET /user/me/playlists
```

---

## 8. Regional Strengths

Deezer has strong catalog coverage in markets where Spotify/YouTube Music have gaps:
- **France**: Home market, extensive French music catalog
- **Sub-Saharan Africa**: Strongest streaming presence in Francophone Africa
- **Latin America**: Strong in Brazil
- **Middle East & North Africa**: Good Arabic music coverage
- **Eastern Europe**: Growing catalog in Poland, Romania, etc.

### Localization

Plugin config exposes region and language:
```typescript
export const CONFIG_SCHEMA: PluginConfigSchema[] = [
  { key: 'auth', type: 'oauth', label: 'Account' },
  { key: 'region', type: 'string', label: 'Region', defaultValue: 'US' },
  { key: 'language', type: 'string', label: 'Language', defaultValue: 'en' },
];
```

Deezer respects `Accept-Language` headers for genre names, editorial descriptions, error messages.

---

## 9. Limitations and Workarounds

| Limitation | Impact | Workaround |
|---|---|---|
| **30-second preview only** | Cannot provide full playback | Metadata-only mode; YouTube Music cross-source resolution |
| **No PKCE** | App secret in binary | Accept trade-off (same as Spotify client ID) |
| **No lyrics** | Cannot provide lyrics | Existing lyrics plugin matches by ISRC/title/artist |
| **Rate limiting (50/5s)** | Must manage request volume | Token bucket rate limiter with exponential backoff |
| **Numeric IDs** | Aria uses strings | `String(deezerTrack.id)` conversion |
| **Duration in seconds** | Easy to confuse with milliseconds | Use `Duration.fromSeconds()` consistently |

---

## 10. Type System Updates

### Domain Value Objects
- `track-id.ts`: Add `'deezer'` to `SourceType` union
- `album-id.ts`: Add `'deezer'` to `AlbumSourceType` union

### Deezer API Types (`types.ts`)

Key types: `DeezerTrack`, `DeezerAlbum`, `DeezerAlbumSimplified`, `DeezerArtist`, `DeezerArtistSimplified`, `DeezerPlaylist`, `DeezerUser`, `DeezerGenre`, `DeezerRadio`, `DeezerPagingObject<T>`, `DeezerChartResponse`, `DeezerSearchResponse<T>`, `DeezerEditorial`, `DeezerErrorResponse`, `DeezerTokenResponse`

---

## 11. Testing Strategy

### Unit Test Files
```
src/plugins/metadata/deezer/__tests__/
  mappers.test.ts           # Mapper unit tests (most critical)
  client.test.ts            # Rate limiting, error handling
  auth.test.ts              # URL-encoded token parsing, auth flow
  search.test.ts            # Search operations
  info.test.ts              # Info operations
  charts.test.ts            # Chart operations
  recommendations.test.ts   # Recommendation operations
  library.test.ts           # Library operations
  home-feed.test.ts         # Home feed composition
  deezer-provider.test.ts   # Provider integration
```

### Key Test Cases
- **Duration conversion**: Deezer seconds -> Aria Duration (NOT milliseconds)
- **Artwork mapping** from four named URL fields
- **Numeric ID -> string ID** conversion
- **URL-encoded token response** parsing
- **`offline_access` token** never-expiring behavior
- **Rate limiter**: Token bucket refill, 429 handling, concurrent request limiting
- **`DeezerErrorResponse`** parsing, `OAuthException` handling

---

## 12. Implementation Sequence

### Phase 1: Foundation
1. `config.ts` -- manifest, constants, schema
2. `types.ts` -- all API response interfaces
3. `auth.ts` -- DeezerAuthManager (URL-encoded token, no refresh)
4. `client.ts` -- DeezerClient (rate limiter, error handling)

### Phase 2: Mappers
5. `mappers.ts` -- all entity mapping (with `fromSeconds()` not `fromMilliseconds()`)

### Phase 3: Operations
6. `search.ts` -- SearchOperations
7. `info.ts` -- InfoOperations (no batch endpoints; use `Promise.allSettled`)
8. `charts.ts` -- ChartOperations
9. `recommendations.ts` -- RecommendationOperations (auth required)
10. `library.ts` -- LibraryOperations
11. `home-feed.ts` -- HomeFeedOperations
12. `import-operations.ts` -- ImportOperations

### Phase 4: Provider and Registration
13. `deezer-provider.ts` -- DeezerProvider implementing MetadataProvider, OAuthCapablePlugin
14. `plugin-module.ts` -- factory
15. `index.ts` -- barrel exports
16. Register in `plugin-index.ts`
17. Update type unions in `track-id.ts`, `album-id.ts`

### Phase 5 (Optional): Preview Streaming
18. `streaming.ts` -- 30-second preview playback as optional feature
