#!/usr/bin/env bash
# Copies the dSYMs for React Native's prebuilt frameworks (React,
# ReactNativeDependencies, hermesvm) into a dSYM folder, so App Store Connect
# can symbolicate crashes in them. The prebuilt xcframeworks ship without
# symbols; React Native publishes matching dSYMs on Maven Central.
#
# Runs as the "[TEI] Add prebuilt React Native dSYMs" build phase during
# Archive (folder = $DWARF_DSYM_FOLDER_PATH), or by hand on an existing archive:
#   scripts/ios-prebuilt-dsyms.sh "path/to/TEI.xcarchive/dSYMs"
#
# Never fails the build: a missing download or a UUID mismatch is a warning.

set -uo pipefail

DEST="${1:-${DWARF_DSYM_FOLDER_PATH:-}}"
if [[ -z "$DEST" ]]; then
  echo "usage: $0 <dSYM folder>" >&2
  exit 1
fi

APP_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RN_VERSION="$(sed -nE 's/^  "version": "([^"]+)".*/\1/p' "$APP_ROOT/node_modules/react-native/package.json" | head -1)"
HERMES_VERSION="$(sed -nE 's/^  - hermes-engine \(([^)]+)\):?$/\1/p' "$APP_ROOT/ios/Podfile.lock" | head -1)"
MAVEN="https://repo1.maven.org/maven2/com/facebook"
CACHE="${HOME}/Library/Caches/tei-prebuilt-dsyms"

warn() { echo "warning: [prebuilt dSYMs] $*"; }

if [[ -z "$RN_VERSION" || -z "$HERMES_VERSION" ]]; then
  warn "could not read the React Native or Hermes version; skipping."
  exit 0
fi

# name  framework  slice  url
ARTIFACTS=(
  "rn-core-$RN_VERSION React ios-arm64 $MAVEN/react/react-native-artifacts/$RN_VERSION/react-native-artifacts-$RN_VERSION-reactnative-core-dSYM-release.tar.gz"
  "rn-deps-$RN_VERSION ReactNativeDependencies ios-arm64 $MAVEN/react/react-native-artifacts/$RN_VERSION/react-native-artifacts-$RN_VERSION-reactnative-dependencies-dSYM-release.tar.gz"
  "hermes-$HERMES_VERSION hermesvm iphoneos $MAVEN/hermes/hermes-ios/$HERMES_VERSION/hermes-ios-$HERMES_VERSION-hermes-framework-dSYM-release.tar.gz"
)

mkdir -p "$CACHE" "$DEST"

# Where the built app is, to check that each dSYM matches the binary we ship.
APP_DIR=""
if [[ -n "${TARGET_BUILD_DIR:-}" && -n "${WRAPPER_NAME:-}" ]]; then
  APP_DIR="$TARGET_BUILD_DIR/$WRAPPER_NAME"
elif [[ -d "$DEST/../Products/Applications" ]]; then
  APP_DIR="$(find "$DEST/../Products/Applications" -maxdepth 1 -name '*.app' | head -1)"
fi

uuids() { dwarfdump --uuid "$1" 2>/dev/null | awk '{print $2}' | sort; }

for entry in "${ARTIFACTS[@]}"; do
  read -r name framework slice url <<<"$entry"
  dsym="$CACHE/$name/$framework.framework.dSYM"

  if [[ ! -d "$dsym" ]]; then
    echo "[prebuilt dSYMs] downloading $framework symbols ($name)"
    tmp="$(mktemp -d "$CACHE/dl.XXXXXX")"
    if curl -sfL --retry 3 -o "$tmp/a.tar.gz" "$url" \
      && tar -xzf "$tmp/a.tar.gz" -C "$tmp" "$slice/$framework.framework.dSYM"; then
      mkdir -p "$CACHE/$name"
      mv "$tmp/$slice/$framework.framework.dSYM" "$dsym"
    else
      warn "could not download $url"
    fi
    rm -rf "$tmp"
  fi
  [[ -d "$dsym" ]] || continue

  binary="$APP_DIR/Frameworks/$framework.framework/$framework"
  if [[ -n "$APP_DIR" && -f "$binary" ]] \
    && [[ "$(uuids "$binary")" != "$(uuids "$dsym/Contents/Resources/DWARF/$framework")" ]]; then
    warn "$framework dSYM UUID does not match the embedded framework; skipping."
    continue
  fi

  rm -rf "$DEST/$framework.framework.dSYM"
  cp -R "$dsym" "$DEST/"
  echo "[prebuilt dSYMs] added $framework.framework.dSYM"
done
