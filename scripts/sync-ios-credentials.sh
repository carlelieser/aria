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
TEMP_PASS=$(openssl rand -hex 16)

# Find the fingerprint of the cert that matches the installed App Store profile
PROFILE_CERT=$(security cms -D -i "$(find "$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles" -name "*.mobileprovision" | while read -r f; do
  name=$(security cms -D -i "$f" 2>/dev/null | python3 -c "import sys,plistlib; p=plistlib.loads(sys.stdin.buffer.read()); print(p.get('Name',''))" 2>/dev/null)
  [ "$name" = "match AppStore com.aria.music.app" ] && echo "$f" && break
done)" 2>/dev/null | python3 -c "
import sys, plistlib, subprocess
p = plistlib.loads(sys.stdin.buffer.read())
certs = p.get('DeveloperCertificates', [])
for cert in certs:
    r = subprocess.run(['openssl', 'x509', '-inform', 'DER', '-noout', '-fingerprint', '-sha1'], input=bytes(cert), capture_output=True, text=True)
    print(r.stdout.split('=')[1].strip().replace(':', ''))
    break
" 2>/dev/null)

# Temporarily remove all other Apple Distribution certs so we export only the Match one
OTHER_CERTS=$(security find-identity -v | grep "Apple Distribution" | grep -v "$PROFILE_CERT" | awk '{print $2}')
for fp in $OTHER_CERTS; do
  security delete-certificate -Z "$fp" ~/Library/Keychains/login.keychain-db 2>/dev/null || true
done

security export -k login.keychain -t identities -f pkcs12 -P "$MATCH_KEYCHAIN_PASSWORD" -o "$CERTS_DIR/dist-cert.p12"

# Re-import removed certs
security export -k login.keychain -t identities -f pkcs12 -P "$TEMP_PASS" -o "$TEMP_BACKUP" 2>/dev/null || true
for fp in $OTHER_CERTS; do
  security import "$TEMP_BACKUP" -k login.keychain -P "$TEMP_PASS" -T /usr/bin/codesign 2>/dev/null || true
done
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
      "password": "$MATCH_KEYCHAIN_PASSWORD"
    }
  }
}
JSON

echo "[sync-ios-credentials] Done. ios/certs/ and credentials.json are up to date."
