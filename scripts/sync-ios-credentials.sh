#!/usr/bin/env bash
# Refreshes iOS signing credentials from Match and updates ios/certs/.

set -euo pipefail

CERTS_DIR="$(dirname "$0")/../ios/certs"
mkdir -p "$CERTS_DIR"

echo "[sync-ios-credentials] Refreshing App Store credentials from Match..."
bundle exec fastlane match appstore --readonly false

echo "[sync-ios-credentials] Exporting distribution certificate..."
# Remove the non-Match Apple Distribution cert temporarily so we export the right one
TEMP_BACKUP=$(mktemp /tmp/dist-backup-XXXXXX.p12)
security export -k login.keychain -t identities -f pkcs12 -P "backup" -o "$TEMP_BACKUP" 2>/dev/null
security delete-certificate -Z D61556A30AA326E6EFDFB57FB45FF5B4359A9F5F ~/Library/Keychains/login.keychain-db 2>/dev/null || true
security export -k login.keychain -t identities -f pkcs12 -P "iex3shi9Lohl" -o "$CERTS_DIR/dist-cert.p12"
security import "$TEMP_BACKUP" -k login.keychain -P "backup" -T /usr/bin/codesign 2>/dev/null || true
rm -f "$TEMP_BACKUP"

echo "[sync-ios-credentials] Copying provisioning profile..."
find "$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles" -name "*.mobileprovision" | while read -r f; do
  name=$(security cms -D -i "$f" 2>/dev/null | python3 -c "import sys,plistlib; p=plistlib.loads(sys.stdin.buffer.read()); print(p.get('Name',''))" 2>/dev/null)
  if [ "$name" = "match AppStore com.aria.music.app" ]; then
    cp "$f" "$CERTS_DIR/profile.mobileprovision"
    echo "[sync-ios-credentials] Profile copied."
    break
  fi
done

echo "[sync-ios-credentials] Writing credentials.json..."
cat > "$(dirname "$0")/../credentials.json" << JSON
{
  "ios": {
    "provisioningProfilePath": "ios/certs/profile.mobileprovision",
    "distributionCertificate": {
      "path": "ios/certs/dist-cert.p12",
      "password": "iex3shi9Lohl"
    }
  }
}
JSON

echo "[sync-ios-credentials] Done. ios/certs/ and credentials.json are up to date."
