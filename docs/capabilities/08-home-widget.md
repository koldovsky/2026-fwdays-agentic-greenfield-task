# Capability: home-widget (iOS)

- **Order:** 08 · **Phase:** 6 · **OpenSpec change:** `add-home-widget` · **Status:** not started
- **Depends on:** time-entries · **Blocks:** — (pairs with live-activity via shared App Group)
- **Packages:** `apps/mobile` (native extension)

## Summary

A home-screen widget that shows tracking state and toggles the single running entry in one tap —
the product's core "track without opening the app" differentiator.

## Requirements

| ID | Description |
|----|-------------|
| FR-WIDGET-01 | Widget shows current state: running entry description + live elapsed, or "Not tracking" |
| FR-WIDGET-02 | One-tap **Start/Stop** via an App Intent (interactive widget, iOS 17+); older iOS deep-links into the app |
| FR-WIDGET-03 | Quick-start for up to 3 recent/most-used entries, starting that entry directly |
| FR-WIDGET-04 | Widget and app share state via an **App Group**; reflects changes within OS refresh budget |
| FR-WIDGET-05 | Tapping the widget body deep-links to the relevant app screen |
| TC-NATIVE-01 | Ships as a native extension via Expo config plugins / prebuild; not buildable in Expo Go |
| TC-NATIVE-02 | WidgetKit + AppIntents (interactive widgets); shared App Group; iOS 17 for interactive widgets |
| TC-NATIVE-03 | Extension dispatches App Intents into the app's start/stop logic — **no duplicate timer logic** |
| NFR-WIDGET-01 | Elapsed stays accurate via system timer text, not polling — no measurable battery drain |

## Scope

- Expo prebuild + config plugin for a WidgetKit extension (e.g. expo-apple-targets).
- App Group for shared state; App Intents that call into the existing start/stop logic.
- Widget UI: state view, Start/Stop toggle, up to 3 quick-start slots, deep links.

## Non-goals

No timer logic in the extension (TC-NATIVE-03). No Android parity (BC-PLATFORM-01).

## Risks / notes

First capability requiring the Dev Client + prebuild pipeline and an Apple Developer account —
plan that migration before starting. Build before `live-activity` (shares the App Group).
