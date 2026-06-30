# Decision Log

## D1 — Lifecycle detection: `WidgetsBindingObserver` + `ModalRoute.of(context).isCurrent` via `didChangeDependencies`
**Alternatives considered:** `RouteAware` + `RouteObserver` registered in `MaterialApp` / `ChordDiceApp`.
**Chosen:** `WidgetsBindingObserver` for app foreground/background + checking `ModalRoute.of(context)?.isCurrent == true` to know whether Home is the top-of-stack.
**Why:** `RouteAware` requires threading a shared `RouteObserver` through `MaterialApp.navigatorObservers` and every consumer screen — a larger blast radius for one caller. `ModalRoute.of(context)?.isCurrent` returns `true` when Home is top-of-stack and `false` when Settings / Piano / Reference has been pushed on top, which is exactly the signal we need. Home's `State.deactivate()` also fires when a new route is pushed on top, giving a second natural teardown point.
**Signal sources we listen to:**
1. `WidgetsBindingObserver.didChangeAppLifecycleState(AppLifecycleState)` — re-evaluate subscription on `resumed` / `paused` / `inactive` / `hidden`.
2. `State.didChangeDependencies` — re-evaluate whenever route inheritance changes (e.g. a pushed screen pops).
3. `ref.listen(shakeProvider)` — rewire when `enabled` / `sensitivity` changes.
4. `ref.listen(themeProvider)` — ignored; no dependency on theme.
A single private method `_updateSubscription()` recomputes desired state from all signals and reconciles.

## D2 — One persistent `ShakeDetector` instance vs. recreate-on-change
**Chosen:** One persistent instance whose threshold is mutated via `updateThreshold()`. The stream subscription is started/stopped instead of torn down.
**Why:** Subscribing to `sensors_plus` allocates a platform channel; churning subscriptions on every sensitivity change is wasteful. A setter keeps the wiring simple.

## D3 — `sensors_plus` vs. `shake_detector` package
**Chosen:** `sensors_plus` + internal helper.
**Why:** `shake_detector` on pub.dev is a thin (and at the time of writing, stale) wrapper over `sensors_plus`. The internal helper is tiny, testable with fake streams, and lets us control the exact magnitude math and gating semantics the brief specifies. Matches the brief's recommendation.

## D4 — Haptic before `beginRoll` vs. inside `beginRoll`
**Chosen:** In `HomeScreen`, *after* the rolling-state gate and *immediately before* calling `beginRoll()`.
**Why:** The rolling-state gate is checked once in the shake handler. If the gate rejects, no haptic. If the gate accepts, haptic fires, then `beginRoll()` (which has its own internal gate — an extra no-op if state changed between the two checks, which would be a bug elsewhere).
**Why not in `DiceNotifier`:** Would couple audio/haptic policy for *button-initiated* rolls as well, changing behavior beyond this feature's scope. The ROLL button intentionally has no haptic today; adding one is out of scope.

## D5 — SegmentedButton ordering: Low / Medium / High left-to-right
**Chosen:** `Low | Medium | High` in UI reading order. The brief's note — "High label = easier to trigger (lower threshold)" — is surfaced as tile subtitle text: "Higher setting = easier to trigger". Users do not need to understand m/s² values.
**Why:** Users expect left-to-right increases. Since the internal mapping is counter-intuitive (higher UI label → lower threshold), the subtitle makes the mapping explicit.

## D6 — Section placement in Settings
**Chosen:** INTERACTION section sits **above** PLAYBACK (the existing ARPEGGIO card is titled "PLAYBACK" in the current code). Final order: DISPLAY → INTERACTION → PLAYBACK → REFERENCE → DATA.
**Why:** Input settings (how you control the app) before output settings (what you hear). Matches the brief's proposed placement.

## D7 — Error handling on `sensors_plus` stream
**Chosen:** Attach an `onError` handler to the `listen` call. Log via `debugPrint('ShakeDetector stream error: $e')` matching `AudioService`'s logging style. Do not rethrow, do not surface UI, do not disable the toggle.
**Why:** Matches the brief explicitly: iOS permission denial or missing accelerometer → stream errors are logged, detector stays silent, ROLL button unaffected. No user-visible error state.
