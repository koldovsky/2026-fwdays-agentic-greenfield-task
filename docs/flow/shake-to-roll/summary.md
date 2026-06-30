# Feature Summary: Shake to Roll
_Archived: 2026-06-30_
_Status: DONE_

## Goal
Let users roll the dice by shaking the phone, as a hands-free alternative to the on-screen ROLL button. A persisted setting (default **enabled**) lets users disable the behavior entirely; a second persisted setting exposes **three sensitivity levels** (Low / Medium / High) so the gesture can be tuned to the user. Every shake that triggers a roll emits a short haptic tick. The feature is strictly additive — it does not change the existing ROLL-button path, music-theory logic, or audio pipeline.

## What Was Built

**New types and services**
- `ShakeSensitivity` enum (`low`, `medium`, `high`) with `ShakeSensitivityX` extension exposing `thresholdMps2` / `displayName` / `subtitle`. Backed by three top-level const lookup tables (`_thresholds`, `_displayNames`, `_subtitles`) with bang-operator exhaustiveness — same idiom as `ChordType`.
- `ShakeSettings` immutable value object (`bool enabled = true`, `ShakeSensitivity sensitivity = medium`) with manual `==` / `hashCode` via `Object.hash` and `copyWith`. Mirrors `ArpeggioSettings`.
- `ShakeDetector` pure-Dart service consuming `Stream<AccelerometerEvent>` from `sensors_plus`. Constructor: `({required Stream stream, required double thresholdMps2, required VoidCallback onShake, bool Function()? shouldIgnoreEvent, Duration minIntervalBetweenShakes = kShakeMinIntervalBetweenEvents, DateTime Function()? clock})`. Magnitude math: `(sqrt(x²+y²+z²) - 9.81).abs()`. Idempotent `start()` / `stop()`, `updateThreshold(double)`. Stream errors caught via `onError`.
- `ShakeNotifier` Riverpod-3 codegen notifier (`@Riverpod(keepAlive: true) class`). `build()` returns `const ShakeSettings()` synchronously and fires `Future.microtask(_load)` for hydration. Setters: `setEnabled(bool)`, `setSensitivity(ShakeSensitivity)`. Persists via `SharedPreferencesAsync` under keys `shake_enabled` (bool) and `shake_sensitivity` (string, enum `.name`). Missing-key default → `true` / `medium`. Generated `.g.dart` via `build_runner`.

**Wiring**
- `HomeScreen` converted from `ConsumerWidget` to `ConsumerStatefulWidget` with `_HomeScreenState extends ConsumerState<HomeScreen> with WidgetsBindingObserver`. Constructs `ShakeDetector` in `initState`, gates listening on `enabled && foreground && top && mounted` via `_updateSubscription()`, listens to `shakeProvider` in `build` to update threshold + reconcile subscription on settings changes. `_onShake` re-checks `RollState.rolling`, fires `HapticFeedback.mediumImpact()`, then `DiceNotifier.beginRoll()`. Static helpers (`_noteLabels`, `_chordLabels`, `_showExportPicker`) deliberately remain on the `HomeScreen` widget class for cross-rebuild identity.
- `SettingsScreen` gains an INTERACTION `SettingsCard` (between DISPLAY and PLAYBACK) with a "Shake to roll" `SwitchListTile` and a `SegmentedButton<ShakeSensitivity>` for sensitivity. Disabled state uses `AnimatedOpacity` (200 ms / 0.38) + `AbsorbPointer`, mirroring the PLAYBACK card's pattern selector.

**Constants & permissions**
- `lib/constants.dart` adds `kShakeThresholdLow = 25.0`, `kShakeThresholdMedium = 18.0`, `kShakeThresholdHigh = 12.0` (m/s²) and `kShakeMinIntervalBetweenEvents = Duration(milliseconds: 500)`.
- `ios/Runner/Info.plist` adds `NSMotionUsageDescription` ("Chord Dice uses motion sensors to detect a shake gesture that rolls the dice.").
- `pubspec.yaml` adds `sensors_plus: ^6.0.0` (resolved to 6.1.2). No Android manifest changes required.

**Tests** — 39 new cases
- `test/shake_settings_test.dart` (15 cases): defaults, equality on each field, hashCode, copyWith for each field, copyWith no-args identity, identical-instance equality.
- `test/shake_detector_test.dart` (10 cases): trigger, sub-threshold no-trigger, sensitivity switch via `updateThreshold` (×2 framings), `shouldIgnoreEvent` gate, debounce, stream error, start/stop idempotence, post-stop silence. Uses `StreamController(sync: true)` so listener invocations are inline (no `fake_async` needed for the simple cases).
- `test/shake_provider_test.dart` (14 cases): default state, setEnabled, setSensitivity, hydration round-trip, unknown-sensitivity fallback, missing-key fallback, plus 6 co-located `ShakeSettings` cases.

## Phases Completed

| Phase | Name | Key Outcome |
|-------|------|-------------|
| 1 | Dependency + constants + iOS permission | `sensors_plus` declared; four threshold/timing constants in `lib/constants.dart`; `NSMotionUsageDescription` added |
| 2 | Models + tests | `ShakeSensitivity`, `ShakeSettings` shipped with 15-case test suite |
| 3 | `ShakeDetector` service + tests | Pure-Dart detector with magnitude math + debounce + gate predicate; 10-case test suite |
| 4 | `ShakeNotifier` provider + codegen + tests | Riverpod-3 codegen notifier with `SharedPreferencesAsync` persistence; 14-case test suite |
| 5 | `HomeScreen` lifecycle + shake wiring | `ConsumerStatefulWidget` + `WidgetsBindingObserver`; subscription only when enabled + foreground + top |
| 6 | Settings UI — INTERACTION section | New `SettingsCard` between DISPLAY and PLAYBACK with toggle + sensitivity selector |
| 7 | Design spec + final verification | Spec authored; full gate matrix re-run green |

## Edge Cases Handled

| Edge case | Resolution |
|-----------|------------|
| Shake during a roll in progress | Two-layer gate: `ShakeDetector.shouldIgnoreEvent` checks `RollState.rolling`; `_onShake` re-checks before firing. No `beginRoll` call, no haptic. |
| Extremely fast double-shake | Detector debounce (`kShakeMinIntervalBetweenEvents = 500 ms`) drops the second event; rolling-state gate covers the rest of the 1100 ms tumble. |
| Pre-hydration shake on cold start | `ShakeNotifier.build()` returns `const ShakeSettings(enabled: true, sensitivity: medium)` synchronously; saved values overwrite within one frame via `Future.microtask(_load)`. Defaults match fresh-install state, so no user-visible discrepancy. |
| Walking jostle | Medium default (~18 m/s² net) tuned to reject typical walking; Low (~25) for users whose stride defeats Medium. |
| iOS motion permission denied | `sensors_plus` emits stream error → caught by `onError` (`debugPrint`), detector silently inactive, ROLL button unaffected. No user-visible error UI. |
| Accelerometer unavailable | Same path as iOS denial. |
| Toggle/sensitivity changed mid-roll | In-flight `settleRoll` has its own watchdog; subscription teardown only affects future events. Roll completes normally. |
| Phone drop | Triggers a roll (acceptable side effect). Debounce + rolling-state gate ensure exactly one fire per drop event. |
| Gate-before-haptic ordering | `_onShake`: `mounted` check → `RollState.rolling` gate → `HapticFeedback.mediumImpact()` → `beginRoll()`. Haptic only fires when the roll will actually start. |
| Hot reload | `addObserver` / `removeObserver` paired in `initState` / `dispose`; `_sub` nulled in `stop()`; symmetric teardown/rebuild. |

## Deviations From Original Plan

- **Test infrastructure: `StreamController(sync: true)` instead of `fake_async` for synchronous cases.** The plan called for `fake_async` to control `DateTime.now()`-sensitive debounce assertions. The shipped detector accepts an injectable `clock` parameter, which lets tests advance time deterministically without `fake_async`. For event delivery, `StreamController(sync: true)` makes `add()` invoke listeners inline — no `await` needed. Combined, this kept the test code simpler and removed `fake_async` from the dependency surface for these tests.
- **`AccelerometerEvent` timestamp argument.** `sensors_plus` 6.x requires a non-null `DateTime` as the 4th constructor arg. Tests pass `DateTime.fromMicrosecondsSinceEpoch(0)` as an irrelevant sentinel — the detector doesn't read it.
- **Two `updateThreshold` test cases** (instead of one as in the plan). The "sensitivity switch via updateThreshold" test was originally written incorrectly (double-listen to a single-subscription stream); rewriting it to use `updateThreshold` on a live detector made it structurally similar to the test directly below. Both kept for coverage clarity.

## Fixes Applied

| # | Issue | Files | Verification |
|---|-------|-------|--------------|
| 1 | `AccelerometerEvent` 4th arg required `DateTime`, not `null` (sensors_plus 6.x) | `test/shake_detector_test.dart:13-19` | `flutter analyze` zero issues |
| 2 | `dart format` drift in `test/shake_settings_test.dart` | `test/shake_settings_test.dart` | `dart format --set-exit-if-changed` exit 0 |
| 3 | `StreamController()` async-by-default → `add()` did not invoke listeners synchronously, causing 7 tests to fail with "expected 1, got 0" | `test/shake_detector_test.dart` (8 ctors → `sync: true`, 1 `.broadcast()` → `.broadcast(sync: true)`) | Affected tests turned green |
| 4 | "Sensitivity switch via updateThreshold" test double-listened to a single-subscription stream → `Bad state: Stream has already been listened to.` | `test/shake_detector_test.dart:55-80` (test rewritten to use `updateThreshold` on a live detector) | Test green |
| 5 | Spec `summary.md` line 30 read "four lookup tables" but listed three | Doc-only |

## Out of Scope (Not Implemented)

- Shake detection on Piano / Settings / Reference screens (Home-only by user confirmation)
- User-tunable exact threshold values (no slider; only the three preset levels)
- Separate haptic toggle (haptic is bundled with the master switch)
- Shake mapped to actions other than roll (no shake-to-undo, etc.)
- Post-settle cooldown window (user asked to try without)
- Other accelerometer-based features (no tilt-to-rotate, etc.)
- Permissions UI on iOS denial (ROLL button still works; no banner/prompt)
- Changes to existing tests, models, services, or roll lifecycle
- Removal/replacement of the on-screen ROLL button
- Analytics / telemetry on shake usage

## Review Findings

Per-phase reviews ran via the `teams:flow` 4-agent pipeline.
- Phases 1, 2, 4, 5, 6 — passed first review.
- Phase 3 — three rounds of reviewer-prescribed fixes (the 5 entries in "Fixes Applied" above) before passing.
- Phase 7 — passed with one nit (spec wording fix) which was applied immediately.

No fundamental design issues raised. All review findings were either factual test-infrastructure bugs (resolved by `sync: true` and the `DateTime` sentinel) or doc accuracy (one numeric typo).

## Final Check Outcome

`flow-checker` (Opus) cross-feature audit verified all 10 brief promises delivered, all 10 edge cases handled, all project-policy invariants preserved. Full report in `check-result.md` (deleted on archive). Highlights:

- `dart format lib test --set-exit-if-changed`: 59 files, 0 changed
- `flutter analyze`: zero issues
- `flutter test`: 199/199 passed (was 160 before this feature — 39 new cases)
- `flutter test test/chord_test.dart`: 22/22 passed (sacred music-theory safety net unchanged)
- `git diff --stat test/`: empty (no existing test was modified)
- `DiceNotifier`, `AudioService`, `ChordType`, `Chord`, `lib/widgets/` all untouched
- `dice_provider.g.dart` shows in diff — benign source-hash bump from `build_runner` regenerating all `.g.dart` files; logic unchanged

## Files Changed

| File | Change | Note |
|------|--------|------|
| `pubspec.yaml` | modified | Add `sensors_plus: ^6.0.0` |
| `pubspec.lock` | modified | Resolves `sensors_plus 6.1.2` |
| `ios/Runner/Info.plist` | modified | Add `NSMotionUsageDescription` |
| `lib/constants.dart` | modified | Add four shake threshold/timing constants |
| `lib/models/shake_sensitivity.dart` | created | Enum + extension |
| `lib/models/shake_settings.dart` | created | Immutable value object |
| `lib/services/shake_detector.dart` | created | Pure-Dart detector |
| `lib/providers/shake_provider.dart` | created | Riverpod-3 codegen notifier |
| `lib/providers/shake_provider.g.dart` | created | `build_runner` output |
| `lib/providers/dice_provider.g.dart` | modified | Benign source-hash bump from full codegen rebuild — logic unchanged |
| `lib/screens/home_screen.dart` | modified | `ConsumerStatefulWidget` + `WidgetsBindingObserver` + shake wiring |
| `lib/screens/settings_screen.dart` | modified | New INTERACTION `SettingsCard` |
| `test/shake_settings_test.dart` | created | 15 cases |
| `test/shake_detector_test.dart` | created | 10 cases |
| `test/shake_provider_test.dart` | created | 14 cases |

## Notes

- The `flow-implementer` / `flow-reviewer` agent pipeline communicated via `SendMessage` rather than per-phase `phase-*-result.md` / `review-*-report.md` files, so the consolidated record above is built from the message stream instead. No artifact files exist in `.flow-spec/` for those rounds.
- Threshold values (Low 25, Medium 18, High 12 m/s²) are starting points and explicitly subject to on-device validation on at least one iOS + one Android device before shipping. Tune in `lib/constants.dart` if the gesture feel is off.
- `_playGeneration` cancellation in `AudioService` applies "for free" — when a shake mid-arpeggio triggers a new roll, the existing audio cancellation logic cancels the trail without any new code. Reusing existing mechanisms is the hallmark of "strictly additive".
- Two-layer rolling-state gate (`shouldIgnoreEvent` predicate inside the detector + `_onShake` re-check) is intentional defense-in-depth: if the detector closure ever stales (e.g. due to a future `ref.read` change), the inner gate still blocks.
- Future work candidates from the brief's Out of Scope list: post-settle cooldown if the gesture feels trigger-happy after settle; multi-screen shake (Piano/Settings/Reference); tunable threshold slider; separate haptic toggle; analytics on usage. None added this round.
