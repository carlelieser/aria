# Publishing

Guide for publishing Aria to app stores.

---

## F-Droid

[F-Droid](https://f-droid.org/) is an open-source Android app repository. Apps are built from source on F-Droid's servers.

### Metadata Structure

F-Droid reads app metadata from the Fastlane directory structure:

```
fastlane/metadata/android/en-US/
├── short_description.txt     # Max 80 characters
├── full_description.txt      # Full app store description (HTML supported)
├── changelogs/
│   └── <versionCode>.txt     # Changelog for each version (e.g., 1.txt, 2.txt)
└── images/
    ├── icon.png              # 512x512 app icon
    └── phoneScreenshots/     # Screenshots (1.png, 2.png, etc.)
```

### Taking Screenshots

Use the automated screenshot script:

```bash
# Light mode screenshots
./scripts/take-screenshots.sh

# Dark mode screenshots
./scripts/take-screenshots.sh --dark

# Both modes
./scripts/take-screenshots.sh --both
```

**Prerequisites:**

- Android SDK with `adb` in PATH
- Emulator running or device connected
- App installed on device

**Options:**
| Flag | Description |
|------|-------------|
| `--device <id>` | Target specific device |
| `--light` | Light mode only (default) |
| `--dark` | Dark mode only |
| `--both` | Both light and dark modes |
| `--no-mock` | Skip loading mock data |
| `--delay <sec>` | Wait time between navigations |

Screenshots are saved to `fastlane/metadata/android/en-US/images/phoneScreenshots/`.

### Updating Changelogs

When releasing a new version:

1. Increment `versionCode` in `android/app/build.gradle`
2. Create `fastlane/metadata/android/en-US/changelogs/<versionCode>.txt`
3. Add a brief description of changes

### Submission Checklist

- [ ] App is open-source with a [FOSS-compatible license](https://spdx.org/licenses/)
- [ ] Source code is publicly accessible
- [ ] Fastlane metadata is complete (descriptions, icon, screenshots, changelog)
- [ ] Release is tagged in git (e.g., `v0.2.1-beta`)
- [ ] App builds from source without network access during Gradle build

### Submitting to F-Droid

**Option 1: Request for Packaging (RFP)**

Open an issue at [gitlab.com/fdroid/rfp](https://gitlab.com/fdroid/rfp) with:

- Application ID: `com.aria.music.app`
- Source repository URL
- Brief description of the app

**Option 2: Merge Request (faster)**

1. Fork [gitlab.com/fdroid/fdroiddata](https://gitlab.com/fdroid/fdroiddata)
2. Create `metadata/com.aria.music.app.yml`:

```yaml
Categories:
    - Multimedia

License: MIT

AuthorName: Carlos Santos
AuthorWebSite: https://github.com/carlelieser

WebSite: https://github.com/carlelieser/aria
SourceCode: https://github.com/carlelieser/aria
IssueTracker: https://github.com/carlelieser/aria/issues

AutoName: Aria

RepoType: git
Repo: https://github.com/carlelieser/aria.git

Builds:
    - versionName: 0.2.1-beta
      versionCode: 1
      commit: v0.2.1-beta
      subdir: android/app
      gradle:
          - yes
      prebuild:
          - cd ../..
          - npm install

AutoUpdateMode: Version
UpdateCheckMode: Tags
CurrentVersion: 0.2.1-beta
CurrentVersionCode: 1
```

3. Submit a merge request to fdroiddata

### Resources

- [F-Droid Inclusion Policy](https://f-droid.org/docs/Inclusion_Policy/)
- [Build Metadata Reference](https://f-droid.org/docs/Build_Metadata_Reference/)
- [Submitting to F-Droid Quick Start Guide](https://f-droid.org/docs/Submitting_to_F-Droid_Quick_Start_Guide/)
