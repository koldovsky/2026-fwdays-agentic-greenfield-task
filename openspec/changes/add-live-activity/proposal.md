## Why

Honeydo's core promise is "track without opening the app." A Live Activity puts the running
timer on the Lock Screen and in the Dynamic Island with a one-tap **Stop**, so an in-progress
session stays visible and controllable at a glance (FR-LIVE-01→05). This is the first native
iOS surface, so it also stands up the prebuild/config-plugin pipeline that `home-widget` will
reuse.

## What Changes

- **New capability `live-activity`.** While a timer runs, an ActivityKit Live Activity shows the
  entry's description + live elapsed on the Lock Screen, and Dynamic Island **compact** /
  **expanded** (with Stop) / **minimal** presentations (FR-LIVE-01/02).
- **Stop via App Intent.** An interactive **Stop** control ends the running timer through an App
  Intent — no app launch, and **no timer logic duplicated** in the extension; the intent
  dispatches into the app's existing start/stop path (FR-LIVE-03, TC-NATIVE-03).
- **Lifecycle tied to the single running entry.** The activity starts when a timer starts and
  ends when it stops; elapsed renders via **system timer text** (no continuous push, no polling),
  and app↔activity state stays consistent via ActivityKit updates over a shared **App Group**
  (FR-LIVE-04/05, NFR-WIDGET-01).
- **Native build pipeline.** Ships as an iOS **native extension** via Expo config plugins /
  prebuild (Dev Client, not Expo Go), targeting **iOS 16.2+** for interactive Live Activities
  (TC-NATIVE-01/02).
- **BREAKING (build/tooling only):** iOS builds now require prebuild + a Dev Client and an App
  Group entitlement; the app can no longer run this feature in Expo Go. No API or data-model
  change, and no runtime break for existing JS features.
- **Ordering note:** the plan sequences `home-widget` (08) before `live-activity` (09) to share
  the App Group + prebuild setup. Built directly, this change establishes that shared
  infrastructure itself; `home-widget` can then reuse it.

## Capabilities

### New Capabilities

- `live-activity`: A running-timer Live Activity on the iOS Lock Screen and Dynamic Island
  (compact/expanded/minimal) with an App-Intent Stop control, lifecycle bound to the single
  running entry, and battery-friendly system-timer elapsed — all via a native extension over a
  shared App Group.

### Modified Capabilities

<!-- None. No existing spec's requirements change; this is additive and reuses the existing
     time-entries start/stop logic without altering it. -->

## Impact

- **Packages:** `apps/mobile` only. New iOS extension target (Swift/SwiftUI + WidgetKit
  ActivityKit + AppIntents) plus a JS bridge module and lifecycle wiring in the start/stop hooks.
  No changes to `@honeydo/shared` or `@honeydo/api`.
- **Native config:** `app.json` gains an App Group entitlement and an `expo-apple-targets`
  (or equivalent) config plugin for the extension; `NSSupportsLiveActivities` in Info; iOS
  deployment target ≥ 16.2. Requires `expo prebuild` and a Dev Client build.
- **Dependencies:** add a config-plugin package for Apple targets (e.g. `@bacons/apple-targets`)
  and a thin ActivityKit bridge (custom native module or a maintained library); no new backend
  deps.
- **Tooling / CI:** the JS/TS gate (`lint`/`typecheck`) still covers the bridge and hooks, but
  the extension itself is only verified by a **prebuild + Xcode build on a device/simulator**
  (iOS 16.2+) — not by the repo `gate` and not in Expo Go (TC-NATIVE-01). Needs an Apple
  Developer account for App Group provisioning.
- **Deferred / non-goals:** no continuous push updates (system timer text only, FR-LIVE-04),
  no timer logic in the extension (TC-NATIVE-03), no Android parity (BC-PLATFORM-01).
