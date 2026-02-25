# Code Style Standards

How code reads and looks at the line, function, and class level.

---

## Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Files | `kebab-case` | `track-card.tsx`, `use-player.ts` |
| Classes / Interfaces / Types / Enums | `PascalCase` | `TrackCard`, `PlayerState` |
| Functions / Variables | `camelCase` | `getTrackDuration`, `isPlaying` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_RETRY_COUNT`, `API_BASE_URL` |
| Private members | `_prefixed camelCase` | `_cache`, `_handleTimeout` |

### Booleans

Boolean variables and props MUST read as a yes/no question. Use prefixes: `is`, `has`, `should`, `can`.

```ts
// DO
const isPlaying = true;
const hasPermission = checkAccess();
const canDelete = user.role === 'admin';

// DON'T
const playing = true;
const permission = checkAccess();
const delete = user.role === 'admin';
```

### Event Handlers

- Props that accept handlers MUST be prefixed with `on` (`onPress`, `onChange`)
- Handler implementations MUST be prefixed with `handle` (`handlePress`, `handleChange`)

```tsx
// DO
interface ButtonProps {
  readonly onPress: () => void;
}

function PlayerControls({ onPress }: ButtonProps) {
  const handlePress = () => {
    vibrate();
    onPress();
  };

  return <Pressable onPress={handlePress} />;
}

// DON'T — mismatched naming
interface ButtonProps {
  readonly pressAction: () => void;
}
```

---

## Functions

### Size Limit

Functions MUST NOT exceed **20 lines**. If a function approaches this limit, extract helper functions.

This forces single-responsibility and keeps every function readable without scrolling.

```ts
// DO — small, focused functions
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, '0')}`;
}

function formatTrackLabel(track: Track): string {
  const duration = formatDuration(track.durationSeconds);
  return `${track.title} (${duration})`;
}

// DON'T — one long function doing multiple things
function formatTrackLabel(track: Track): string {
  const minutes = Math.floor(track.durationSeconds / 60);
  const seconds = track.durationSeconds % 60;
  const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const artist = track.artist ?? 'Unknown Artist';
  const album = track.album ?? 'Unknown Album';
  // ... 15 more lines of formatting logic
  return `${track.title} (${duration}) — ${artist} — ${album}`;
}
```

### Single Responsibility

Each function MUST do one thing. If you can describe what it does with "and", it needs splitting.

### Early Returns

MUST use early returns to reduce nesting. Guard clauses at the top, happy path at the bottom.

```ts
// DO
function getTrackArtwork(track: Track): string {
  if (!track.artworkUri) return DEFAULT_ARTWORK;
  if (track.artworkUri.startsWith('file://')) return track.artworkUri;

  return buildCdnUrl(track.artworkUri);
}

// DON'T — nested conditionals
function getTrackArtwork(track: Track): string {
  if (track.artworkUri) {
    if (track.artworkUri.startsWith('file://')) {
      return track.artworkUri;
    } else {
      return buildCdnUrl(track.artworkUri);
    }
  } else {
    return DEFAULT_ARTWORK;
  }
}
```

### Parameters

- MUST NOT use boolean parameters — use an options object or separate functions
- MUST use destructured object for 3+ parameters
- SHOULD prefer pure functions (no side effects, deterministic output)

```ts
// DO — options object instead of boolean flags
interface FormatOptions {
  readonly includeArtist: boolean;
  readonly includeAlbum: boolean;
}

function formatTrackLabel(track: Track, options: FormatOptions): string {
  // ...
}

// DON'T — boolean parameter
function formatTrackLabel(track: Track, includeArtist: boolean): string {
  // ...
}

// DO — destructured object for 3+ params
function createPlaylist({ name, tracks, isPublic }: CreatePlaylistParams): Playlist {
  // ...
}

// DON'T — positional params
function createPlaylist(name: string, tracks: Track[], isPublic: boolean): Playlist {
  // ...
}
```

---

## Classes

- MUST NOT exceed **200 lines** per file
- MUST export a single primary class per file
- MUST prefer composition over inheritance
- MUST inject dependencies via constructor
- MUST use `readonly` for immutable properties

```ts
// DO — dependency injection, readonly, focused
class TrackRepository {
  constructor(
    private readonly _api: ApiClient,
    private readonly _cache: CacheService,
  ) {}

  async getById(id: string): Promise<Result<Track>> {
    const cached = this._cache.get<Track>(id);
    if (cached) return { ok: true, value: cached };

    return this._api.get<Track>(`/tracks/${id}`);
  }
}

// DON'T — direct instantiation of dependencies
class TrackRepository {
  private api = new ApiClient();
  private cache = new Map();
  // ...
}
```

---

## Type Safety

### No `any`

`any` is prohibited. Use `unknown` and narrow with type guards.

```ts
// DO
function parseResponse(data: unknown): Track {
  if (!isTrack(data)) throw new ValidationError('Invalid track data');
  return data;
}

// DON'T
function parseResponse(data: any): Track {
  return data as Track;
}
```

### No Non-Null Assertions

The `!` non-null assertion operator is prohibited. Handle null/undefined explicitly.

```ts
// DO
const track = playlist.tracks.find((t) => t.id === id);
if (!track) return { ok: false, error: { type: 'notFound', message: 'Track not found', resource: 'track' } };

// DON'T
const track = playlist.tracks.find((t) => t.id === id)!;
```

### Type Assertions

Minimize `as` casts. When necessary, assert to `unknown` first, and document why.

```ts
// Acceptable — narrowing platform API responses with justification
const event = nativeEvent as unknown as GestureEvent; // RN gesture handler types incomplete
```

---

## Interfaces and Types

### No Inline Nested Types

Interfaces MUST NOT contain inline nested object types. Every distinct shape MUST be extracted to a named interface or type alias. This applies at any depth — inline nesting is prohibited even for seemingly small types.

```ts
// DO — each shape has a name
interface TrackMetadata {
  readonly title: string;
  readonly duration: number;
}

interface TrackHeader {
  readonly metadata?: TrackMetadata;
}

interface TrackSection {
  readonly header?: TrackHeader;
  readonly contents?: unknown[];
}

// DON'T — inline nesting obscures structure
interface TrackSection {
  header?: { metadata?: { title?: string; duration?: number } };
  contents?: unknown[];
}
```

---

## Immutability

### Const by Default

MUST default to `const`. Use `let` only when reassignment is required. `var` is prohibited.

### Readonly Properties

MUST use `readonly` on object properties, interface fields, and class members that should not change after initialization.

```ts
// DO
interface PlayerState {
  readonly currentTrack: Track | null;
  readonly queue: readonly Track[];
  readonly volume: number;
}

// DON'T
interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  volume: number;
}
```

### Immutable Updates

MUST use spread operator or utility functions for state updates. MUST NOT mutate objects or arrays directly.

```ts
// DO
const updated = { ...state, volume: 0.8 };
const withTrack = [...queue, newTrack];
const removed = queue.filter((t) => t.id !== trackId);

// DON'T
state.volume = 0.8;
queue.push(newTrack);
queue.splice(index, 1);
```

### Literal Types

MUST use `as const` for literal values that should not widen.

```ts
// DO
const PLAYBACK_STATES = ['idle', 'playing', 'paused', 'buffering'] as const;
type PlaybackState = (typeof PLAYBACK_STATES)[number];

// DON'T — widens to string[]
const PLAYBACK_STATES = ['idle', 'playing', 'paused', 'buffering'];
```

---

## Prohibited Patterns

| Violation | Correction |
|---|---|
| `any` type | Use `unknown` and narrow with type guards |
| `console.log()` | Use logger service |
| Magic numbers / strings | Define named constants |
| Non-null assertion `!` | Use proper null handling |
| `var` declarations | Use `const` (or `let` when reassignment required) |
| Boolean function parameters | Use options object or separate functions |
| Functions > 20 lines | Extract helper functions |
| Class files > 200 lines | Split into smaller classes |
| Unused code | Delete immediately |
| Mutable state updates | Use immutable patterns (spread, filter, map) |
| Direct mutation of props/state | Return new references |
| Nested ternaries | Extract to variable or lookup object |
| Inline nested types in interfaces | Extract to named interfaces |
