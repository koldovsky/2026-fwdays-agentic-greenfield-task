# Feature Summary: Fix SegmentedButton label wrapping on narrow-screen devices
_Archived: 2026-06-30_
_Status: DONE_

## Goal
On ~360 dp-wide Android phones, labels inside the two Material 3 `SegmentedButton` widgets in `SettingsScreen` wrap to two lines (e.g. `System` → `Syste` / `m`, `Medium` → `Medi` / `um`). The fix wraps each segment's `label: Text(...)` in `FittedBox(fit: BoxFit.scaleDown)` so narrow devices shrink the label in place instead of breaking it across lines, while wider devices render identically (scale-down is a no-op when the text fits naturally).

## What Was Built

### Narrow-screen-fit (this feature, 2026-06-30)
- Wrapped every `label: Text(...)` inside both `SegmentedButton`s of `lib/screens/settings_screen.dart` in `FittedBox(fit: BoxFit.scaleDown)` — four edit sites: three literal `Text` children in `SegmentedButton<ThemeMode>` (Dark / System / Light) plus one inside the `ShakeSensitivity.values.map(...)` callback of `SegmentedButton<ShakeSensitivity>` (covers Low / Medium / High).
- Preserved the `segments: const [...]` qualifier on the ThemeMode button — `FittedBox`, `BoxFit.scaleDown`, `Text`, and `Icon` are all `const`-compatible.

### Folded-in polish fixes (from 2026-06-30, see Notes for provenance)
- **fix-1 — shake-sensitivity icon parity.** Added `IconData get icon` to `ShakeSensitivityX` (backed by a new top-level `_icons` const lookup table using `Icons.signal_cellular_alt_1_bar` / `_2_bar` / `_alt` for low / medium / high). Plumbed `icon: Icon(s.icon)` through the `SegmentedButton<ShakeSensitivity>` `ButtonSegment` constructor so its per-segment shape matches the DISPLAY card's theme-mode selector.
- **fix-2 — shake-sensitivity width parity.** Changed both `Column`s in the INTERACTION card from `CrossAxisAlignment.start` to `CrossAxisAlignment.stretch`, so the sensitivity selector spans the full card width like the theme-mode selector.
- **fix-3 — "Shake to roll" home-screen hint.** Added a conditional `Row(Icon(Icons.vibration) + Text('Shake to roll'))` below the button row in `_HomeScreenState.build`, gated on `ref.watch(shakeProvider.select((s) => s.enabled))` so the affordance appears only when shake-to-roll is enabled and rebuilds only when that flag flips (not when sensitivity changes).

## Phases Completed

| Phase | Name | Key Outcome |
|-------|------|-------------|
| 1 | Apply `FittedBox(fit: BoxFit.scaleDown)` to both `SegmentedButton`s in `lib/screens/settings_screen.dart` | All four `label:` sites wrapped, `const` preserved on the ThemeMode button, single-file diff (+16 / −4), all three exit gates green (`dart format` idempotent, `flutter analyze` zero issues, `flutter test` 199/199). |

## Edge Cases Handled
- **Label text already fits at natural size (wider devices / tablet).** `BoxFit.scaleDown` is a no-op when the intrinsic `Text` size ≤ segment inner width; wide devices render identically to pre-fix.
- **Extreme narrow widths (< 320 dp, foldable cover displays).** Label shrinks further to stay on one line; a legibly-small single-line label is acceptable (strictly better than the current two-line wrap at ~60 dp).
- **Accessibility / system font scaling.** `FittedBox(fit: BoxFit.scaleDown)` respects the user's text scale as the *natural* size before scaling down — users with max font scale on narrow screens see labels shrink to fit rather than wrap. Same contract as wide screens today, preferable to wrapping/clipping.
- **Icon alongside label inside each `ButtonSegment`.** `FittedBox` wraps only the `Text` inside `label:`; `icon:` rendering, internal icon-to-label spacing, and the selected-segment container background are untouched.
- **Selected-segment highlight.** `SegmentedButton` paints its selection container behind the `label:` widget; whether the label is bare `Text` or `FittedBox → Text` makes no difference. Highlight renders as-is across all eight accent palettes.
- **`const` preservation on the ThemeMode `SegmentedButton`.** All added constructors (`FittedBox`, `Text`, `Icon`) and the referenced enum value (`BoxFit.scaleDown`) are `const`-compatible, so the enclosing `segments: const [...]` survives the edit.

## Deviations From Original Plan
None. Planner validator (`validation-report.md`) approved the plan on first pass, and the checker (`check-result.md`) confirmed the phase-1 implementation matches the plan's four edit sites and all exit-gate commitments exactly. No in-flight plan gaps surfaced.

## Fixes Applied

| # | Issue Addressed | Files Changed | Verification |
|---|-----------------|---------------|--------------|
| 1 | Shake-sensitivity `SegmentedButton` showed labels only while the theme-mode selector showed both icon and label; the two selectors looked inconsistent despite playing the same UX role. | `lib/models/shake_sensitivity.dart` (+ `IconData get icon` getter backed by `_icons` const table + `import 'package:flutter/material.dart'`); `lib/screens/settings_screen.dart` (added `icon: Icon(s.icon)` to the shake `ButtonSegment` inside the `.map` callback). | `dart format lib test` 0 changed · `flutter analyze` no issues (13.7 s) · `flutter test` 199/199 passed. |
| 2 | After fix-1, the shake-sensitivity selector still sized to content while the theme-mode selector filled the card width. Root cause: both `Column`s in the INTERACTION card used `CrossAxisAlignment.start`, so the inner `Padding` was content-sized. | `lib/screens/settings_screen.dart` (changed the outer INTERACTION `Column` and the inner sensitivity `Column` to `CrossAxisAlignment.stretch`). | `dart format lib test` 0 changed · `flutter analyze` no issues (13.3 s) · `flutter test` 199/199 passed. |
| 3 | When shake-to-roll is enabled, the Home screen gave no visual affordance that the gesture was active. | `lib/screens/home_screen.dart` (added `ref.watch(shakeProvider.select((s) => s.enabled))` and a conditional `Row(Icon(Icons.vibration) + Text('Shake to roll'))` below the button row; styled via `bodySmall` + `onSurfaceVariant` + `letterSpacing: 0.3`). | `dart format lib test` 0 changed · `flutter analyze` no issues (12.8 s) · `flutter test` 199/199 passed. |

## Out of Scope (Not Implemented)
- Shortening label strings (e.g. `Auto`, `Med`) — rejected; `System` is the standard MD3 theme-mode label and clarity matters.
- A global `SegmentedButton.styleFrom(textStyle: ...)` tweak in `lib/theme.dart` — would shrink text on all devices including tablets; larger blast radius than necessary.
- `MediaQuery`-based breakpoints (e.g. drop icons below 400 dp) — introduces a breakpoint and changes visual design language across screen sizes.
- Replacing `SegmentedButton` with `Wrap` + `ChoiceChip` — larger refactor that would change the single-select interaction pattern.
- Any other screen or widget (home screen bottom row except for fix-3's hint, piano screen, chord info card, history strips, chord reference).
- New unit or widget tests — the fix is a pure layout wrapper with no new behavior to assert; the existing 199-case suite is the regression net.
- Any `@riverpod` / provider / model / service changes (except fix-1's `ShakeSensitivityX.icon` extension getter, which is a pure additive extension, not a provider/model change).
- Any piano-screen `RotatedBox` rotation-direction change — rotation is a design choice per the brief, not the bug being reported.
- Any change to `assets/`, `android/`, `ios/`, `pubspec.yaml`, `analysis_options.yaml`, or `.flow-spec/project.md`.

## Review Findings
No `review-*-report.md` files were persisted in `.flow-spec/` this run — the flow-reviewer reported **PASSED** via inter-agent SendMessage without writing an artifact. Verbal verdict: all four `FittedBox(fit: BoxFit.scaleDown)` wraps correctly in place, `const` preserved on the ThemeMode button, diff scoped to `lib/screens/settings_screen.dart` only, `flutter analyze` zero issues, all 199 tests green, `dart format` 0 files changed.

## Final Check Outcome
**Verdict: PASSED.** Recorded in the (now-deleted) `check-result.md`:
- All four `FittedBox(fit: BoxFit.scaleDown)` sites verified at `lib/screens/settings_screen.dart:56-59` (Dark), `:64-67` (System), `:72-75` (Light), and `:198-201` (shake sensitivity via `.map`).
- `segments: const [...]` retained at `lib/screens/settings_screen.dart:52`.
- `git diff --stat HEAD` showed a single file changed (`lib/screens/settings_screen.dart`, +16 / −4) — matching the plan's "Affected Files" table exactly.
- Exit gates from `.flow-spec/project.md`: `dart format lib test` idempotent (0 changed), `flutter analyze` zero issues (14.7 s), `flutter test` 199/199 passed (including all 22 music-theory cases in `test/chord_test.dart` — the load-bearing safety net).
- Every out-of-scope rejection honored (no label shortening, no global theme tweak, no `MediaQuery` breakpoint, no `ChoiceChip` refactor, no piano-screen / `RotatedBox` change, no new tests).
- No `@riverpod` codegen impact: `git diff HEAD -- '*.g.dart'` empty, no `build_runner` run needed, `pubspec.yaml` / `analysis_options.yaml` untouched.

## Files Changed

| File | What changed |
|------|--------------|
| `lib/screens/settings_screen.dart` | Narrow-screen-fit: wrapped four `label: Text(...)` sites in `FittedBox(fit: BoxFit.scaleDown)` across both `SegmentedButton`s. Fix-1: added `icon: Icon(s.icon)` to the shake `ButtonSegment` constructor. Fix-2: switched both INTERACTION-card `Column`s to `CrossAxisAlignment.stretch`. |
| `lib/models/shake_sensitivity.dart` | Fix-1: added `IconData get icon` getter to `ShakeSensitivityX`, backed by a new top-level `_icons` const lookup table; added `import 'package:flutter/material.dart'` to pull in the `Icons` constants. |
| `lib/screens/home_screen.dart` | Fix-3: added a scoped `ref.watch(shakeProvider.select((s) => s.enabled))` and a conditional "Shake to roll" hint row (Icon + Text) below the button row, rendered only when shake-to-roll is enabled. |

## Notes
- **Flow-spec artifact drift.** The three `fix-*-result.md` files folded into this summary were dated **2026-06-30** and document polish work from the earlier shake-to-roll feature cycle. That feature was previously archived under `docs/flow/shake-to-roll/` but its summary did not capture these follow-up fixes, so the fix artifacts lingered in `.flow-spec/` until today's compact. Per user direction at compact time, their contents are preserved here; their actual code changes (icon getter, full-width INTERACTION card, home-screen hint) have been on `main` since 2026-06-30 and are unrelated to the narrow-screen-fit diff on `settings_screen.dart`.
- **No `phase-1-result.md` was persisted.** The flow-implementer reported phase-1 completion via inter-agent SendMessage with exit-gate output but did not write an artifact file. All verification information from that run is captured in the *Phases Completed* row, *Final Check Outcome* section, and the (now-deleted) `check-result.md` before this archive absorbed it.
- **Plan omitted `## Mental Model`, `## Decision Log`, `## Dependency Map`.** The validator (`validation-report.md`) explicitly noted these were unnecessary: (a) the architectural fix was pre-decided by the brief and no alternatives remained open; (b) there's no non-trivial conceptual model — `FittedBox(fit: BoxFit.scaleDown)` is a standard Flutter idiom; (c) the change touches exactly one module. No companion files (`mental-model.md` / `decision-log.md` / `dependency-map.md`) were produced by this compact run.
- **Open follow-up.** After this archive was conceived, the team lead applied the same `FittedBox(fit: BoxFit.scaleDown)` idiom to piano-screen text as a direct (non-flow-team) edit: wrapped the rotated labels in `lib/widgets/vertical_piano_keyboard.dart` (white- and black-key labels) and `Text(result.chord.shortName)` in `lib/widgets/history_chip.dart`. Exit gates re-ran green there too (199/199 tests). That work is **not** captured in this archive because it was not taken through the `/teams:flow` pipeline and has no `.flow-spec/` artifacts — it lives only as git diff on `lib/widgets/history_chip.dart` and `lib/widgets/vertical_piano_keyboard.dart` at archive time.
