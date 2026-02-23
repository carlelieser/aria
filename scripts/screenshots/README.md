# Screenshot Automation

Automated screenshot capture for Aria app store listings.

## Prerequisites

### 1. Install Maestro (Recommended)

Maestro is a mobile UI testing framework that provides reliable screenshot automation.

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

### 2. Android Setup

- Android SDK installed with `adb` in PATH
- Android emulator running or physical device connected
- App built and installed:
    ```bash
    npm run android
    ```

## Usage

### Quick Start

```bash
# Take screenshots in both light and dark mode
npm run screenshots

# Light mode only
npm run screenshots:light

# Dark mode only
npm run screenshots:dark
```

### Manual Execution

```bash
# Using Maestro (recommended)
./scripts/screenshots/run-maestro-screenshots.sh --both

# Using ADB directly (fallback)
./scripts/take-screenshots.sh --both
```

### Options

| Option          | Description                              |
| --------------- | ---------------------------------------- |
| `--light`       | Take screenshots in light mode only      |
| `--dark`        | Take screenshots in dark mode only       |
| `--both`        | Take screenshots in both modes (default) |
| `--device <id>` | Specify device/emulator ID               |

## Output

Screenshots are saved to:

```
fastlane/metadata/android/en-US/images/phoneScreenshots/
```

### Generated Files

Dark mode variants have `_dark` suffix.

| Light | Dark | Screen |
|-------|------|--------|
| ![Feed](../../fastlane/metadata/android/en-US/images/phoneScreenshots/01_feed.png) | ![Feed Dark](../../fastlane/metadata/android/en-US/images/phoneScreenshots/01_feed_dark.png) | Feed (landing screen) |
| ![Library Songs](../../fastlane/metadata/android/en-US/images/phoneScreenshots/02_library_songs.png) | ![Library Songs Dark](../../fastlane/metadata/android/en-US/images/phoneScreenshots/02_library_songs_dark.png) | Library - Songs tab |
| ![Library Albums](../../fastlane/metadata/android/en-US/images/phoneScreenshots/03_library_albums.png) | ![Library Albums Dark](../../fastlane/metadata/android/en-US/images/phoneScreenshots/03_library_albums_dark.png) | Library - Albums tab |
| ![Library Artists](../../fastlane/metadata/android/en-US/images/phoneScreenshots/04_library_artists.png) | ![Library Artists Dark](../../fastlane/metadata/android/en-US/images/phoneScreenshots/04_library_artists_dark.png) | Library - Artists tab |
| ![Library Playlists](../../fastlane/metadata/android/en-US/images/phoneScreenshots/05_library_playlists.png) | ![Library Playlists Dark](../../fastlane/metadata/android/en-US/images/phoneScreenshots/05_library_playlists_dark.png) | Library - Playlists tab |
| ![Playlist Detail](../../fastlane/metadata/android/en-US/images/phoneScreenshots/06_playlist_detail.png) | ![Playlist Detail Dark](../../fastlane/metadata/android/en-US/images/phoneScreenshots/06_playlist_detail_dark.png) | Playlist detail view |
| ![Downloads](../../fastlane/metadata/android/en-US/images/phoneScreenshots/07_downloads.png) | ![Downloads Dark](../../fastlane/metadata/android/en-US/images/phoneScreenshots/07_downloads_dark.png) | Downloads screen |
| ![Player](../../fastlane/metadata/android/en-US/images/phoneScreenshots/08_player.png) | ![Player Dark](../../fastlane/metadata/android/en-US/images/phoneScreenshots/08_player_dark.png) | Full-screen player |
| ![Album Detail](../../fastlane/metadata/android/en-US/images/phoneScreenshots/09_album_detail.png) | ![Album Detail Dark](../../fastlane/metadata/android/en-US/images/phoneScreenshots/09_album_detail_dark.png) | Album detail view |
| ![Artist Detail](../../fastlane/metadata/android/en-US/images/phoneScreenshots/10_artist_detail.png) | ![Artist Detail Dark](../../fastlane/metadata/android/en-US/images/phoneScreenshots/10_artist_detail_dark.png) | Artist detail view |
| ![Settings](../../fastlane/metadata/android/en-US/images/phoneScreenshots/11_settings.png) | ![Settings Dark](../../fastlane/metadata/android/en-US/images/phoneScreenshots/11_settings_dark.png) | Settings screen |

## How It Works

1. **Mock Data Loading**: The script navigates to Settings and enables "Screenshot Mode" which loads realistic mock data into the app
2. **Navigation**: Uses Maestro's declarative UI testing to navigate through screens
3. **Screenshots**: Captures each screen and saves to the fastlane directory
4. **Theme Switching**: Uses ADB to toggle system dark/light mode

## Troubleshooting

### "Maestro not found"

Install Maestro:

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

### "No Android device found"

Start an emulator:

```bash
emulator -avd <avd_name>
```

Or list available AVDs:

```bash
emulator -list-avds
```

### Screenshots look wrong

1. Ensure the app is freshly installed
2. Clear app data: `adb shell pm clear com.aria.music.app`
3. Re-run the screenshot script

### Maestro flow fails

Run Maestro Studio to debug:

```bash
maestro studio
```

## Customization

### Modifying the Flow

Edit `scripts/screenshots/screenshot-flow.yaml` to:

- Add new screens
- Change navigation paths
- Adjust wait times

### Adding New Screenshots

1. Add navigation step in `screenshot-flow.yaml`
2. Add `- takeScreenshot: "XX_screen_name"` command
3. Update this README with the new screenshot
