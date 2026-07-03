## Context

Honeydo is an Expo SDK 57 / RN 0.86 app (new architecture on). Today all features are pure JS
and run in Expo Go / Dev Client. The tracking loop lives in `apps/mobile` — a **single running
entry** is the source of truth, exposed through `useEntries` / `useRunningEntry` and mutated by
`useStartEntry` / `useStopEntry` / `useContinueEntry` (TanStack Query, optimistic; the server
owns the single-running invariant). Bundle id `com.blackflamy.honeydo`; the project already has
`expo-dev-client`, `expo-build-properties`, and a `prebuild` script, but no native app extension
and no App Group.

This change adds the first **native iOS extension**: an ActivityKit Live Activity. Per the
implementation plan it normally follows `home-widget` (which would stand up the App Group +
prebuild pipeline); built directly, this change establishes that infrastructure so `home-widget`
can reuse it. Requirements: FR-LIVE-01→05, TC-NATIVE-01/02/03, NFR-WIDGET-01.

## Goals / Non-Goals

**Goals:**

- Show the running timer (description + live elapsed) on the Lock Screen and in the Dynamic
  Island (compact / expanded / minimal) whenever a timer is running (FR-LIVE-01/02).
- Provide a **Stop** control that ends the running timer **without opening the app** on capable
  iOS, dispatching into the app's existing stop path — no timer logic in the extension
  (FR-LIVE-03, TC-NATIVE-03).
- Bind the activity lifecycle to the single running entry; keep app↔activity state consistent
  via ActivityKit updates + a shared App Group (FR-LIVE-04/05).
- Render elapsed with **system timer text**, no push, no polling (FR-LIVE-04, NFR-WIDGET-01).
- Establish a reproducible Expo prebuild / config-plugin path for the extension (TC-NATIVE-01).

**Non-Goals:**

- No continuous push-based updates (system timer text only).
- No timer/business logic in the extension (it only signals intent).
- No Android parity (BC-PLATFORM-01). No changes to `@honeydo/shared` or `@honeydo/api`.

## Decisions

### 1. Native target via a config plugin (prebuild), not a hand-managed Xcode project

Use **`@bacons/apple-targets`** (Expo config plugin) to declare a WidgetKit/ActivityKit
extension target that `expo prebuild` generates into the iOS project, plus the **App Group**
entitlement (`group.com.blackflamy.honeydo`) on both the app and the extension. iOS deployment
target raised to **16.2**.

- *Why:* keeps the native project reproducible from config (TC-NATIVE-01) instead of committing
  a hand-edited `.xcodeproj` that drifts from Expo.
- *Alternatives:* (a) fully manual Xcode target — not reproducible under `prebuild --clean`;
  (b) `expo-apple-targets` variants — `@bacons/apple-targets` is the maintained community path
  for ActivityKit/WidgetKit today. Revisit if Expo ships first-party target support.

### 2. Elapsed via SwiftUI system timer text; minimal ContentState

The Live Activity is defined by `HoneydoTimerAttributes` (ActivityAttributes):

- **Static attributes:** `entryId: String`.
- **Dynamic `ContentState`:** `title: String` (entry description/note), `startedAt: Date`,
  `isRunning: Bool`.

The SwiftUI views render elapsed with `Text(timerInterval: startedAt...Date.distantFuture,
countsDown: false)` so the OS advances the clock — **no push updates, no polling** (FR-LIVE-04,
NFR-WIDGET-01). We only push an ActivityKit update on discrete events (title edit, stop).

- *Why:* battery-friendly and matches home-widget's approach; the system already knows how to
  tick a timer label.

### 3. Stop = App Intent → App Group + Darwin notification → existing JS stop (no duplicate logic)

- iOS **17+**: the Stop button is a `LiveActivityIntent` (`AppIntent`) whose `perform()` runs
  **in-place** (no app launch). It writes a stop request `{ entryId, requestedAt }` into the
  shared App Group `UserDefaults`, posts a Darwin notification (`honeydo.timer.stopRequested`),
  and **ends the Activity immediately** (optimistic, so the UI feels instant).
- iOS **16.2–16.x** (no interactive Live Activity buttons): the Stop control uses
  `openAppWhenRun = true` (deep-links via the `honeydo` scheme) so the app opens and stops —
  graceful degrade, mirroring `home-widget`'s older-iOS deep-link (FR-WIDGET-02 pattern).
- The RN app hosts a small **Expo native module** (`HoneydoLiveActivity`) that (a) exposes
  `start/update/end` to JS and (b) observes the Darwin notification and emits a JS event. The
  app's listener calls the **existing `useStopEntry` mutation** — the server remains the single
  authority for stopping (TC-NATIVE-03). If the app was terminated when Stop was tapped, the
  activity is already ended locally; the app **reconciles on next foreground** by reading the
  pending stop request from the App Group and issuing the stop with the recorded `requestedAt`.

- *Why:* never embeds auth tokens or timer math in the extension; reuses one stop path.
- *Alternatives:* (a) extension calls the API directly with a stored token — rejected (secrets
  in the extension + duplicated auth/stop logic); (b) background push to end the activity —
  rejected (needs a push server and violates the no-push goal).

### 4. Lifecycle owned by the JS layer, driven off the single running entry

A `useLiveActivitySync` hook watches `useRunningEntry()`:

- running entry appears → `HoneydoLiveActivity.start({ entryId, title, startedAt })`;
- running entry changes title → `update(...)`;
- running entry clears → `end()`.

On app **foreground/launch** it reconciles: end any orphaned activity if nothing is running, or
(re)start one if a timer is running without an activity (FR-LIVE-05). Because the app already
enforces one running entry, there is at most one activity. The App Group also stores the current
`{ entryId, title, startedAt }` so the Stop intent can target the right entry.

## Risks / Trade-offs

- **Interactive Stop is really iOS 17+, not 16.2.** ActivityKit shows on 16.2, but in-Activity
  **buttons** need iOS 17. → Honor the doc's 16.2 minimum for *display*; on 16.2 the Stop
  **deep-links to open the app** and stop, matching the widget's degrade path. Document the
  effective interactive floor as iOS 17.
- **Stop while app is terminated can't run the JS mutation immediately.** → End the Activity
  optimistically in the intent and **reconcile on next foreground** using the persisted stop
  request; the server stop is applied then. Trade-off: the entry's `stoppedAt` reflects the
  reconcile, not the tap, unless we later pass `requestedAt` to a stop-at API. Acceptable for
  MVP; noted as an open question.
- **Not covered by the repo `gate`.** The extension only builds under `expo prebuild` + Xcode
  on a device/simulator (iOS 16.2+); CI keeps `lint`/`typecheck` over the JS bridge only
  (TC-NATIVE-01). → Provide a concrete manual smoke checklist in tasks.
- **Prebuild migration + Apple provisioning.** App Group needs an Apple Developer account and a
  Dev Client build; the feature can't run in Expo Go. → Ship behind the Dev Client; keep the
  config-plugin change isolated so `home-widget` reuses it.
- **New native dependency risk (`@bacons/apple-targets`, ActivityKit bridge).** → Pin versions;
  keep the bridge tiny (start/update/end + one event) so it's cheap to replace.

## Migration Plan

1. Add the config plugin + App Group + iOS 16.2 target to `app.json`; `npm run prebuild`.
2. Land the extension (Swift/SwiftUI + AppIntent) and the `HoneydoLiveActivity` native module.
3. Wire `useLiveActivitySync` + the stop-event listener into the app; build a Dev Client and
   verify on device.
- **Rollback:** remove the config plugin + native module and re-run `prebuild --clean`; the JS
  app returns to its current Expo-Go-compatible state (no data or API changes to revert).

## Open Questions

- Do we want a **stop-at timestamp** API so a Stop tapped while terminated records the exact tap
  time (vs. reconcile time)? (Small `@honeydo/api` addition; deferred.)
- Should the expanded Dynamic Island also offer **pause/continue**, or Stop-only for MVP?
  (Spec covers Stop; pause is a candidate follow-up.)
- Confirm the ActivityKit bridge: custom Expo module vs. a maintained community package.
