#!/usr/bin/env bash
# Creates the RN project, installs deps, copies the source, patches Android.
set -euo pipefail
KIT="$(cd "$(dirname "$0")" && pwd)"
APP="${1:-/workspaces/Walkie}"

npx --yes @react-native-community/cli@15 init Walkie --version 0.76.5 \
  --package-name com.walkie --directory "$APP" --pm npm --skip-install --skip-git-init
cd "$APP"
npm install --legacy-peer-deps
npm install --legacy-peer-deps react-native-wifi-p2p react-native-live-audio-stream \
  react-native-tcp-socket react-native-background-actions \
  @react-native-async-storage/async-storage buffer

cp "$KIT/App.tsx" App.tsx
mkdir -p src && cp "$KIT"/src/* src/
mkdir -p android/app/src/main/java/com/walkie
cp "$KIT"/native/*.kt android/app/src/main/java/com/walkie/
python3 "$KIT/scripts/patch_android.py"

# old native libs are safest on the old architecture
sed -i 's/^newArchEnabled=.*/newArchEnabled=false/' android/gradle.properties
sed -i 's/^org.gradle.jvmargs=.*/org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1g/' android/gradle.properties
echo "Project ready in $APP"
