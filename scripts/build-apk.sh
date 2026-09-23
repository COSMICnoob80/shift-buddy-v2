#!/usr/bin/env bash
#
# build-apk.sh — build an installable Shift Buddy Android APK locally.
#
# Runs the same quality gate as CI, then invokes the Gradle release build.
# The release build is debug-signed (see mobile/android/app/build.gradle),
# so the output APK installs directly on a device with no extra setup.
#
# Usage:
#   bash scripts/build-apk.sh
#
# Requirements: Node 20+, JDK 17, Android SDK (ANDROID_HOME set).
# If android/ is missing, it is generated via `expo prebuild`.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE_DIR="$REPO_ROOT/mobile"
APK_PATH="$MOBILE_DIR/android/app/build/outputs/apk/release/app-release.apk"

cd "$MOBILE_DIR"

echo "==> Shift Buddy APK build"
echo "    repo:   $REPO_ROOT"
echo "    mobile: $MOBILE_DIR"
echo

# --- Preflight -------------------------------------------------------------
if [ ! -f package.json ]; then
  echo "ERROR: $MOBILE_DIR/package.json not found. Aborting." >&2
  exit 1
fi

if ! command -v java >/dev/null 2>&1; then
  echo "ERROR: java not found. Install JDK 17 and retry." >&2
  exit 1
fi

if [ -z "${ANDROID_HOME:-}" ] && [ -z "${ANDROID_SDK_ROOT:-}" ]; then
  echo "WARNING: ANDROID_HOME / ANDROID_SDK_ROOT are not set."
  echo "         Gradle may fail to locate the Android SDK."
  echo
fi

if [ ! -d node_modules ]; then
  echo "==> node_modules missing — installing dependencies"
  npm ci --no-audit --no-fund || npm install --no-audit --no-fund
fi

# --- Quality gate (never build on red) -------------------------------------
echo "==> Quality gate: typecheck"
npx tsc --noEmit

echo "==> Quality gate: unit tests"
npx jest --no-color

echo "==> Quality gate passed"
echo

# --- Native project --------------------------------------------------------
if [ ! -f android/gradlew ]; then
  echo "==> android/ missing — generating native project"
  npx expo prebuild --platform android --no-install
fi

# --- Build -----------------------------------------------------------------
echo "==> Building release APK (this takes a while on first run)"
cd android
chmod +x gradlew
./gradlew assembleRelease --no-daemon

cd "$MOBILE_DIR"

if [ ! -f "$APK_PATH" ]; then
  echo "ERROR: build finished but APK not found at $APK_PATH" >&2
  exit 1
fi

SIZE="$(du -h "$APK_PATH" | cut -f1)"

echo
echo "==> Done"
echo "    APK:  $APK_PATH"
echo "    Size: $SIZE"
echo
echo "Next steps:"
echo "  1. Transfer the APK to your phone (USB, email, or cloud)."
echo "  2. Enable \"Install from unknown sources\"."
echo "  3. Open the APK to install."
echo "  4. Tag and push to publish it as a GitHub Release:"
echo "       git tag v0.5.0-alpha.1 && git push origin v0.5.0-alpha.1"
