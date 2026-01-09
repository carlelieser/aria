# Aria

A modern, extensible music player for iOS, Android, and web built with Expo and React Native. Aria features a sophisticated plugin architecture that enables streaming from multiple sources while maintaining clean separation of concerns.

## Features

- **Multi-Source Streaming** - Stream music from YouTube Music with support for additional providers
- **Background Playback** - Continue listening while using other apps
- **Queue Management** - Full queue controls with shuffle and repeat modes
- **Library Management** - Save tracks, create playlists, and manage favorites
- **Search** - Real-time search across all enabled metadata providers
- **Plugin System** - Extensible architecture for custom metadata and playback providers
- **Cross-Platform** - Runs on iOS, Android, and web from a single codebase

## Tech Stack

| Category | Technology |
|:---------|:-----------|
| Framework | Expo 54, React Native 0.81 |
| Language | TypeScript 5.9 |
| Routing | Expo Router 6 (file-based) |
| State Management | Zustand 4.5 |
| Styling | NativeWind (Tailwind CSS) |
| Audio | expo-av, expo-audio |
| Streaming API | youtubei.js |
| Icons | Lucide React Native |

## Architecture

Aria follows **Clean Architecture** principles with strict layer separation:

```
┌─────────────────────────────────────────────────────────┐
│                   Presentation Layer                     │
│              (app/, components/, hooks/)                 │
├─────────────────────────────────────────────────────────┤
│                   Application Layer                      │
│         (services, state stores, bootstrap)              │
├─────────────────────────────────────────────────────────┤
│                     Domain Layer                         │
│     (entities, value objects, repository contracts)      │
├─────────────────────────────────────────────────────────┤
│                    Plugin System                         │
│    (metadata providers, playback providers, events)      │
└─────────────────────────────────────────────────────────┘
```

### Key Principles

- **Features never import from other features** - shared code lives in `shared/`
- **Domain layer is pure TypeScript** - no React/React Native dependencies
- **Data flows downward** - presentation accesses data through services and hooks
- **Explicit error handling** - Result pattern instead of thrown exceptions

## Project Structure

```
aria/
├── app/                      # Expo Router screens
│   ├── _layout.tsx          # Root layout & initialization
│   ├── index.tsx            # Library screen
│   ├── player.tsx           # Full player screen
│   ├── search.tsx           # Search screen
│   └── settings.tsx         # Settings screen
│
├── components/               # UI components
│   ├── floating-player/     # Mini player overlay
│   ├── track-options-menu/  # Track context menu
│   └── ui/                  # Reusable primitives
│
├── src/
│   ├── domain/              # Business logic
│   │   ├── entities/        # Track, Artist, Album, Playlist
│   │   └── value-objects/   # Duration, TrackId, AudioSource
│   │
│   ├── application/         # Use cases & state
│   │   ├── services/        # PlaybackService, SearchService
│   │   ├── state/           # Zustand stores
│   │   └── bootstrap.ts     # App initialization
│   │
│   ├── plugins/             # Plugin system
│   │   ├── core/            # Plugin framework
│   │   │   ├── interfaces/  # Provider contracts
│   │   │   ├── registry/    # Plugin management
│   │   │   └── events/      # EventBus
│   │   ├── metadata/        # Metadata providers
│   │   │   └── youtube-music/
│   │   └── playback/        # Playback providers
│   │       ├── expo-av/
│   │       └── dash/
│   │
│   └── shared/              # Cross-cutting concerns
│       ├── types/           # Result type, errors
│       └── services/        # Logger, utilities
│
└── hooks/                   # Custom React hooks
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (macOS) or Android emulator

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/aria.git
cd aria

# Install dependencies
npm install

# Start the development server
npm start
```

### Running the App

```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Web Browser
npm run web
```

## Scripts

| Command | Description |
|:--------|:------------|
| `npm start` | Start Expo development server |
| `npm run ios` | Run on iOS simulator |
| `npm run android` | Run on Android emulator |
| `npm run web` | Run in web browser |
| `npm run lint` | Run ESLint |
| `npm run build:android:dev` | Build Android APK via EAS |

## Plugin System

Aria's plugin architecture enables extensibility without modifying core code.

### Plugin Types

| Interface | Purpose |
|:----------|:--------|
| `MetadataProvider` | Search and fetch track/album/artist information |
| `AudioSourceProvider` | Resolve streaming URLs for tracks |
| `PlaybackProvider` | Handle audio playback controls |
| `SyncProvider` | Sync library data with external services |

### Creating a Plugin

```typescript
import { BasePlugin, MetadataProvider } from '@/plugins/core/interfaces';

export class MyMusicProvider implements BasePlugin, MetadataProvider {
  readonly manifest = {
    id: 'my-music-provider',
    name: 'My Music Provider',
    version: '1.0.0',
    category: 'metadata' as const,
  };

  async onInit(context: PluginContext): Promise<void> {
    // Initialize plugin
  }

  async search(query: string, options?: SearchOptions) {
    // Implement search
  }

  // ... implement other MetadataProvider methods
}
```

### Built-in Plugins

- **YouTube Music** - Metadata and streaming from YouTube Music
- **Expo AV** - Standard audio playback for HTTP streams
- **DASH** - DASH/HLS streaming support

## State Management

Aria uses Zustand for reactive state management:

- **PlayerStore** - Current track, queue, playback status, volume
- **SearchStore** - Search query, results, suggestions
- **LibraryStore** - Saved tracks, playlists, favorites

## Error Handling

The codebase uses a Result pattern for explicit error handling:

```typescript
type Result<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };

// Usage
const result = await searchService.search(query);
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the code standards in `CLAUDE.md`
4. Commit using conventional commits (`feat:`, `fix:`, `refactor:`, etc.)
5. Push to your branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
