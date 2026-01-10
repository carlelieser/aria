<p align="center">
  <img src="assets/images/icon-rounded.png" alt="Aria" width="128" height="128" />
</p>

<h1 align="center">Aria</h1>

<p align="center">
  A modern music player for iOS, Android, and web built with Expo and React Native.
</p>

## Features

- **Multi-source streaming** from YouTube Music, Spotify, and local files
- **Background playback** with queue management, shuffle, and repeat
- **Library management** with playlists, favorites, and filtering
- **10-band equalizer** with customizable presets
- **Synchronized lyrics** display
- **Offline downloads**
- **Material Design 3** with dynamic theming
- **Plugin architecture** for extensibility

## Tech Stack

- **Expo 54** / React Native 0.81
- **TypeScript 5.9**
- **Expo Router 6** (file-based routing)
- **Zustand** (state management)
- **React Native Paper** (UI)
- **expo-audio** (playback)

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on platform
npm run ios      # iOS Simulator
npm run android  # Android Emulator
npm run web      # Web Browser
```

## Scripts

| Command | Description |
|:--------|:------------|
| `npm start` | Start Expo dev server |
| `npm run ios` | Run on iOS |
| `npm run android` | Run on Android |
| `npm run web` | Run on web |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |
| `npm run build:android` | Build Android APK |

## Architecture

Aria follows Clean Architecture with a plugin system for extensibility.

```
app/           # Expo Router screens
components/    # UI components
hooks/         # React hooks
src/
├── domain/        # Entities & repository contracts
├── application/   # Services & Zustand stores
├── infrastructure/# Storage & DI
├── plugins/       # Metadata, playback, and sync providers
└── shared/        # Cross-cutting utilities
```

See `CLAUDE.md` for detailed architecture guidelines and code standards.

## License

MIT
