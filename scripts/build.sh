#!/usr/bin/env bash
# Loads .env and runs a local EAS preview build for the given platform.
# Usage: build.sh <android|ios> [eas build args...]

set -euo pipefail

PLATFORM="${1:-}"
[[ $# -gt 0 ]] && shift

case "$PLATFORM" in
	android) EXT="apk" ;;
	ios) EXT="ipa" ;;
	*)
		echo "Usage: $(basename "$0") <android|ios> [eas build args...]" >&2
		exit 1
		;;
esac

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
while IFS='=' read -r key value; do
	[[ -z "$key" || "$key" == \#* ]] && continue
	if [[ "$value" == \"*\" ]]; then
		value="${value:1:-1}"
	fi
	export "$key=$value"
done < "$ROOT_DIR/.env"

eas build --platform "$PLATFORM" --profile preview --local --output "out/aria.$EXT" "$@"
