# Capability: live-activity / Dynamic Island (iOS)

- **Order:** 09 · **Phase:** 6 · **OpenSpec change:** `add-live-activity` · **Status:** in progress (source scaffolded; pending prebuild + on-device verification)
- **Depends on:** time-entries · **Blocks:** — (pairs with home-widget via shared App Group)
- **Packages:** `apps/mobile` (native extension)

## Summary

A Live Activity that shows the running timer on the Lock Screen and in the Dynamic Island with a
Stop control — tracking stays visible and controllable without opening the app.

## Requirements

| ID | Description |
|----|-------------|
| FR-LIVE-01 | While a timer runs, a Live Activity shows description + live elapsed on the Lock Screen |
| FR-LIVE-02 | Dynamic Island: **compact** (elapsed), **expanded** (description + elapsed + Stop), **minimal** |
| FR-LIVE-03 | A **Stop** control stops the timer via an App Intent without opening the app |
| FR-LIVE-04 | Activity starts when a timer starts, ends when it stops; elapsed via system timer text (no continuous push) |
| FR-LIVE-05 | Activity state kept consistent with the app via ActivityKit updates + shared App Group |
| TC-NATIVE-01 | Native extension via Expo config plugins / prebuild; not in Expo Go |
| TC-NATIVE-02 | ActivityKit (Live Activities); shared App Group; iOS 16.2+ for interactive controls |
| TC-NATIVE-03 | Dispatches App Intents into the app's start/stop logic — **no duplicate timer logic** |
| NFR-WIDGET-01 | Elapsed via system timer text, not polling — no measurable battery drain |

## Scope

- ActivityKit Live Activity extension (prebuild/config plugin), reusing the App Group from
  `home-widget`.
- Lock Screen + Dynamic Island presentations (compact/expanded/minimal) with a Stop App Intent.
- Start/end lifecycle tied to the single running entry; ActivityKit state updates.

## Non-goals

No continuous push updates (use system timer text, FR-LIVE-04). No timer logic in the extension.
No Android parity.

## Risks / notes

Depends on the prebuild pipeline from `home-widget`. Min iOS 16.2 for interactive Live Activity
controls (TC-NATIVE-02).
