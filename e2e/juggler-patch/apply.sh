#!/usr/bin/env bash
# Patches Playwright's bundled Firefox Nightly omni.ja so its Juggler
# Browser.newPage handler tolerates the extra tab a temp-installed
# WebExtension spawns at headless startup, instead of throwing
# "Unexpected number of tabs in the new window".
#
# Lets the FF e2e suite run truly headless on any platform without
# popping a focus-stealing window.
#
# Idempotent: re-running just overwrites the same file in the archive.

set -euo pipefail

# Resolve Playwright FF bundle path
FF_VERSION=$(ls ~/Library/Caches/ms-playwright/ 2>/dev/null | grep '^firefox-' | head -1 || true)
if [ -z "$FF_VERSION" ]; then
  echo "No Playwright Firefox build under ~/Library/Caches/ms-playwright/" >&2
  exit 1
fi
RES="$HOME/Library/Caches/ms-playwright/$FF_VERSION/firefox/Nightly.app/Contents/Resources/omni.ja"
if [ ! -f "$RES" ]; then
  echo "omni.ja not found at $RES" >&2
  exit 1
fi

# Backup once
if [ ! -f "$RES.e2e-backup" ]; then
  cp "$RES" "$RES.e2e-backup"
  echo "[juggler-patch] backed up to $RES.e2e-backup"
fi

WORK=$(mktemp -d)
cd "$WORK"
unzip -q "$RES" chrome/juggler/content/TargetRegistry.js
PATCH_SRC="$(cd "$(dirname "$0")" && pwd)/TargetRegistry.patched.js"
cp "$PATCH_SRC" chrome/juggler/content/TargetRegistry.js
zip -0 -X "$RES" chrome/juggler/content/TargetRegistry.js > /dev/null
echo "[juggler-patch] applied"
