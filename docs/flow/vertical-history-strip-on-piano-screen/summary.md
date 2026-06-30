# Feature Summary: Vertical History Strip on Piano Screen
_Archived: 2026-06-30_
_Status: DONE_

## Goal
Add a vertical chord history strip to the piano screen, filling the existing 20% right-side gap that was previously empty space. This gives users quick access to their roll history while viewing/playing the keyboard, without navigating back to the home screen.

## What Was Built

### `lib/widgets/vertical_history_strip.dart` (new file)
A new `VerticalHistoryStrip` StatefulWidget. Internally it is a **horizontal** `ListView.separated` wrapped in `RotatedBox(quarterTurns: 1)` by its parent, so the strip appears vertical on screen. Because `RotatedBox` transforms pointer events, vertical user swipes are converted to horizontal drags for the ListView — no extra gesture wiring needed.

Key details:
- Parameters: `history: List<DiceResult>`, `onTap: void Function(DiceResult)`, `activeResult: DiceResult?` — identical contract to the existing horizontal `HistoryStrip`
- `_VerticalHistoryStripState` owns a `ScrollController`; `didUpdateWidget` auto-scrolls to position 0 (newest chip) on any new roll — both below max capacity (list grows) and at max capacity (list length stays at 20 but `history.first` changes)
- `_VerticalHistoryChip` renders `chord.shortName` at fontSize 22, with `primaryContainer`/`primary` active highlight and `surface`/`outlineVariant` inactive style; uses `flutter_animate` `.fadeIn().slideX(begin: -0.2)` staggered entrance (40 ms per index)
- Chip padding: horizontal 12, vertical 8; ListView padding: horizontal 6, vertical 18; separator: `SizedBox(width: 6)`
- `dispose()` properly disposes `_scrollController`

### `lib/widgets/vertical_piano_keyboard.dart` (modified)
Removed the internal 80% width cap. `effectiveWidth` was changed from `totalWidth * 0.8` to `totalWidth`. The `rightGap` variable was removed; black keys switched from `right: rightGap` to `right: 0`. The parent (`PianoScreen`) now owns the 80/20 split.

### `lib/screens/piano_screen.dart` (modified)
- Replaced `ref.watch(diceProvider.select(...))` (single chord) with a full `ref.watch(diceProvider)` to expose `current`, `history`, and `currentResult`
- Body replaced with a `Row`: `Expanded(flex: 4)` for `VerticalPianoKeyboard`, `Expanded(flex: 1)` for `RotatedBox(quarterTurns: 1, child: VerticalHistoryStrip(...))`
- `VerticalHistoryStrip.onTap` wired to `ref.read(diceProvider.notifier).replayFromHistory(result)`

## Phases Completed
| Phase | Name | Key Outcome |
|-------|------|-------------|
| 1 | Create `VerticalHistoryStrip` widget | Self-contained widget with scroll controller, active highlight, staggered entrance animation |
| 2 | Modify `VerticalPianoKeyboard` to use 100% parent width | Keyboard fills its allocated box; parent controls 80/20 split |
| 3 | Wire everything in `PianoScreen` | Row layout, full `diceProvider` watch, `replayFromHistory` tap handler |
| Fix 1 | Auto-scroll at max capacity | Added `newRollAtCap` guard: also scrolls when `history.first` changes without length growing |
| Fix 2 | Rotate whole strip like key labels | Converted ListView to horizontal + wrapped in `RotatedBox(quarterTurns: 1)` in `PianoScreen`; updated entrance animation to `slideX` |
| Fix 3 | Top/bottom padding and larger font | `padding.horizontal` 6→12; `fontSize` 11→22 |

## Edge Cases Handled
| Edge Case | Resolution |
|---|---|
| Empty history (before first roll) | `itemCount: 0` → empty ListView, keyboard still occupies 80% |
| Single history entry | One chip, highlighted as active |
| History at max capacity (20 entries) | Auto-scroll fires via `newRollAtCap` guard (`history.first != oldWidget.history.first`) |
| Roll while on piano screen | `ref.watch(diceProvider)` triggers full rebuild; new chip at top, keyboard highlights update |
| Portrait-only | App is orientation-locked; no landscape handling needed |

## Deviations From Original Plan
- The original plan specified a plain vertical `ListView`. After Phase 3, the strip was refactored to a horizontal `ListView` wrapped in `RotatedBox(quarterTurns: 1)` to match the visual rotation of the piano key labels. This changes the internal scroll axis but preserves the public widget API and visual result.
- Chip font size started at 11 px (Phase 1) and was later doubled to 22 px (Fix 3) for readability.
- ListView `padding.vertical: 18` was manually tuned after Fix 3 (external edit by user) to add inset from the strip's top/bottom edges.

## Out of Scope (Not Implemented)
- Changes to the home screen's horizontal `HistoryStrip`
- Changes to the 80/20 visual ratio
- New state management or providers
- Rewriting `HistoryStrip` internals

## Review Findings
No formal review runs (`/flow:review` not invoked). Issues were found and fixed via `/flow:final-check` → `/flow:implement fix "..."` iterations.

## Final Check Outcome
All 6 expected behaviors verified. All 5 edge cases verified. All 4 out-of-scope items confirmed not implemented. No regressions. `flutter analyze`: 0 issues. `flutter test`: 137/137 passed.

## Files Changed
| File | Change |
|------|--------|
| `lib/widgets/vertical_history_strip.dart` | Created — new `VerticalHistoryStrip` widget (horizontal ListView + RotatedBox pattern) |
| `lib/widgets/vertical_piano_keyboard.dart` | Modified — removed internal 80% width cap; parent now controls split |
| `lib/screens/piano_screen.dart` | Modified — Row layout, RotatedBox wrapping strip, full diceProvider watch |

## Notes
- The `RotatedBox` + horizontal `ListView` pattern is a useful Flutter idiom: it gives a visually-vertical scrolling strip whose gesture handling works correctly without any custom recognizers, because `RotatedBox` transforms pointer events in addition to paint and layout.
- The auto-scroll max-capacity fix (`newRollAtCap`) should be considered for backport to the home screen's `HistoryStrip` if it ever reaches 20 entries in practice (same code pattern, same bug).
