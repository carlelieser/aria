<p align="center">
  <img src="assets/images/icon-rounded.png" alt="Aria" width="128" height="128" />
</p>

<h1 align="center">Aria</h1>

<p align="center">
  <strong>A free, open-source, and extensible music player</strong>
</p>

<p align="center">
  <img src="https://github.com/carlelieser/aria/actions/workflows/release.yml/badge.svg" alt="Release Status"  />
  <img src="https://img.shields.io/github/actions/workflow/status/carlelieser/aria/ci.yml?branch=main&logo=github&label=CI" alt="CI Status" />
  <img src="https://img.shields.io/badge/Platform-Android%20%7C%20iOS-blue" alt="Android | iOS" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" />
</p>

---

## Why Aria?

- **Unified library** — Manage music from multiple sources in one place
- **Plugin architecture** — Extend functionality with community-built plugins
- **Offline support** — Save tracks for offline listening
- **Privacy-first** — No ads, no tracking, fully open source
- **Synced lyrics** — Line-by-line lyrics with timing
- **10-band equalizer** — Fine-tune your sound with presets or custom settings
- **Beautiful UI** — Material Design 3 with dynamic theming and custom accent colors

## Download

Get the latest release from the [Releases](https://github.com/carlelieser/aria/releases) page.

## Screenshots

<p align="center">
  <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/01_library_songs.png" width="19%" />
  <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/06_explore.png" width="19%" />
  <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/09_player.png" width="19%" />
  <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/08_settings.png" width="19%" />
  <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/09_player_dark.png" width="19%" />
</p>

## Features

### Library

- Play local files or connect sources via plugins
- Unified library with songs, albums, artists, and playlists
- Search across multiple sources simultaneously
- Recently played history and favorites

### Offline

- Download tracks for offline listening
- Queue management with progress tracking
- Automatic retry for failed downloads

### Audio

- **10-band equalizer** with presets (Bass Boost, Treble Boost, Vocal, Rock, Electronic, and more)
- Gapless playback for seamless transitions
- Sleep timer with presets, custom duration, and end-of-track mode

### Lyrics

- Synced lyrics with line-by-line timing
- Plain text fallback when timing unavailable
- Multiple lyrics providers

### Customization

- Light, dark, and system theme modes
- Custom accent colors with Material Design 3 dynamic theming
- Configurable tabs and default views

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
eas build --profile development --platform ios

# Production build
eas build --profile production --platform android
eas build --profile production --platform ios
```

</details>

<details>
<summary>Local</summary>

```bash
npm run build:android
npm run build:ios
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

## Publishing

See [PUBLISHING.md](PUBLISHING.md) for app store submission guides (F-Droid, etc.).

## Contributing

PRs welcome. Use [Conventional Commits](https://conventionalcommits.org). See [CLAUDE.md](CLAUDE.md).

## License

[MIT](LICENSE)
