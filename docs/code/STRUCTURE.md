# Project Structure Standards

Architecture layers, directory layout, and dependency rules.

---

## Architecture Overview

The project follows Clean Architecture with inward-pointing dependencies. Each layer has a clear responsibility and strict rules about what it can import.

| Layer | Responsibility |
|---|---|
| **Domain** | Entities, value objects, repository interfaces, pure business logic |
| **Application** | Services (orchestration), Zustand stores (state), ports (provider contracts) |
| **Infrastructure** | Framework-level implementations: DI, filesystem, storage |
| **Plugins** | Provider implementations (playback, metadata, library, lyrics) |
| **Presentation** | React Native components and hooks |
| **Shared** | Cross-cutting utilities used across multiple layers |

---

## Directory Layout

```
src/
  domain/               # Pure TypeScript — zero framework dependencies
    entities/           # Core data models (Track, Album, Artist, Playlist)
    value-objects/      # Immutable typed values (Duration, PlaybackState)
    repositories/       # Repository interfaces (contracts, not implementations)
    actions/            # Domain action definitions
    utils/              # Pure domain utility functions

  application/          # Orchestration layer — depends on domain only
    services/           # Business logic coordinators (PlaybackService, LibraryService)
    state/              # Zustand stores (PlayerStore, LibraryStore, SettingsStore)
    ports/              # Provider interfaces (PlaybackProvider, MetadataProvider)
    events/             # Application event definitions

  infrastructure/       # Framework integrations — depends on domain + application
    di/                 # Dependency injection container
    filesystem/         # File system access
    storage/            # Persistent storage (AsyncStorage, SQLite)

  plugins/              # Provider implementations — depends on domain + plugin core
    core/               # Plugin interfaces, registry, event bus
    playback/           # Playback provider plugins
    metadata/           # Metadata provider plugins (Spotify, YouTube Music, local)
    library/            # Library provider plugins
    lyrics/             # Lyrics provider plugins

  components/           # React Native UI — depends on application + domain types
    ui/                 # Reusable, generic UI components
    [feature]/          # Feature-specific component directories

  hooks/                # Custom hooks — bridge between application and components

  shared/               # Cross-cutting concerns — used by multiple layers
    services/           # Shared services (logger, cache, auth)
    types/              # Shared type definitions
    mappers/            # Data transformation utilities
    di/                 # Shared DI utilities
```

---

## Layer Rules

### Domain

The innermost layer. MUST be pure TypeScript with zero external dependencies.

- MUST NOT import from any other layer
- MUST NOT import React, React Native, or any framework library
- MUST NOT import third-party packages (exceptions: pure utility types)
- MUST define interfaces (contracts) that outer layers implement
- All logic MUST be pure — no side effects, no I/O

```ts
// DO — pure domain entity
export interface Track {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
  readonly duration: Duration;
}

// DO — domain interface that outer layers implement
export interface TrackRepository {
  getById(id: string): Promise<Result<Track>>;
  search(query: string): Promise<Result<Track[]>>;
}

// DON'T — domain importing framework code
import AsyncStorage from '@react-native-async-storage/async-storage'; // PROHIBITED
```

### Application

Orchestrates domain logic. Contains services, state management, and port definitions.

- MUST depend only on domain
- MUST NOT import from infrastructure, plugins, components, or hooks
- Services coordinate domain operations and manage side effects
- Zustand stores hold application state
- Ports define contracts that plugins implement

```ts
// DO — application service depending only on domain
import type { Track } from '@/src/domain';
import type { PlaybackProvider } from '@/src/application/ports';

export class PlaybackService {
  constructor(private readonly _provider: PlaybackProvider) {}

  async play(track: Track): Promise<Result<void>> {
    // orchestration logic
  }
}

// DON'T — application importing a specific plugin
import { SpotifyClient } from '@/src/plugins/metadata/spotify'; // PROHIBITED
```

### Infrastructure

Provides concrete implementations of platform-specific concerns.

- MUST depend on domain and application
- MUST NOT import from components, hooks, or plugins
- Wires up dependency injection, filesystem access, and persistent storage

### Plugins

Implement the port interfaces defined in the application layer. Each plugin is a self-contained module.

- MUST depend on domain and plugin core interfaces
- MUST NOT import from other plugins (each plugin is isolated)
- MUST NOT import from components or hooks
- MUST implement a defined port/provider interface

```ts
// DO — plugin implementing an application port
import type { MetadataProvider } from '@plugins/core';
import type { Track } from '@/src/domain';

export class SpotifyProvider implements MetadataProvider {
  async search(query: string): Promise<Result<Track[]>> {
    // Spotify-specific implementation
  }
}

// DON'T — plugin importing another plugin
import { YouTubeClient } from '@/src/plugins/metadata/youtube-music'; // PROHIBITED
```

### Presentation (Components + Hooks)

The outermost layer. React Native components and the hooks that connect them to application state.

- Hooks MUST be the bridge between components and the application layer
- Hooks MAY import from application (services, stores) and domain (types)
- Components MUST access state and logic through hooks — never import services directly
- Components MUST NOT import from infrastructure or plugins

```ts
// DO — hook bridges application to UI
import { usePlayerStore } from '@/src/application/state/player-store';
import { playbackService } from '@/src/application/services/playback-service';

export function usePlayerActions() {
  const play = useCallback(async (track: Track) => {
    await playbackService.play(track);
  }, []);

  return { play };
}

// DO — component uses hooks, not services
function PlayerControls() {
  const { play, pause } = usePlayerActions();
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  // ...
}

// DON'T — component importing a service directly
import { playbackService } from '@/src/application/services/playback-service'; // PROHIBITED in components
```

### Shared

Cross-cutting code used by multiple layers.

- MUST be organized by type: `services/`, `types/`, `mappers/`, `di/`
- MUST NOT contain business logic — that belongs in domain or application
- MUST NOT contain UI code — that belongs in components
- Any code imported by two or more layers SHOULD live here

---

## Feature Isolation

### No Cross-Feature Imports

Feature-specific component directories MUST NOT import from each other. If two features need the same code, extract it to `components/ui/` or `shared/`.

```ts
// DO — shared component extracted to ui/
import { TrackRow } from '@/src/components/ui/track-row';

// DON'T — reaching into another feature's components
import { TrackRow } from '@/src/components/library/track-row'; // PROHIBITED from player/
```

### Plugin Isolation

Plugins MUST NOT import from other plugins. Shared plugin concerns belong in `plugins/core/`.

```ts
// DO — shared plugin interface in core
import type { MetadataProvider } from '@plugins/core';

// DON'T — plugin-to-plugin dependency
import { SpotifyClient } from '@/src/plugins/metadata/spotify'; // PROHIBITED from youtube-music/
```

---

## Import Aliases

The project uses path aliases to enforce layer boundaries and keep imports readable.

| Alias | Maps To |
|---|---|
| `@/src/domain` | `src/domain/` |
| `@/src/application` | `src/application/` |
| `@infrastructure/` | `src/infrastructure/` |
| `@plugins/` | `src/plugins/` |
| `@shared/` | `src/shared/` |
| `@/src/components/` | `src/components/` |
| `@/src/hooks/` | `src/hooks/` |

MUST use aliases for cross-layer imports. MUST use relative imports for within the same directory or module.

---

## Dependency Summary

| Layer | Can Import From |
|---|---|
| Domain | Nothing (self-contained) |
| Application | Domain |
| Infrastructure | Domain, Application |
| Plugins | Domain, Plugin Core |
| Hooks | Domain, Application |
| Components | Domain (types only), Hooks, Components/UI |
| Shared | Domain |

### Prohibited Dependencies

| From | To | Why |
|---|---|---|
| Domain | Any other layer | Domain must be pure and framework-free |
| Application | Infrastructure, Plugins | Application defines contracts; doesn't know implementations |
| Components | Application services | Components access logic through hooks, not directly |
| Components | Infrastructure, Plugins | UI must be decoupled from platform details |
| Feature components | Other feature components | Features must be isolated; extract to shared |
| Plugin | Another plugin | Plugins are self-contained modules |
