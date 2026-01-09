# Aria

A modern, extensible music player for iOS, Android, and web built with Expo and React Native. Aria features a sophisticated plugin architecture that enables streaming from multiple sources while maintaining clean separation of concerns.

## Features

### Core Music Features
- **Multi-Source Streaming** - Stream music from YouTube Music with support for additional providers
- **Background Playback** - Continue listening while using other apps
- **Queue Management** - Full queue controls with shuffle and repeat modes (off, one, all)
- **Track Control** - Play, pause, skip, seek with progress tracking

### Library Management
- **Save Tracks** - Add/remove tracks from your library
- **Create Playlists** - Build and manage custom playlists
- **Favorites** - Mark and filter favorite tracks
- **Library Filtering** - Filter by artist, album, or favorites
- **Library Sorting** - Sort by various criteria with custom order

### Explore & Discovery
- **Search** - Real-time search across all enabled metadata providers
- **Browse** - Discover new music with advanced filtering and sorting
- **Batch Actions** - Select and perform actions on multiple tracks
- **Artist/Album Details** - Browse artist discography and album tracks

### Advanced Playback
- **Equalizer** - 10-band EQ with customizable presets
- **Synchronized Lyrics** - Time-synced lyrics display
- **Sleep Timer** - Schedule playback to stop at a set time
- **Downloads** - Download tracks for offline listening

### UI/UX
- **Material Design 3** - Modern M3 theming with dynamic colors
- **Dark Mode** - Automatic light/dark theme switching
- **Animated Splash Screen** - Circular ring reveal animation
- **Floating Player** - Mini player overlay for quick control
- **Customizable Tabs** - Reorder bottom navigation tabs
- **Plugin System** - Extensible architecture for custom providers

## Tech Stack

| Category | Technology |
|:---------|:-----------|
| Framework | Expo 54, React Native 0.81 |
| Language | TypeScript 5.9 |
| Routing | Expo Router 6 (file-based) |
| State Management | Zustand 4.5 |
| UI Framework | React Native Paper 5.13 |
| Audio | expo-av, expo-audio |
| Animations | React Native Reanimated 4.1 |
| Lists | Shopify FlashList 2.0 |
| Bottom Sheet | Gorhom Bottom Sheet 5.2 |
| Streaming API | youtubei.js 16.0 |
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
- **Non-blocking bootstrap** - app starts immediately, initializes plugins in background
- **Dependency injection** - container-managed dependencies for testability
- **Event-driven communication** - EventBus for plugin coordination

## Project Structure

```
aria/
├── app/                          # Expo Router file-based routing
│   ├── _layout.tsx              # Root layout & providers
│   ├── (tabs)/                  # Tab navigation
│   │   ├── _layout.tsx          # Custom Material 3 tab bar
│   │   ├── index.tsx            # Library screen
│   │   ├── explore.tsx          # Explore/search screen
│   │   ├── downloads.tsx        # Downloads screen
│   │   └── settings.tsx         # Settings screen
│   ├── player.tsx               # Full-screen player
│   ├── playlist-picker.tsx      # Playlist selection modal
│   ├── plugins.tsx              # Plugin management
│   ├── artist/[id].tsx          # Artist detail screen
│   └── album/[id].tsx           # Album detail screen
│
├── components/                   # UI components
│   ├── ui/                      # Primitives (button, input, toast, etc.)
│   ├── floating-player/         # Mini player overlay
│   ├── track-options-menu/      # Track context menu
│   ├── library/                 # Library-specific components
│   ├── explore/                 # Explore feature components
│   ├── settings/                # Settings components
│   ├── skeletons/               # Loading skeleton screens
│   ├── equalizer-sheet.tsx      # Equalizer controls
│   ├── lyrics-display.tsx       # Synchronized lyrics viewer
│   ├── sleep-timer-sheet.tsx    # Sleep timer interface
│   └── download-*.tsx           # Download UI components
│
├── hooks/                        # Custom React hooks (19 hooks)
│   ├── use-player.ts            # Player state & controls
│   ├── use-library-filter.ts    # Library filtering
│   ├── use-explore-filter.ts    # Explore filtering & sorting
│   ├── use-download-*.ts        # Download management
│   ├── use-lyrics.ts            # Lyrics fetching & syncing
│   ├── use-equalizer.ts         # Equalizer settings
│   └── use-sleep-timer.ts       # Sleep timer logic
│
├── src/
│   ├── domain/                  # Business logic layer
│   │   ├── entities/            # Track, Artist, Album, Playlist
│   │   ├── value-objects/       # Duration, TrackId, AudioSource
│   │   ├── repositories/        # Repository interfaces
│   │   └── actions/             # Domain actions
│   │
│   ├── application/             # Use cases & state
│   │   ├── services/            # 10 application services
│   │   │   ├── playback-service.ts
│   │   │   ├── search-service.ts
│   │   │   ├── download-service.ts
│   │   │   ├── album-service.ts
│   │   │   ├── artist-service.ts
│   │   │   ├── lyrics-service.ts
│   │   │   └── sleep-timer-service.ts
│   │   ├── state/               # 15 Zustand stores
│   │   │   ├── player-store.ts
│   │   │   ├── library-store.ts
│   │   │   ├── search-store.ts
│   │   │   ├── download-store.ts
│   │   │   ├── equalizer-store.ts
│   │   │   ├── lyrics-store.ts
│   │   │   └── settings-store.ts
│   │   └── bootstrap.ts         # Non-blocking app initialization
│   │
│   ├── plugins/                 # Plugin system
│   │   ├── core/                # Plugin framework
│   │   │   ├── interfaces/      # Provider contracts
│   │   │   ├── registry/        # Plugin management
│   │   │   └── events/          # EventBus
│   │   ├── metadata/            # Metadata providers
│   │   │   └── youtube-music/
│   │   └── playback/            # Playback providers
│   │       ├── expo-av/
│   │       └── dash/
│   │
│   └── shared/                  # Cross-cutting concerns
│       ├── di/                  # Dependency injection
│       ├── storage/             # AsyncStorage wrapper
│       ├── filesystem/          # File system access
│       ├── types/               # Result type, errors
│       └── services/            # Logger, utilities
│
├── lib/                          # Utilities
│   └── theme/                   # Material 3 theming
│       ├── dynamic-theme.ts     # Dynamic color generation
│       ├── colors.ts            # Color palette
│       └── typography.ts        # Type scale
│
└── constants/                    # App constants
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
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |
| `npm run test` | Run tests with Vitest (watch mode) |
| `npm run test:run` | Run tests once |
| `npm run test:coverage` | Run tests with coverage |
| `npm run build:android` | Build Android APK via EAS |

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

Aria uses Zustand for reactive state management with 15 stores:

| Store | Purpose |
|:------|:--------|
| `PlayerStore` | Current track, queue, playback status, volume |
| `LibraryStore` | Saved tracks, playlists, favorites |
| `SearchStore` | Search query, results, suggestions |
| `DownloadStore` | Download queue, progress, offline tracks |
| `EqualizerStore` | EQ bands, presets, enabled state |
| `LyricsStore` | Synchronized lyrics data |
| `SettingsStore` | User preferences, theme, tab order |
| `ExploreFilterStore` | Explore filters, sorting options |

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
