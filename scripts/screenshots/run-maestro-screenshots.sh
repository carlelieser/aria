#!/bin/bash

# =============================================================================
# Aria - Maestro Screenshot Runner
# =============================================================================
# Wrapper script to run Maestro screenshot flows and organize outputs.
#
# Prerequisites:
#   - Install Maestro: curl -Ls "https://get.maestro.mobile.dev" | bash
#   - Android emulator running with app installed
#
# Usage:
#   ./scripts/screenshots/run-maestro-screenshots.sh [options]
#
# Options:
#   --light     Take screenshots in light mode only
#   --dark      Take screenshots in dark mode only
#   --both      Take screenshots in both modes (default)
#   --device    Specify device ID
#   --help      Show this help message
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
OUTPUT_DIR="${PROJECT_DIR}/fastlane/metadata/android/en-US/images/phoneScreenshots"
FLOW_FILE="${SCRIPT_DIR}/screenshot-flow.yaml"

# Default options
MODE="both"
DEVICE_ID=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

show_help() {
    head -20 "$0" | tail -15
    exit 0
}

check_maestro() {
    if ! command -v maestro &> /dev/null; then
        log_error "Maestro not found. Install with: curl -Ls \"https://get.maestro.mobile.dev\" | bash"
        exit 1
    fi
}

check_adb() {
    if ! command -v adb &> /dev/null; then
        log_error "adb not found. Please install Android SDK."
        exit 1
    fi
}

get_device() {
    if [ -n "$DEVICE_ID" ]; then
        echo "$DEVICE_ID"
        return
    fi
    adb devices | grep -v "List" | grep -v "^$" | head -1 | cut -f1
}

set_theme() {
    local theme="$1"
    local device
    device=$(get_device)

    if [ "$theme" = "dark" ]; then
        log_info "Setting dark mode..."
        adb -s "$device" shell cmd uimode night yes
    else
        log_info "Setting light mode..."
        adb -s "$device" shell cmd uimode night no
    fi
    sleep 1
}

run_maestro_flow() {
    local theme="$1"

    log_info "Running Maestro flow (${theme} mode)..."

    # Set theme
    set_theme "$theme"

    # Run Maestro with output directory
    local device_args=""
    if [ -n "$DEVICE_ID" ]; then
        device_args="--device $DEVICE_ID"
    fi

    # Run the flow from project directory (Maestro saves screenshots to cwd)
    cd "$PROJECT_DIR"
    maestro test "$FLOW_FILE" $device_args || {
        log_error "Maestro flow failed for ${theme} mode"
        return 1
    }

    # Move and rename screenshots from project root to output directory
    log_info "Organizing screenshots..."
    mkdir -p "$OUTPUT_DIR"

    for screenshot in "$PROJECT_DIR"/*.png; do
        if [ -f "$screenshot" ]; then
            local basename
            basename=$(basename "$screenshot")

            # Add theme suffix for dark mode
            if [ "$theme" = "dark" ]; then
                local name="${basename%.png}"
                local new_name="${name}_dark.png"
                mv "$screenshot" "${OUTPUT_DIR}/${new_name}"
                log_success "Saved: ${new_name}"
            else
                mv "$screenshot" "${OUTPUT_DIR}/${basename}"
                log_success "Saved: ${basename}"
            fi
        fi
    done

    log_success "Screenshots complete for ${theme} mode!"
}

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --light)
                MODE="light"
                shift
                ;;
            --dark)
                MODE="dark"
                shift
                ;;
            --both)
                MODE="both"
                shift
                ;;
            --device)
                DEVICE_ID="$2"
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
    check_maestro
    check_adb

    local device
    device=$(get_device)
    if [ -z "$device" ]; then
        log_error "No Android device found. Start an emulator or connect a device."
        exit 1
    fi

    log_info "Device: $device"
    log_info "Output: $OUTPUT_DIR"
    log_info "Mode: $MODE"

    # Run screenshot flows
    case $MODE in
        light)
            run_maestro_flow "light"
            ;;
        dark)
            run_maestro_flow "dark"
            ;;
        both)
            run_maestro_flow "light"
            run_maestro_flow "dark"
            ;;
    esac

    log_success "All screenshots complete!"
    log_info "Screenshots saved to: $OUTPUT_DIR"

    # List generated files
    echo ""
    log_info "Generated screenshots:"
    ls -la "$OUTPUT_DIR"/*.png 2>/dev/null || log_info "No screenshots found"
}

main "$@"
