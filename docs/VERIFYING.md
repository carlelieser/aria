# Verifying changes

Static checks (`tsc`, `eslint`, tests) are necessary but **not sufficient**. A
change can pass all of them and still be broken at runtime — a YouTube fix passed
1200+ tests while the app still returned HTTP 403 on device; the real bug only
showed up when the app was driven through its UI on a device. **Every change with
a runtime surface must be verified by running the app**, not just by green tests.

This doc describes the emulator-driven verification loop. Follow it before
opening a PR for any change that touches product behavior (skip it only for
pure docs/test/tooling changes with no runtime effect).

---

## When a rebuild is needed vs. a reload

- **JS/TS-only change** → Metro Fast Refresh picks it up; just reload the app.
- **Native dependency change** (adding/removing/version-bumping a package with
  native code — e.g. `react-native-pager-view`, `react-native-worklets`,
  `react-native-track-player`, most `expo-*`) → **full native rebuild required**:
  `npx expo run:android`. A reload will run old native code against new JS and
  give misleading results.

## The loop

### 1. Build and launch

```bash
npx expo run:android            # or: --device <model> (e.g. Pixel_9a)
```

First clean build takes several minutes (prebuild + Gradle). This is an **Expo**
project — never use `react-native run-android`.

### 2. Drive the UI with adb

```bash
adb devices -l                                  # confirm device/emulator
adb exec-out screencap -p > /tmp/screen.png     # screenshot to inspect
adb shell input tap <x> <y>                     # tap (coords from screenshot)
adb shell input swipe <x1> <y1> <x2> <y2> <ms>  # scroll/swipe
adb shell input text "query"                    # type (use %s for spaces)
adb shell input keyevent 4                      # back button
```

Read the screenshot after each action to decide the next tap — coordinates come
from what's actually on screen, not assumptions. The dev launcher and dev menu
overlays intercept taps; dismiss them first.

### 3. Watch the logs

The app logger writes through `console.*`, which surfaces in logcat as
`ReactNativeJS`. Filter to app logs and the failure signatures you care about:

```bash
adb logcat -c                                   # clear before an action
adb shell input tap <x> <y>                      # trigger the flow
adb logcat -d -v time "ReactNativeJS:V" "*:S" | \
  grep -aE "PlaybackError|Status change|error|Time-to-playback"
```

Native-layer failures (ExoPlayer/Media3, CMake, signing) show up under other
tags — grep logcat broadly (`-d` without a tag filter) when a JS log says
"error" but doesn't explain why. Verify the fix at the layer that actually
failed: an HTTP status, a native exception, a resolved URL — not just "the JS
didn't throw".

### 4. Confirm, don't assume

Watch a flow for long enough to catch delayed failures (a track that plays for
69s then 403s looks fine at second 1). A silent success and a stuck spinner can
look identical in a single screenshot — check the logs, the player state, and
the elapsed time, not just the frame.

---

## Hot paths to exercise

Which paths matter depends on the change, but these are the load-bearing
surfaces most likely to regress:

| Surface                 | What to check                                                                                                                                                                 | Backed by                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Playback**            | Play a track that isn't cached/downloaded (fresh stream resolution), let it run 60s+, skip to next. Watch for `Status change: playing`, no `PlaybackError`/403 recovery loop. | ANDROID_VR client → DASH manifest → dash provider               |
| **Library lists**       | Open Library, scroll the Songs list, switch tabs (Songs/Artists/Albums/Playlists). Watch for blank rows, scroll jank, crashes.                                                | `@shopify/flash-list`, `react-native-pager-view`                |
| **Feed**                | Open Feed, scroll carousels, tap a playlist card.                                                                                                                             | FlashList, home-feed operations                                 |
| **Animations**          | Mini-player waveform, progress bar, splash — should animate smoothly on the UI thread with no dropped frames.                                                                 | `react-native-reanimated` / `react-native-worklets` (~30 files) |
| **Library persistence** | Force-stop and relaunch; confirm saved tracks/playlists reload without a startup crash (rehydration revives `Duration`/`Date`/`TrackId`).                                     | `library-store` rehydration                                     |
| **Downloads**           | Download a track, confirm it plays offline.                                                                                                                                   | `expo-file-system/legacy`, download service                     |

After a **dependency change**, exercise every surface backed by a package that
moved — a downgrade can silently change list virtualization, tab gestures, or
animation timing that no unit test covers.

---

## Dependency changes: clean everything

A dependency change is the highest-risk case, because a stale toolchain will
report failures that aren't real (and hide ones that are). After changing any
dependency:

1. **Clean-reinstall node_modules** — `expo install` can leave the tree in an
   inconsistent hoisting state:
    ```bash
    rm -rf node_modules && npm ci
    ```
2. **Watch for re-nested packages.** An `expo` core bump can move a package the
   app imports directly (e.g. `expo-file-system`, `babel-preset-expo`) under
   `node_modules/expo/node_modules/`, which breaks bare imports and Metro's
   babel preset. If tsc reports `Cannot find module 'X'` or Metro reports
   `Cannot find module 'babel-preset-expo'`, add `X` as an explicit direct
   dependency to force it top-level.
3. **Restart Metro with a cleared cache** — a Metro left running from a previous
   install serves a stale module map and reports phantom `ENOENT` errors for
   paths that moved:
    ```bash
    lsof -ti tcp:8081 | xargs kill -9
    npx expo start --dev-client --clear
    ```
4. **Do a clean native rebuild** so stale native artifacts don't mask the change:
    ```bash
    npx expo prebuild --platform android --clean
    npx expo run:android
    ```
5. **Sanity-check the bundle builds** before driving the UI — this catches
   transform/resolution failures fast:
    ```bash
    curl -s "http://localhost:8081/lib/entry.ts.bundle?platform=android&dev=true" | head -c 200
    # JS/bytecode → bundle OK; {"type":"...Error"} → bundle failed
    ```

## Emulator troubleshooting

- **Connecting to Metro:** the emulator reaches the host via `10.0.2.2:8081`, not
  the LAN IP Metro prints. Run `adb reverse tcp:8081 tcp:8081` and pick the
  `10.0.2.2` dev-server entry in the launcher.
- **Black screen / unresponsive:** cold-boot without a snapshot —
  `emulator -avd <name> -no-snapshot -no-audio -no-boot-anim`.
- **Emulator dies mid-session** (`Netsim Wifi ... gone due to ping timeout`):
  a known networking-watchdog crash. Reboot and, if it recurs, fall back to a
  physical device.
