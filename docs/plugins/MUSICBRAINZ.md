# MusicBrainz Metadata Enrichment Plugin -- Implementation Plan

## Overview

**Not a music source** -- a metadata enrichment plugin that augments Local Library data with accurate metadata from MusicBrainz, cover art from Cover Art Archive, and audio fingerprint matching via AcoustID. Lives at `src/plugins/enrichment/musicbrainz/`.

## 1. Architectural Decision: Plugin Category

MusicBrainz does not fit into `MetadataProvider` (designed for primary data sources with their own track IDs). Instead, it follows the **Lyrics plugin pattern**:

- **New `PluginCategory`**: `'enrichment-provider'` (added to `PluginCategory` union in `plugin-types.ts`)
- **Implements `ActionsProvider`**: Subscribes to `TRACK_ACTION_EVENTS`, provides "Fix Metadata" and "Fetch Cover Art" context-menu actions
- **Internal `EnrichmentOrchestrator`**: Analogous to `LyricsOrchestrator`, coordinates API calls, caching, and matching
- **Event-driven communication**: Communicates with Local Library via EventBus (no cross-plugin imports)

### Why Not `MetadataProvider`?
1. MusicBrainz does not own tracks -- no `TrackId` with source type `'musicbrainz'`
2. `MetadataProvider.searchTracks()` returns full `Track` objects with `AudioSource`, not enrichment data
3. Plugin isolation rules prohibit cross-plugin imports

---

## 2. API Strategy

### MusicBrainz API (`musicbrainz.org/ws/2/`)
- **Rate limit**: 1 request per second (strict -- 503 on violation)
- **Auth**: None required. **User-Agent header is mandatory** (blocks without it)
- **Format**: Append `fmt=json` to all URLs; set `Accept: application/json`

### Cover Art Archive (`coverartarchive.org`)
- Separate service, more lenient rate limits
- Returns cover art images by release MBID

### AcoustID (`api.acoustid.org/v2/`)
- Requires free API key (register at acoustid.org)
- Audio fingerprint -> MBID resolution
- Phase 2 (requires native Chromaprint module)

---

## 3. Plugin Structure

```
src/plugins/enrichment/musicbrainz/
  config.ts                         # PluginManifest, config schema, constants
  plugin-module.ts                  # PluginModule factory
  musicbrainz-plugin.ts             # Main plugin class (AbstractBasePlugin + ActionsProvider)
  types.ts                          # MusicBrainz-specific types (MBID, EnrichmentResult, etc.)
  index.ts                          # Barrel exports

  actions/
    enrichment-actions.ts           # getEnrichmentActions(), executeEnrichmentAction()

  api/
    musicbrainz-client.ts           # HTTP client for musicbrainz.org/ws/2/
    coverart-client.ts              # HTTP client for coverartarchive.org
    acoustid-client.ts              # HTTP client for api.acoustid.org/v2/
    rate-limiter.ts                 # Token-bucket rate limiter (1 req/sec)
    types.ts                        # Raw API response types

  domain/
    enrichment-provider.ts          # EnrichmentProvider interface
    enrichment-result.ts            # EnrichmentResult, MatchConfidence types

  mappers/
    recording-mapper.ts             # MusicBrainz Recording -> enrichment result
    release-mapper.ts               # MusicBrainz Release -> album metadata
    artist-mapper.ts                # MusicBrainz Artist -> artist metadata
    coverart-mapper.ts              # Cover Art Archive -> Artwork[]

  services/
    enrichment-orchestrator.ts      # Coordinates lookup strategies, provider fallback
    enrichment-cache.ts             # MBID lookup cache (SQLite-backed, long TTL)
    batch-enrichment-service.ts     # Batch processing with progress tracking
    match-scorer.ts                 # Fuzzy matching / confidence scoring

  storage/
    enrichment-database.ts          # SQLite schema for MBID mappings
```

---

## 4. Core Types

### Plugin Types (`types.ts`)

```typescript
/** MusicBrainz ID - a UUID string */
type MBID = string & { readonly __brand: 'MBID' };

/** Confidence of a metadata match */
type MatchConfidence = 'high' | 'medium' | 'low';

/** Enrichment status for a local track */
type EnrichmentStatus = 'unenriched' | 'enriched' | 'partial' | 'failed' | 'skipped';

/** Result of enriching a single track */
interface EnrichmentResult {
  readonly trackId: string;              // local-file track ID
  readonly status: EnrichmentStatus;
  readonly confidence: MatchConfidence;
  readonly recordingMbid?: MBID;
  readonly releaseMbid?: MBID;
  readonly releaseGroupMbid?: MBID;
  readonly artistMbids?: readonly MBID[];
  readonly correctedTitle?: string;
  readonly correctedArtist?: string;
  readonly correctedAlbum?: string;
  readonly correctedTrackNumber?: number;
  readonly correctedDiscNumber?: number;
  readonly correctedYear?: number;
  readonly correctedGenres?: readonly string[];
  readonly coverArtUrl?: string;
  readonly isrc?: string;
  readonly enrichedAt: number;
}

/** Batch enrichment progress */
interface EnrichmentProgress {
  readonly current: number;
  readonly total: number;
  readonly currentTrack?: string;
  readonly phase: 'preparing' | 'looking-up' | 'fetching-art' | 'applying' | 'complete';
  readonly estimatedRemainingMs?: number;
  readonly enrichedCount: number;
  readonly failedCount: number;
  readonly skippedCount: number;
}
```

### MusicBrainz API Types (`api/types.ts`)

Key types: `MBRecording`, `MBRelease`, `MBReleaseGroup`, `MBArtistCredit`, `MBArtist`, `MBMedia`, `MBTrack`, `MBTag`, `MBLabelInfo`, `MBLabel`, `MBCoverArtArchive`, `MBSearchResponse<T>`

Cover Art Archive: `CAAResponse`, `CAAImage`, `CAThumbnails`

AcoustID: `AcoustIDResponse`, `AcoustIDResult`, `AcoustIDRecording`

---

## 5. Core Components

### 5.1. Rate Limiter (`api/rate-limiter.ts`)

Token-bucket algorithm with a single token, refilling at 1 token/second. All MusicBrainz API calls pass through `rateLimiter.acquire()`.

```typescript
class RateLimiter {
  constructor(requestsPerSecond: number = 1)
  async acquire(): Promise<void>    // Resolves when next request slot is available
  get queueLength(): number         // Observable for UI progress estimation
  dispose(): void                   // Clear timers and reject pending
}
```

Queue length is observable, enabling UI to show "X requests pending" and estimate completion time.

### 5.2. MusicBrainz Client (`api/musicbrainz-client.ts`)

```typescript
class MusicBrainzClient {
  constructor(rateLimiter: RateLimiter)

  searchRecordings(params: { title, artist?, release?, isrc?, duration?, limit? }): AsyncResult<MBSearchResponse<MBRecording>, Error>
  searchReleases(params: { release, artist?, barcode?, limit? }): AsyncResult<MBSearchResponse<MBRelease>, Error>
  getRecording(mbid: MBID, includes?: string[]): AsyncResult<MBRecording, Error>
  getRelease(mbid: MBID, includes?: string[]): AsyncResult<MBRelease, Error>
  getArtist(mbid: MBID, includes?: string[]): AsyncResult<MBArtist, Error>
  lookupByISRC(isrc: string): AsyncResult<MBSearchResponse<MBRecording>, Error>
}
```

Every request must set `User-Agent` header and `fmt=json` parameter. MusicBrainz blocks requests without proper User-Agent.

### 5.3. Cover Art Client (`api/coverart-client.ts`)

```typescript
class CoverArtClient {
  getCoverArt(releaseMbid: MBID): AsyncResult<CAAResponse | null, Error>
  getFrontCoverUrl(releaseMbid: MBID, size?: 250 | 500 | 1200): AsyncResult<string | null, Error>
}
```

### 5.4. Match Scorer (`services/match-scorer.ts`)

Scores MusicBrainz results against local track metadata for match confidence.

```typescript
interface MatchScoreInput {
  readonly localTitle: string;
  readonly localArtist: string;
  readonly localAlbum?: string;
  readonly localDuration?: number;
  readonly localYear?: number;
  readonly localTrackNumber?: number;
  readonly localIsrc?: string;
}

interface ScoredMatch<T> {
  readonly item: T;
  readonly score: number;           // 0.0 to 1.0
  readonly confidence: MatchConfidence;
  readonly breakdown: MatchBreakdown;
}

function scoreRecordingMatch(input: MatchScoreInput, recording: MBRecording): ScoredMatch<MBRecording>
function selectBestMatch<T>(matches: ScoredMatch<T>[], minConfidence?: MatchConfidence): ScoredMatch<T> | null
```

**Scoring rules:**
- ISRC exact match: instant `high` confidence (score = 1.0)
- Title exact match (case-insensitive, normalized): +0.35
- Title fuzzy match (Levenshtein distance < 3): +0.25
- Artist exact match: +0.30
- Artist fuzzy match: +0.20
- Duration within 3 seconds: +0.15
- Duration within 10 seconds: +0.10
- Album name match: +0.10
- Track number match: +0.05

**Confidence thresholds:** `high` >= 0.85, `medium` >= 0.60, `low` >= 0.40. Below 0.40, reject.

### 5.5. Enrichment Orchestrator (`services/enrichment-orchestrator.ts`)

Coordinates the multi-step lookup strategy (analogous to `LyricsOrchestrator`):

```typescript
class EnrichmentOrchestrator {
  enrichTrack(track: LocalTrack): AsyncResult<EnrichmentResult | null, Error>
  enrichBatch(tracks: LocalTrack[], onProgress?, signal?: AbortSignal): AsyncResult<EnrichmentResult[], Error>
  clearCache(): void
}
```

**Lookup cascade** (stops at first high-confidence match):

1. **ISRC lookup** -- If track has `metadata.isrc`, query `ws/2/isrc/{isrc}`. Most accurate, 1 API call.
2. **Artist + Title search** -- `ws/2/recording/?query=recording:{title} AND artist:{artist}`. Score results with match-scorer.
3. **Album + Artist search** -- If ambiguous, search releases: `ws/2/release/?query=release:{album} AND artist:{artist}`. Look for track within release tracklist (2 API calls).
4. **AcoustID fingerprint** (Phase 2) -- Generate Chromaprint, query AcoustID, get MBID.

### 5.6. Enrichment Cache (`services/enrichment-cache.ts`)

SQLite-backed, long-lived cache. MusicBrainz MBIDs are permanent.

```typescript
class EnrichmentCache {
  get(localTrackId: string): EnrichmentResult | undefined
  set(localTrackId: string, result: EnrichmentResult): void
  has(localTrackId: string): boolean
  getUnenrichedTrackIds(trackIds: string[]): string[]
  getStats(): EnrichmentStats
  clear(trackIds?: string[]): void
}
```

### 5.7. Enrichment Database (`storage/enrichment-database.ts`)

SQLite schema following the Local Library database pattern:

```sql
CREATE TABLE IF NOT EXISTS enrichment_cache (
  local_track_id TEXT PRIMARY KEY,
  recording_mbid TEXT,
  release_mbid TEXT,
  release_group_mbid TEXT,
  artist_mbids TEXT,              -- JSON array
  corrected_title TEXT,
  corrected_artist TEXT,
  corrected_album TEXT,
  corrected_track_number INTEGER,
  corrected_disc_number INTEGER,
  corrected_year INTEGER,
  corrected_genres TEXT,           -- JSON array
  cover_art_url TEXT,
  isrc TEXT,
  confidence TEXT NOT NULL,
  status TEXT NOT NULL,
  enriched_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_enrichment_recording ON enrichment_cache(recording_mbid);
CREATE INDEX idx_enrichment_release ON enrichment_cache(release_mbid);
CREATE INDEX idx_enrichment_status ON enrichment_cache(status);
```

**Cache TTL policy:** Enriched results never expire (MBIDs are permanent). Failed results expire after 7 days (re-attempt).

---

## 6. Plugin Configuration

```typescript
export const CONFIG_SCHEMA: PluginConfigSchema[] = [
  {
    key: 'autoEnrichOnScan',
    type: 'boolean',
    label: 'Auto-enrich after scan',
    description: 'Automatically enrich new tracks after a library scan',
    defaultValue: false,
  },
  {
    key: 'minConfidence',
    type: 'select',
    label: 'Minimum Match Confidence',
    description: 'Only apply corrections above this confidence level',
    defaultValue: 'high',
    options: [
      { label: 'High (most accurate)', value: 'high' },
      { label: 'Medium', value: 'medium' },
      { label: 'Low (most results)', value: 'low' },
    ],
  },
  {
    key: 'acoustidApiKey',
    type: 'string',
    label: 'AcoustID API Key',
    description: 'Optional API key for audio fingerprint matching',
    defaultValue: '',
  },
  {
    key: 'fetchCoverArt',
    type: 'boolean',
    label: 'Fetch Cover Art',
    description: 'Automatically fetch missing cover art from Cover Art Archive',
    defaultValue: true,
  },
];
```

---

## 7. Actions (`actions/enrichment-actions.ts`)

Actions are only shown for local library tracks:

```typescript
function getEnrichmentActions(context: TrackActionContext): TrackAction[] {
  // Only for local-file / local-library tracks
  if (track.id.sourceType !== 'local-file' && track.id.sourceType !== 'local-library') {
    return [];
  }

  // "Fix Metadata" -- always available for local tracks
  // "Fetch Cover Art" -- only if track has no artwork
}
```

Action IDs:
- `'fix-metadata'` -- Look up track on MusicBrainz and correct metadata
- `'fetch-cover-art'` -- Fetch missing cover art from Cover Art Archive
- `'view-on-musicbrainz'` -- Open track's MusicBrainz page in browser

---

## 8. Integration with Local Library

### Event-Based Communication

The plugin listens for scan-completion events via EventBus and optionally triggers auto-enrichment:

```typescript
const ENRICHMENT_EVENTS = {
  ENRICH_TRACK_REQUEST: 'enrichment:enrich-track',
  ENRICH_BATCH_REQUEST: 'enrichment:enrich-batch',
  ENRICHMENT_COMPLETE: 'enrichment:complete',
  ENRICHMENT_PROGRESS: 'enrichment:progress',
} as const;
```

### Application Bridge

Since plugins cannot import each other, an application-layer `EnrichmentService` bridges MusicBrainz and Local Library:

```typescript
// src/application/services/enrichment-service.ts
class EnrichmentService {
  async enrichTrack(trackId: string): AsyncResult<EnrichmentResult | null, Error> {
    const plugin = getMusicBrainzPlugin();
    const localTrack = getLocalLibraryState().getTrack(trackId);
    const result = await plugin.enrichTrack(localTrack);
    if (result.success && result.data?.status === 'enriched') {
      this._applyEnrichment(trackId, result.data);
    }
    return result;
  }
}
```

---

## 9. Rate Limiting and Batch UX

### The Math

1000-track library at 1 req/sec = ~17 minutes minimum. Realistic: 15-25 minutes including follow-up release lookups.

**Optimizations:**
- ISRC lookup = 1 API call (instant match)
- Group tracks by album (one release lookup enriches all tracks)
- Cache eliminates re-lookups on subsequent runs
- Abort support via `AbortSignal`

### UX Design

Batch enrichment runs as a background process. Progress tracked in Zustand store:

```typescript
interface EnrichmentState {
  isRunning: boolean;
  progress: EnrichmentProgress | null;
  abortController: AbortController | null;
  lastBatchResults: readonly EnrichmentResult[];
  startBatch: (tracks: readonly LocalTrack[]) => void;
  cancelBatch: () => void;
}
```

UI shows:
- Persistent progress bar in library screen header
- "Enriching library... 42/350 tracks (estimated 5 min remaining)"
- Cancel button
- Results summary: "Enriched 320 tracks, 12 failed, 18 skipped"

---

## 10. Caching Strategy

| Data | Location | TTL | Rationale |
|---|---|---|---|
| MBID mappings | SQLite | Indefinite | MBIDs never change |
| Enrichment results | SQLite | Indefinite (enriched), 7 days (failed) | Stable data; retry failures |
| Cover art URLs | SQLite | Indefinite | Archive URLs are permanent |
| Raw API responses | In-memory Map | 10 minutes | Deduplicate rapid re-lookups |
| Pending requests | In-memory Map | Duration of request | Deduplicate concurrent requests |

---

## 11. AcoustID / Chromaprint (Phase 2)

### Native Module

Requires Chromaprint C library via native module:

```
modules/audio-fingerprint/
  expo-module.config.json
  package.json
  src/
    index.ts
    AudioFingerprint.types.ts
  android/
    src/main/java/.../AudioFingerprintModule.kt
  ios/
    AudioFingerprintModule.swift
```

Exposes:
```typescript
async function generateFingerprint(fileUri: string): Promise<FingerprintResult>;
function isNativeModuleAvailable(): boolean;
```

### When to Trigger
- Never automatically (too expensive at scale)
- On explicit "Identify Track" action
- During batch enrichment: only for tracks where text-based lookup returned `failed` or `low` confidence
- Only when native module is available

---

## 12. Type System Updates

### `plugin-types.ts`
Add `'enrichment-provider'` to `PluginCategory` union.

### `plugin-index.ts`
Register plugin with lazy loading:
```typescript
{
  manifest: MUSICBRAINZ_MANIFEST,
  load: async () => {
    const { MusicBrainzPluginModule } = await import('./enrichment/musicbrainz/plugin-module');
    return MusicBrainzPluginModule;
  },
  isBuiltIn: false,
},
```

Note: MusicBrainz does NOT add a source type to `track-id.ts` or `album-id.ts` -- it enriches existing `local-file` tracks, not its own.

---

## 13. Testing Strategy

### Unit Test Files
```
__tests__/
  match-scorer.test.ts          # Fuzzy matching, confidence, edge cases
  rate-limiter.test.ts          # Token bucket timing, queue ordering
  recording-mapper.test.ts      # MusicBrainz JSON -> EnrichmentResult
  coverart-mapper.test.ts       # CAA response -> Artwork[]
  enrichment-cache.test.ts      # SQLite read/write, TTL, stats
  enrichment-orchestrator.test.ts # Lookup cascade, cache hits, batch abort
  musicbrainz-client.test.ts    # URL construction, User-Agent, error responses
  enrichment-actions.test.ts    # Action visibility (local tracks only)
```

### Key Test Cases
- Fuzzy matching edge cases: "The Beatles" vs "Beatles", live/remix variants
- ISRC instant match (score = 1.0)
- Rate limiter: 3 requests should take >= 2 seconds
- Cache: enriched never expires, failed expires after 7 days
- Actions only appear for `local-file` / `local-library` source types

### Mock Fixtures
```
__fixtures__/
  recording-search-response.json  # "Yesterday" by The Beatles
  release-with-tracks.json
  coverart-response.json
  acoustid-response.json
```

---

## 14. Implementation Sequence

### Phase 1: Core Infrastructure
1. Add `'enrichment-provider'` to `PluginCategory`
2. Create directory structure under `src/plugins/enrichment/musicbrainz/`
3. `rate-limiter.ts` with tests
4. `musicbrainz-client.ts` with tests
5. `coverart-client.ts` with tests
6. All type definitions

### Phase 2: Plugin Core
7. `match-scorer.ts` with comprehensive tests
8. `enrichment-database.ts` (SQLite schema)
9. `enrichment-cache.ts` with tests
10. `enrichment-orchestrator.ts` with tests
11. `musicbrainz-plugin.ts` (main class)
12. `config.ts`, `plugin-module.ts`, `index.ts`
13. Register in `plugin-index.ts`

### Phase 3: Actions and Integration
14. `enrichment-actions.ts`
15. `application/services/enrichment-service.ts`
16. `application/state/enrichment-store.ts` (Zustand)
17. `hooks/use-enrichment.ts`
18. Wire actions into track options menu
19. Batch enrichment screen/flow

### Phase 4: AcoustID (Deferred)
20. `modules/audio-fingerprint/` native module
21. Chromaprint integration (Android + iOS)
22. `acoustid-client.ts`
23. Add fingerprint lookup to orchestrator cascade
24. "Identify Track" action

---

## 15. Potential Challenges

| Challenge | Mitigation |
|---|---|
| Rate limit strictness (503 + IP block) | Hard 1 req/sec guarantee via `RateLimiter`. Check `Retry-After` on 503. |
| Ambiguous matches (multiple releases) | Prefer `release.status === 'Official'`, highest track count (album over single) |
| Internationalized text | Normalize before comparison: lowercase, strip diacritics, remove punctuation |
| Large library batch (slow) | Prioritize ISRC tracks, group by album, allow cancellation, cache aggressively |
| Plugin isolation | All cross-plugin communication via EventBus or application-layer service |
| Cover art file storage | Store in cache dir under `musicbrainz/covers/{release-mbid}.jpg` |
