# Feature Summary: Stable Layout Zones (No Reflow on First Roll)
_Archived: 2026-06-30_
_Status: DONE_

## Goal
Eliminate the visible layout jump that occurs on the first dice roll. `ChordInfoCard` and `HistoryStrip` previously started at 0 height and expanded on the first roll, stealing vertical space from the `Expanded` `DiceStage` and causing the dice to shift/shrink mid-animation. All UI zones now have pre-reserved, fixed dimensions from app launch so the `DiceStage` size never changes. Additionally, `AudioService.init()` now fires in parallel with the first roll animation so the SF2 soundfont is loaded by the time `settleRoll()` plays the chord.

## What Was Built
**Layout stability:** Fixed-height `SizedBox` wrappers around `ChordInfoCard` (130 lp via `kChordInfoCardHeight`) and `HistoryStrip` (48 px, always rendered). The `DiceStage` `Expanded` widget now has constant sibling heights from the first frame, so it never resizes.

**Audio pre-loading:** `AudioService.init()` refactored with a `Completer<void>` for concurrent safety. `DiceNotifier.beginRoll()` fires `unawaited(_audio.init())` in parallel with the dice animation, so `playChord()` at settle time awaits the already-completed (or nearly-completed) init rather than starting a cold load.

## Phases Completed
| Phase | Name | Key Outcome |
|-------|------|-------------|
| 1     | Fixed Layout Zones | `kChordInfoCardHeight` constant added; `ChordInfoCard` wrapped in fixed-height `SizedBox` in `home_screen.dart`; `HistoryStrip` early-return `SizedBox.shrink()` removed — always renders 48 px shell |
| 2     | Audio Pre-loading | `Completer<void>? _initCompleter` added to `AudioService`; `init()` deduplicates concurrent callers and retries after failure; `beginRoll()` fires `unawaited(_audio.init())` |

## Edge Cases Handled
- **First roll, slow SF2 load:** `playChord` → `await init()` → awaits the Completer future. Chord plays late but never silently skips.
- **Double-tap / rapid rolls during first init:** `_playGeneration` counter cancels stale stagger loops. `_initCompleter` ensures only one load runs; concurrent `playChord` calls share the same future.
- **App backgrounded during first roll:** Watchdog fires idempotent `settleRoll()`. If init fails, `_initCompleter` resets to `null` so the next foreground roll retries.
- **ChordInfoCard height variance:** Fixed at 130.0 lp, estimated from widget tree. Accommodates longest chord names and wrapped note pills.
- **History strip with 0 items:** `SizedBox(height: 48)` always rendered. `ListView.separated` with `itemCount: 0` shows blank space — no border, no hint.

## Deviations From Original Plan
Phase 1: The plan's Step 1 called for measuring the Card height with DevTools at runtime. Since implementation was headless, the height was estimated from the widget tree (Card margin + padding + symbol row + pills + spacer + body-small ≈ 124 px, rounded to 130 px). May need on-device tuning.

Phase 2: None.

## Out of Scope (Not Implemented)
- Roll logic, dice animation, tumble physics
- Chord math, interval tables, `ChordType` metadata
- Theme system, `buildTheme()`, `AccentPalette`, `SettingsScreen`
- Piano keyboard button and bottom sheet
- Dice rendering (`dice_3d.dart`, `polyhedron.dart`, `dice_motion.dart`)
- No new UI elements or visual design changes

## Review Findings
Review status: PASSED. 0 must-fix, 0 should-fix, 2 suggestions:
1. Add an inline comment on the `init()` success path clarifying that `_initCompleter` intentionally stays non-null (cosmetic).
2. Verify `kChordInfoCardHeight = 130.0` on-device with long chord names; adjust if needed.

## Final Check Outcome
All 20 verification items passed (8 expected behaviors, 5 edge cases, 7 out-of-scope confirmations). No issues. No regressions. All 95 tests pass. `flutter analyze` reports zero issues.

## Files Changed
- `lib/constants.dart` — Added `kChordInfoCardHeight = 130.0` constant
- `lib/screens/home_screen.dart` — Wrapped `ChordInfoCard` in `SizedBox(height: kChordInfoCardHeight)`
- `lib/widgets/history_strip.dart` — Removed `if (history.isEmpty) return SizedBox.shrink()` early-return; 48 px shell always renders
- `lib/services/audio_service.dart` — Added `Completer<void>? _initCompleter`; refactored `init()` for concurrent safety with retry-after-failure
- `lib/providers/dice_provider.dart` — Added `unawaited(_audio.init())` in `beginRoll()`

## Notes
- `kChordInfoCardHeight` was estimated, not measured on-device. If the tallest card overflows or leaves excessive blank space, this constant should be tuned.
- `chord_info_card.dart` was listed in the plan's affected files but required no changes — the outer `SizedBox` in `home_screen.dart` handles the space reservation.
