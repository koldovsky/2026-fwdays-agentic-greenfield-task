# Tasks — add-live-activity

Native iOS work: **not** covered by the repo `gate` and **not** runnable in Expo Go. The JS
bridge/hooks stay under `lint`/`typecheck`; the extension is verified by prebuild + an Xcode
build on a device/simulator (iOS 16.2+). Keep all timer/auth logic in the app — the extension
only signals intent (TC-NATIVE-03).

## 1. Native build pipeline (prebuild + App Group)

- [ ] 1.1 Add `@bacons/apple-targets` (or equivalent) to `apps/mobile` and register its config
  plugin in `app.json`.
- [ ] 1.2 Declare the **App Group** `group.com.blackflamy.honeydo` entitlement on the app in
  `app.json` and raise the iOS deployment target to **16.2** (via `expo-build-properties`).
- [ ] 1.3 Add `NSSupportsLiveActivities: true` to the iOS `infoPlist` in `app.json`.
- [ ] 1.4 Run `npm run prebuild` and confirm the iOS project + extension target scaffold
  generate cleanly (no committed hand-edited `.xcodeproj` drift).

## 2. ActivityKit extension (Swift/SwiftUI)

- [ ] 2.1 Define `HoneydoTimerAttributes` (ActivityAttributes): static `entryId`; `ContentState`
  = `title`, `startedAt`, `isRunning`.
- [ ] 2.2 Build the **Lock Screen** view: description + `Text(timerInterval:)` system-timer
  elapsed, tokens matching the Honeydo look (FR-LIVE-01, NFR-WIDGET-01).
- [ ] 2.3 Build the **Dynamic Island** compact (elapsed), expanded (description + elapsed + Stop),
  and minimal (indicator) presentations (FR-LIVE-02).
- [ ] 2.4 Add the target's App Group entitlement so it shares state with the app.

## 3. Stop App Intent (no duplicate logic)

- [ ] 3.1 Implement a `StopTimerIntent` (`LiveActivityIntent`): on iOS 17+ `perform()` writes
  `{ entryId, requestedAt }` to the App Group `UserDefaults`, posts Darwin notification
  `honeydo.timer.stopRequested`, and ends the Activity optimistically.
- [ ] 3.2 On iOS 16.2–16.x (no interactive controls), make Stop `openAppWhenRun` and deep-link
  via the `honeydo` scheme to stop in-app (graceful degrade, FR-LIVE-03).
- [ ] 3.3 Wire the Stop control into the Lock Screen + expanded Dynamic Island views.

## 4. RN bridge module (`HoneydoLiveActivity`)

- [ ] 4.1 Create an Expo native module exposing `start({ entryId, title, startedAt })`,
  `update({ title, isRunning })`, and `end()` over ActivityKit.
- [ ] 4.2 Observe `honeydo.timer.stopRequested` (Darwin notification) and emit a JS
  `onStopRequested` event carrying `{ entryId, requestedAt }`.
- [ ] 4.3 Persist/read the current `{ entryId, title, startedAt }` and any pending stop request
  in the shared App Group for reconcile.
- [ ] 4.4 Add TypeScript types for the module; ensure it no-ops on non-iOS / iOS < 16.2.

## 5. App lifecycle wiring (JS)

- [ ] 5.1 Add `useLiveActivitySync` that watches `useRunningEntry()` and calls
  `start`/`update`/`end` so the activity tracks the single running entry (FR-LIVE-04/05).
- [ ] 5.2 On the `onStopRequested` event, call the existing `useStopEntry` mutation (server owns
  the stop) — never a new stop path (TC-NATIVE-03).
- [ ] 5.3 On app foreground/launch, reconcile: end an orphaned activity, or (re)start one for a
  running timer with no activity; apply any pending App-Group stop request.
- [ ] 5.4 Mount the hook once near the app root (inside the authed/query providers).

## 6. Verify

- [ ] 6.1 `npm run lint -w @honeydo/mobile` and `npm run typecheck -w @honeydo/mobile` green
  (bridge + hooks).
- [ ] 6.2 Manual (Dev Client, iOS 16.2+ device/simulator): start a timer → activity shows on
  Lock Screen + Dynamic Island with advancing elapsed; edit description → updates; Stop (iOS 17+)
  ends without opening the app; Stop (16.2) deep-links and stops; kill app then Stop → reconciles
  on next foreground; verify no continuous network/battery activity.
- [ ] 6.3 Update `docs/current-state.md` (newest first) and set the capability status in
  `docs/capabilities/09-live-activity.md` to in-progress/done as appropriate.
