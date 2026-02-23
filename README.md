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

## Features

- **Library Management** — Organize your collection across songs, artists, albums, and playlists.
- **Plugin Architecture** — Extend functionality with first-class metadata and playback providers.
- **Offline Playback** — Listen anywhere, no connection required.
- **Theming** — Light and dark mode with dynamic accent colors.
- **Material 3** — Modern, adaptive UI built on Material You principles.

## Download

Get the latest release from the [Releases](https://github.com/carlelieser/aria/releases) page.

## Screenshots

<p align="center">
  <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/Screenshot_20260223-022000.png" width="13%" />
  <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/Screenshot_20260223-022351.png" width="13%" />
  <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/Screenshot_20260223-022118.png" width="13%" />
  <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/Screenshot_20260223-025501.png" width="13%" />
  <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/Screenshot_20260223-022202.png" width="13%" />
  <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/Screenshot_20260223-022232.png" width="13%" />
  <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/Screenshot_20260223-022305.png" width="13%" />
</p>

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
src/
├── components/        # UI components (organized by domain)
├── hooks/             # React hooks
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
