#!/usr/bin/env bash
set -euo pipefail
if ! java -version 2>&1 | grep -q '"17'; then
  sudo apt-get update && sudo apt-get install -y openjdk-17-jdk
  echo 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64' >> ~/.bashrc
  export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
fi
export ANDROID_HOME="$HOME/android-sdk"
mkdir -p "$ANDROID_HOME/cmdline-tools"
curl -fsSLo /tmp/cmdtools.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip -qo /tmp/cmdtools.zip -d "$ANDROID_HOME/cmdline-tools"
rm -rf "$ANDROID_HOME/cmdline-tools/latest"
mv "$ANDROID_HOME/cmdline-tools/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools"
yes | sdkmanager --licenses >/dev/null
sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0" "ndk;26.1.10909125"
{
  echo "export ANDROID_HOME=$ANDROID_HOME"
  echo 'export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools'
} >> ~/.bashrc
echo "SDK installed. Run: source ~/.bashrc"
