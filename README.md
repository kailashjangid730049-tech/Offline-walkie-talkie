# Walkie – P2P push-to-talk (React Native 0.76, Android)

Stack: react-native-wifi-p2p (Wi-Fi Direct link) + react-native-tcp-socket (data channel over the Wi-Fi Direct group)
+ react-native-live-audio-stream (mic capture) + Kotlin AudioTrack module (playback) + react-native-background-actions (foreground service).

## Build in GitHub Codespaces (use a 4-core/16 GB machine)
1. Upload this `walkie-kit` folder to the Codespace (drag into Explorer), or put it in a repo and open a Codespace on it.
2. In the terminal:

    cd walkie-kit
    chmod +x *.sh
    ./install_android_sdk.sh && source ~/.bashrc
    ./setup.sh /workspaces/Walkie
    ./build_apk.sh /workspaces/Walkie

3. Explorer → `/workspaces/Walkie/android/app/build/outputs/apk/release/app-release.apk` → right-click → Download.
4. Copy to both phones, allow "install unknown apps", install.

(The release build is signed with RN's debug keystore – fine for sideloading.)
For 32-bit phones change `arm64-v8a` to `armeabi-v7a,arm64-v8a` in build_apk.sh.

## Using it
1. Open on both phones, grant Mic / Location / Nearby devices / Notifications. Turn Location ON (needed for Wi-Fi Direct discovery on Android <13).
2. On ONE phone tap the other in "Nearby devices". Accept the system invitation on the other phone (first time).
3. Hold the big button to talk. The partner is remembered; after that both phones auto-search and reconnect.

## Architecture
- Group owner opens a TCP server on :8988, client connects to the group owner IP (from connection info).
- Frames: [type u8][len u16][payload]; types AUDIO / PTT_START / PTT_END / PING.
- Audio: 16 kHz mono PCM16, ~64 ms chunks, half-duplex.
- Heartbeat every 3 s; 9 s silence → tear down group, rediscover, reconnect (random backoff avoids simultaneous connect()).
