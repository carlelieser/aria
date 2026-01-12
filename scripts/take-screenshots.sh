#!/bin/bash

# =============================================================================
# Aria - Automated Screenshot Script for Android
# =============================================================================
# This script automates taking screenshots of the Aria app on Android emulator
# for use in app store listings.
#
# Prerequisites:
# - Android SDK installed with adb in PATH
# - Android emulator running OR device connected
# - App built and installed on device/emulator
#
# Usage:
#   ./scripts/take-screenshots.sh [options]
#
# Options:
#   --device <id>    Specify device/emulator ID (default: first available)
#   --dark           Take screenshots in dark mode
#   --light          Take screenshots in light mode (default)
#   --both           Take screenshots in both modes
#   --no-mock        Skip loading mock data (assumes already loaded)
#   --help           Show this help message
# =============================================================================

set -e

# Configuration
PACKAGE_NAME="com.aria.player"
SCHEME="aria"
OUTPUT_DIR="fastlane/metadata/android/en-US/images/phoneScreenshots"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Default options
DEVICE_ID=""
MODE="light"
LOAD_MOCK_DATA=true
SCREENSHOT_DELAY=2  # seconds to wait after navigation

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_help() {
    head -30 "$0" | tail -25
    exit 0
}

check_adb() {
    if ! command -v adb &> /dev/null; then
        log_error "adb not found. Please install Android SDK and add it to PATH."
        exit 1
    fi
}

get_device() {
    if [ -n "$DEVICE_ID" ]; then
        echo "$DEVICE_ID"
        return
    fi

    local devices
    devices=$(adb devices | grep -v "List" | grep -v "^$" | head -1 | cut -f1)

    if [ -z "$devices" ]; then
        log_error "No Android devices found. Please start an emulator or connect a device."
        exit 1
    fi

    echo "$devices"
}

adb_cmd() {
    local device
    device=$(get_device)
    adb -s "$device" "$@"
}

wait_for_app() {
    log_info "Waiting for app to be ready..."
    sleep 3
}

navigate_to() {
    local route="$1"
    local description="$2"

    log_info "Navigating to: $description ($route)"

    # Use deep linking to navigate
    adb_cmd shell am start -a android.intent.action.VIEW -d "${SCHEME}://${route}" "$PACKAGE_NAME"

    sleep "$SCREENSHOT_DELAY"
}

take_screenshot() {
    local name="$1"
    local suffix=""

    if [ "$MODE" = "dark" ]; then
        suffix="_dark"
    fi

    local filename="${name}${suffix}.png"
    local device_path="/sdcard/screenshot.png"
    local output_path="${PROJECT_DIR}/${OUTPUT_DIR}/${filename}"

    log_info "Taking screenshot: $filename"

    # Capture screenshot on device
    adb_cmd shell screencap -p "$device_path"

    # Pull to local machine
    adb_cmd pull "$device_path" "$output_path" > /dev/null 2>&1

    # Clean up device
    adb_cmd shell rm "$device_path"

    log_success "Saved: $filename"
}

press_back() {
    adb_cmd shell input keyevent KEYCODE_BACK
    sleep 0.5
}

tap_screen() {
    local x="$1"
    local y="$2"
    adb_cmd shell input tap "$x" "$y"
    sleep 0.5
}

swipe_left() {
    adb_cmd shell input swipe 800 1000 200 1000 200
    sleep 0.5
}

swipe_up() {
    adb_cmd shell input swipe 500 1500 500 500 300
    sleep 0.5
}

set_dark_mode() {
    log_info "Setting dark mode..."
    adb_cmd shell cmd uimode night yes
    sleep 1
}

set_light_mode() {
    log_info "Setting light mode..."
    adb_cmd shell cmd uimode night no
    sleep 1
}

launch_app() {
    log_info "Launching app..."
    adb_cmd shell am start -n "${PACKAGE_NAME}/.MainActivity"
    wait_for_app
}

force_stop_app() {
    log_info "Stopping app..."
    adb_cmd shell am force-stop "$PACKAGE_NAME"
    sleep 1
}

# -----------------------------------------------------------------------------
# Screenshot Sequences
# -----------------------------------------------------------------------------

load_mock_data_via_settings() {
    log_info "Loading mock data via Settings..."

    # Navigate to settings
    navigate_to "settings" "Settings"
    sleep 1

    # Scroll down to find Developer section and tap Screenshot Mode
    # We'll scroll and tap multiple times to ensure we find it
    swipe_up
    sleep 0.5
    swipe_up
    sleep 0.5

    # The Screenshot Mode button should be visible now
    # Tap approximately where it should be (adjust coordinates as needed)
    # This is a fallback - ideally we'd use UI automator

    log_info "Please manually enable Screenshot Mode in Settings > Developer if not already enabled"
    sleep 2
}

take_library_screenshots() {
    log_info "Taking Library screenshots..."

    # Songs tab (default)
    navigate_to "(tabs)" "Library - Songs"
    sleep 1
    take_screenshot "01_library_songs"

    # For tab switching, we need to tap on the segment buttons
    # Albums tab - tap on the albums segment (approximate position)
    tap_screen 270 200  # Adjust based on actual tab position
    sleep 1
    take_screenshot "02_library_albums"

    # Artists tab
    tap_screen 450 200
    sleep 1
    take_screenshot "03_library_artists"

    # Playlists tab
    tap_screen 630 200
    sleep 1
    take_screenshot "04_library_playlists"
}

take_explore_screenshot() {
    log_info "Taking Explore screenshot..."
    navigate_to "(tabs)/explore" "Explore"
    take_screenshot "05_explore"
}

take_downloads_screenshot() {
    log_info "Taking Downloads screenshot..."
    navigate_to "(tabs)/downloads" "Downloads"
    take_screenshot "06_downloads"
}

take_settings_screenshot() {
    log_info "Taking Settings screenshot..."
    navigate_to "(tabs)/settings" "Settings"
    take_screenshot "07_settings"
}

take_player_screenshot() {
    log_info "Taking Player screenshot..."
    navigate_to "player" "Player"
    take_screenshot "08_player"
}

take_detail_screenshots() {
    log_info "Taking detail screen screenshots..."

    # Album detail - use a mock album ID
    navigate_to "album/album-001" "Album Detail"
    take_screenshot "09_album_detail"

    # Artist detail
    navigate_to "artist/artist-001" "Artist Detail"
    take_screenshot "10_artist_detail"

    # Playlist detail
    navigate_to "playlist/playlist-001" "Playlist Detail"
    take_screenshot "11_playlist_detail"
}

run_screenshot_sequence() {
    local current_mode="$1"

    log_info "Starting screenshot sequence (${current_mode} mode)..."

    # Set the theme mode
    if [ "$current_mode" = "dark" ]; then
        set_dark_mode
    else
        set_light_mode
    fi

    # Restart app to apply theme
    force_stop_app
    launch_app

    # Load mock data if needed
    if [ "$LOAD_MOCK_DATA" = true ]; then
        load_mock_data_via_settings
        # Return to home and restart to ensure data is loaded
        force_stop_app
        launch_app
    fi

    # Take all screenshots
    take_library_screenshots
    take_explore_screenshot
    take_downloads_screenshot
    take_settings_screenshot
    take_player_screenshot
    take_detail_screenshots

    log_success "Screenshot sequence complete for ${current_mode} mode!"
}

# -----------------------------------------------------------------------------
# Main Script
# -----------------------------------------------------------------------------

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --device)
                DEVICE_ID="$2"
                shift 2
                ;;
            --dark)
                MODE="dark"
                shift
                ;;
            --light)
                MODE="light"
                shift
                ;;
            --both)
                MODE="both"
                shift
                ;;
            --no-mock)
                LOAD_MOCK_DATA=false
                shift
                ;;
            --delay)
                SCREENSHOT_DELAY="$2"
                shift 2
                ;;
            --help)
                show_help
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                ;;
        esac
    done

    # Pre-flight checks
    check_adb

    log_info "Device: $(get_device)"
    log_info "Output: $OUTPUT_DIR"
    log_info "Mode: $MODE"

    # Create output directory if it doesn't exist
    mkdir -p "${PROJECT_DIR}/${OUTPUT_DIR}"

    # Run screenshot sequences
    if [ "$MODE" = "both" ]; then
        MODE="light"
        run_screenshot_sequence "light"
        MODE="dark"
        run_screenshot_sequence "dark"
    else
        run_screenshot_sequence "$MODE"
    fi

    log_success "All screenshots complete!"
    log_info "Screenshots saved to: ${OUTPUT_DIR}"
}

main "$@"
