# Feature Summary: Bottom Bar Redesign
_Archived: 2026-06-30_
_Status: DONE_

## Goal
Redesign the bottom section of `HomeScreen` so that the history strip moves from below the ROLL button to above it, and the piano keyboard toggle (a standalone `IconButton`) is removed as a separate element and replaced with a round button placed to the right of the ROLL button, forming a compact button row.

## What Was Built
**`lib/screens/home_screen.dart`**
- Moved `HistoryStrip` above the button row (was between ROLL button and piano `IconButton`).
- Removed the standalone `IconButton(Icons.piano)` and its trailing `SizedBox(height: 8)`.
- Replaced the standalone `RollButton` with a `Padding`-wrapped `Row` containing:
  - `Flexible(child: RollButton(...))` — same props/callback, `Flexible` allows shrink on narrow screens.
  - `SizedBox(width: 12)` gap.
  - 56×56 `FilledButton.tonal` with `CircleBorder` and `Icons.piano`, calling `_showPianoKeyboard(context)`.
- Adjusted spacers: `SizedBox(height: 16)` after `DiceStage` → `HistoryStrip` → `SizedBox(height: 12)` → button row → `SizedBox(height: 16)`.

## Phases Completed
| Phase | Name | Key Outcome |
|-------|------|-------------|
| 1 | Reorder layout and create button row | `home_screen.dart` bottom section reordered; history above button row; piano merged into `FilledButton.tonal` beside ROLL |

## Edge Cases Handled
- **Empty history:** `HistoryStrip` already handles an empty list (renders empty 48 px `ListView`) — no change needed, repositioning is transparent.
- **Piano button during roll:** Piano button has no `rolling` guard — it always opens the bottom sheet showing the last settled chord's keyboard, which is valid during a roll.
- **Button row overflow on narrow screens (iPhone SE, 320 lp):** `RollButton` is wrapped in `Flexible` so it can shrink below its `minimumSize: Size(200, 56)` preferred width rather than overflow. Without `Flexible`, 200 + 12 + 56 + 64 padding = 332 lp > 320 lp.

## Deviations From Original Plan
`RollButton` wrapped in `Flexible` rather than placed bare. This is explicitly called out as the correct narrow-screen fix in the plan's edge-case section — not a true deviation.

## Out of Scope (Not Implemented)
- No changes to `RollButton` widget internals.
- No changes to `HistoryStrip` widget internals.
- No changes to the piano bottom sheet content or behavior.
- No new constants or files.

## Review Findings
No reviews run.

## Final Check Outcome
All 16 verified items passed. No issues. No regressions. `flutter analyze` zero issues, all 95 tests passed.

## Files Changed
| File | Change |
|------|--------|
| `lib/screens/home_screen.dart` | Bottom section reordered: `HistoryStrip` moved above button row; piano `IconButton` replaced by `FilledButton.tonal` in a `Row` beside `RollButton` |

## Notes
None. Single-phase, layout-only change. No models, providers, or services were touched.
