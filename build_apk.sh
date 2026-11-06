#!/usr/bin/env bash
set -euo pipefail
APP="${1:-/workspaces/Walkie}"
cd "$APP/android"
chmod +x gradlew
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon
echo "APK: $APP/android/app/build/outputs/apk/release/app-release.apk"
