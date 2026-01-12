<p align="center">
  <img src="assets/images/icon-rounded.png" alt="Aria" width="128" height="128" />
</p>

<h1 align="center">Aria</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Expo-54-000020?logo=expo" alt="Expo 54" />
  <img src="https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react" alt="React Native 0.81" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5.9" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" />
</p>

---

Open-source, cross-platform music player with a plugin architecture. Runs on iOS, Android, and web.

## Features

- 🔌 **Plugin architecture** with built-in providers for YouTube Music, Spotify, and local files
- 📚 **Library management** with songs, albums, artists, and playlist organization
- 🎨 **Material Design 3** with dynamic theming, accent colors, and light/dark/system modes
- 🔍 **Search & discovery** across multiple providers with filtering and sorting
- 📥 **Offline downloads** with queue management and storage tracking
- 🎤 **Synced lyrics** with line-by-line timing and plain text fallback
- 🎚️ **10-band equalizer** with presets (Flat, Bass Boost, Treble Boost, etc.)
- 😴 **Sleep timer** with presets, custom duration, and end-of-track mode
- 🎵 **Queue management** with reordering, shuffle, and repeat modes

## Setup

```bash
git clone https://github.com/carlelieser/aria.git
cd aria
npm install
npx expo start
```

Press `w` to open in browser, or run a native build:

```bash
npm run ios        # Build and run on iOS
npm run android    # Build and run on Android
```

## Build

<details>
<summary>Cloud (EAS Build)</summary>

Requires [EAS CLI](https://docs.expo.dev/eas/):

```bash
npm install -g eas-cli
eas login
```

```bash
# Development build (with dev client)
eas build --profile development --platform android

# Production build
eas build --profile production --platform android
```

</details>

<details>
<summary>Local</summary>

Requires Android SDK and Java 17+.

```bash
npm run build:android    # Outputs to out/aria.apk
```

</details>

## Project Structure
```
app/                   # Screens & navigation (Expo Router)
components/            # UI components
hooks/                 # React hooks
src/
├── domain/            # Entities & repository contracts
├── application/       # Services & Zustand stores
├── infrastructure/    # Storage & DI
├── plugins/           # Metadata, playback, sync providers
└── shared/            # Utilities
```

See [CLAUDE.md](CLAUDE.md) for architecture details and code standards.

## Contributing

PRs welcome. Use [Conventional Commits](https://conventionalcommits.org). See [CLAUDE.md](CLAUDE.md).

## License

[MIT](LICENSE)