# Feature Summary: History Strip — Active Chord Highlight
_Archived: 2026-06-30_
_Status: DONE_

## Goal
Visually distinguish the currently active chord chip in the history strip so the user always knows which chord is displayed in the info card and highlighted on the piano keyboard. Previously all chips shared an identical `surface`/`outlineVariant` style regardless of which chord was active.

## What Was Built

### `lib/widgets/history_strip.dart`
- Added `required DiceResult? activeResult` to `HistoryStrip`'s constructor.
- `itemBuilder` computes `isActive = result == activeResult` (identity match via `DiceResult.==` which includes `rolledAt`) and passes it to `_HistoryChip`.
- Added `required bool isActive` to `_HistoryChip`'s constructor; `build` branches on `isActive`:
  - **Active:** `primaryContainer` fill + `primary` border + `onPrimaryContainer` text.
  - **Inactive:** existing `surface` / `outlineVariant` / `onSurface` style (unchanged).
- Converted `HistoryStrip` from `StatelessWidget` to `StatefulWidget` to hold a `ScrollController`.
- `_scrollController` is passed to `ListView.separated` and disposed in `dispose()`.
- `didUpdateWidget` detects a new roll (`widget.history.length > oldWidget.history.length`) and, if `_scrollController.hasClients && _scrollController.offset > 0`, animates to offset 0 (`300 ms`, `Curves.easeOut`).

### `lib/screens/home_screen.dart`
- Added a dedicated `currentResult` selector (`diceProvider.select((s) => s.current)`) to avoid a second provider watch.
- Derived `currentChord = currentResult?.chord` from it (reducing one selector to zero).
- Passed `activeResult: currentResult` to `HistoryStrip`.

## Phases Completed
| Phase | Name | Key Outcome |
|-------|------|-------------|
| 1 | Highlight the active chip | `activeResult` prop wired end-to-end; active chip renders with `primaryContainer`/`primary` accent; inactive chips unchanged |
| 2 | Auto-scroll to index 0 on new roll | `HistoryStrip` converted to `StatefulWidget`; `ScrollController` + `didUpdateWidget` logic scrolls to 0 on new roll, skips on tap-replay |

## Edge Cases Handled
| Edge Case | Resolution |
|-----------|------------|
| **First roll** (empty → 1 chip) | Lone chip equals `current` → highlighted. No scroll (offset already 0). |
| **Same chord rolled twice** | `DiceResult.==` includes `rolledAt` — two chips with identical chord text are distinct objects; highlight matches the correct one. |
| **Roll while scrolled right** | `didUpdateWidget` fires on length increase + `offset > 0` → animates to 0. |
| **Mid-roll state** | `current` only changes in `settleRoll()`, not `beginRoll()`, so the previous chip stays highlighted during the animation — no flicker. |
| **History at max capacity (20)** | Oldest chip drops off; `current` is always the newest item at index 0 — no special handling needed. |
| **Tap-replay** | `replayFromHistory` does not change `history.length`, so the `didUpdateWidget` length check is false — no scroll. Highlight moves to tapped chip via `activeResult` change only. |

## Deviations From Original Plan
None. All phases implemented exactly as planned.

## Out of Scope (Not Implemented)
- Roll lifecycle, `DiceNotifier`, and `DiceState` — unchanged.
- Chip content, sizing, or entrance animation — unchanged.
- Swipe-to-delete or long-press actions on chips.
- Scroll-to-chip on tap-replay.

## Review Findings
**Status: PASSED** (0 must-fix, 0 should-fix)

Two suggestions (not acted on):
- `history_strip.dart:55–59` — 300 ms scroll duration could be extracted as a named `static const` rather than an inline magic number.
- `history_strip.dart:86` — 40 ms chip stagger multiplier (pre-existing, not a regression) could similarly be a named constant.

Neither is a correctness concern.

## Final Check Outcome
All 12 brief items verified against the code. No regressions found. Status: DONE.

## Files Changed
| File | Change |
|------|--------|
| `lib/widgets/history_strip.dart` | Added `activeResult` prop + `isActive` chip styling; converted to `StatefulWidget`; added `ScrollController` + `didUpdateWidget` auto-scroll |
| `lib/screens/home_screen.dart` | Added `currentResult` selector; derived `currentChord` from it; passed `activeResult` to `HistoryStrip` |

## Notes
None. Clean implementation with no gaps or follow-up work suggested.
