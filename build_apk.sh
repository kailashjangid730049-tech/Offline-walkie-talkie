#!/bin/bash
set -e

echo "Starting build process..."

# Check if android directory exists
if [ -d "android" ]; then
  cd android
elif [ -d "Walkie/android" ]; then
  cd Walkie/android
fi

# Ensure gradlew has execute permissions
chmod +x gradlew || true

# Run gradle assembleRelease or debug
if [ -f "./gradlew" ]; then
  ./gradlew assembleRelease || ./gradlew assembleDebug
else
  echo "Gradlew not found, looking for root android files..."
  gradle assembleDebug
fi

echo "Build script completed successfully!"
