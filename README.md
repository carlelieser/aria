<p align="center">
  <img src="assets/images/icon-rounded.png" alt="Aria" width="128" height="128" />
</p>

<h1 align="center">Aria</h1>

<p align="center">
  <strong>A modern music player for iOS, Android, and web</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Expo-54-000020?logo=expo" alt="Expo 54" />
  <img src="https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react" alt="React Native 0.81" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5.9" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" />
</p>

---

## Features

| | |
|:--|:--|
| **Multi-source streaming** | YouTube Music, Spotify, and local files |
| **Background playback** | Queue management, shuffle, and repeat |
| **Library management** | Playlists, favorites, and smart filtering |
| **10-band equalizer** | Customizable presets |
| **Synchronized lyrics** | Real-time lyric display |
| **Offline mode** | Download tracks for offline listening |
| **Material Design 3** | Dynamic theming and adaptive colors |
| **Plugin architecture** | Extensible provider system |

---

## Installation

```bash
# Clone the repository
git clone https://github.com/carlelieser/aria.git
cd aria
npm install
npm start

# Build for development
npm run build:android -- --profile development
```

### Run on a platform

```bash
npm run ios       # iOS Simulator
npm run android   # Android Emulator
npm run web       # Web Browser
```

### Available scripts

| Command | Description |
|:--------|:------------|
| `npm start` | Start Expo dev server |
| `npm run ios` | Run on iOS Simulator |
| `npm run android` | Run on Android Emulator |
| `npm run web` | Run in web browser |
| `npm run lint` | Lint with ESLint |
| `npm run test` | Run test suite |
| `npm run build:android` | Build Android APK |

---

## Architecture

Aria follows **Clean Architecture** with a plugin system for extensibility.

```
app/                   # Expo Router screens & navigation
components/            # Reusable UI components
hooks/                 # Custom React hooks
src/
├── domain/            # Entities & repository contracts
├── application/       # Services & Zustand stores
├── infrastructure/    # Storage & dependency injection
├── plugins/           # Metadata, playback, and sync providers
└── shared/            # Cross-cutting utilities
```

### Tech stack

| Layer | Technology |
|:------|:-----------|
| Framework | Expo 54 / React Native 0.81 |
| Language | TypeScript 5.9 |
| Routing | Expo Router 6 |
| State | Zustand |
| UI | React Native Paper |
| Audio | expo-audio |

See [`CLAUDE.md`](CLAUDE.md) for detailed architecture guidelines and code standards.

---

## Contributing

Contributions are welcome. Please read the guidelines in `CLAUDE.md` before submitting a pull request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes following [Conventional Commits](https://conventionalcommits.org)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

---

## License

[MIT](LICENSE)
