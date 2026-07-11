---
name: build-android-apk
description: Build a debug APK for the jarsplit Android app (android/), bootstrapping the Android SDK/Gradle toolchain on first use if it's missing. Use when the user wants to build, rebuild, or install the Android app, or asks for a new APK.
user-invocable: true
license: MIT
compatibility: macOS with Homebrew. Requires network access to download the Android SDK/Gradle the first time.
metadata:
  author: jarsplit
  version: "1.0"
---

Build a debug APK for `android/` (module `md.agentic.jarsplit`), a native Kotlin/Compose
app with **no CI and no committed build artifacts** — every build starts from source.

## 1. Check the toolchain

```bash
which java && java -version
echo "$ANDROID_HOME"
ls android/gradlew 2>/dev/null
```

If any are missing, bootstrap once (safe to skip whichever piece is already present):

```bash
brew install --cask android-commandlinetools   # provides sdkmanager, adb, etc.
brew install gradle                             # only needed to (re)generate the wrapper
```

`ANDROID_HOME` defaults to `/usr/local/share/android-commandlinetools` for this cask.

## 2. Install SDK packages (first time, or after a compileSdk bump)

Read `android/app/build.gradle.kts` for `compileSdk`/`targetSdk` (currently 35), then:

```bash
export ANDROID_HOME=/usr/local/share/android-commandlinetools
yes | sdkmanager --sdk_root="$ANDROID_HOME" --licenses
sdkmanager --sdk_root="$ANDROID_HOME" "platform-tools" "platforms;android-35" "build-tools;35.0.0"
```

Adjust the version numbers if `build.gradle.kts` has changed since this was written.

## 3. Regenerate the Gradle wrapper if `android/gradlew` is missing

Check `android/gradle/wrapper/gradle-wrapper.properties` for the pinned `distributionUrl`
version (currently Gradle 8.9), then from `android/`:

```bash
gradle wrapper --gradle-version 8.9
echo "sdk.dir=$ANDROID_HOME" > local.properties
```

This uses the Homebrew `gradle` from step 1 purely as a bootstrap tool — every subsequent
build in this project uses the repo's own `./gradlew`, not the Homebrew one.

## 4. Build

From `android/`:

```bash
./gradlew :app:testDebugUnitTest   # run first — cheaper than a full app build, and this
                                    # source has no CI, so tests may not have run recently
./gradlew :app:assembleDebug
```

Since there's no CI enforcing this compiles, treat any `compileDebugKotlin`/test failure as
a **real bug to fix**, not a fluke — read the error, fix the offending Kotlin source under
`app/src/main/java/md/agentic/jarsplit/`, and re-run until both succeed.

Output: `android/app/build/outputs/apk/debug/app-debug.apk` (auto-signed with the AGP debug
keystore — installable as-is, no extra signing step).

## 5. Getting the APK onto a device

Do not assume how the user wants to install it. Ask (or confirm if stated in the request):
- **USB + `adb install app-debug.apk`** — requires the phone to have USB debugging enabled
  and be connected/authorized (`adb devices`).
- **Serve over LAN** (see step 6) — no cable needed, works from any phone on the same Wi-Fi.
- **Manual transfer** — hand the user the file path and let them move it themselves via
  whatever method they prefer (cloud upload, email, etc.).

## 6. Serve the latest build over LAN

This binds a file server to the LAN, which is a distinct, more sensitive action than
building the APK — confirm with the user specifically before starting it, each time,
even if they picked "serve over LAN" as their general preference; don't treat a past
approval as standing consent for a future run. Stop the server as soon as the download
is confirmed.

```bash
cd android/app/build/outputs/apk/debug
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
python3 -m http.server 8080   # run in background
```

Then tell the user: open `http://$LAN_IP:8080/app-debug.apk` in the phone's browser
(same Wi-Fi network), download, then open the file and allow "install unknown apps" for
that source when prompted.

Verify the server responds before handing over the URL:

```bash
curl -sI http://localhost:8080/app-debug.apk | head -1   # expect "HTTP/1.0 200 OK"
```

Once the user confirms the download finished (or install completed), stop the server:

```bash
pkill -f "http.server 8080"
```

Never leave this server running longer than needed for the one download.

## After install

The app is a client to a backend token/plan flow — a fresh install needs the monobank
token entered in the in-app Settings screen before Generate does anything useful.
