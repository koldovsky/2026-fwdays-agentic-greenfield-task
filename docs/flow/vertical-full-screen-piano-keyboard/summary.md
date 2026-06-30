# Feature Summary: Vertical Full-Screen Piano Keyboard
_Archived: 2026-06-30_
_Status: DONE_

## Goal
Replace the current bottom-sheet piano keyboard with a full-screen page that renders a 3-octave keyboard vertically (keys run top-to-bottom, like a real piano turned on its side). This gives the user a much larger, more playable keyboard surface with chord-note highlighting.

## What Was Built

### `lib/widgets/vertical_piano_keyboard.dart` — created
New `VerticalPianoKeyboard` stateless widget replacing the old `PianoKeyboard`:
- 21 white keys (C3–B5), C3 at top, B5 at bottom; rendered as full-width horizontal bars in a `Stack`
- 15 black keys (5 per octave × 3 octaves) overlaid from the **right** edge, 60% of effective width, 60% of key height
- Effective width = 80% of total width — rightmost 20% is empty breathing room
- `keyHeight = constraints.maxHeight / 21` via `LayoutBuilder` — scales to any phone height, no scroll
- `highlightColor()`: index 0 → `colorScheme.primary` (root), others → `colorScheme.secondary` (chord tones); `BoxShadow` glow on highlighted keys
- Rotated note labels (`RotatedBox(quarterTurns: 1)`) on white keys (shown when highlighted) and all black keys (always visible, dimmed when unhighlighted)
- Tap handling via `GestureDetector` on every key fires `onKeyTap(noteName, octave)`

### `lib/screens/piano_screen.dart` — created
`PianoScreen` `ConsumerWidget` (no constructor params):
- Reads `ref.watch(diceProvider.select((s) => s.current?.chord))` — reactive to chord changes
- `AppBar` title: `chord?.name ?? 'Piano'`; default back button via `Navigator.push`
- Body: `SafeArea` wrapping `VerticalPianoKeyboard` expanded to fill all available space
- Key taps → `ref.read(audioServiceProvider).playSingleNote` (method tear-off)

### `lib/screens/home_screen.dart` — modified
- Piano button `onPressed`: `currentResult != null ? () => Navigator.push<void>(...PianoScreen) : null` — disabled before first roll, full-screen nav after
- `_showPianoKeyboard()` bottom-sheet method (48 lines) deleted entirely
- Removed imports for `piano_keyboard.dart` and `audio_service.dart` (both were only used by the deleted method)
- Added import for `piano_screen.dart`

### `lib/widgets/piano_keyboard.dart` — deleted
Old horizontal 2.5-octave keyboard widget fully removed. No references remain.

## Phases Completed
| Phase | Name | Key Outcome |
|-------|------|-------------|
| 1 | Create `VerticalPianoKeyboard` widget | New vertical keyboard widget with highlighting and tap callbacks |
| 2 | Create `PianoScreen` page | Full-screen `ConsumerWidget` using `VerticalPianoKeyboard` |
| 3 | Wire up `HomeScreen` and remove old keyboard | Navigation wired; bottom sheet + old widget deleted |

## Post-Final-Check Refinements
After the formal final-check (which passed DONE), the following iterative fixes were applied to `vertical_piano_keyboard.dart`:

1. **Note order reversed** (fix-result.md): C3 moved to top, B5 to bottom. `_vWhiteKeys` reversed; `_vBlackKeyOffsets` remapped to low-to-high; `_allVBlackKeys` slot bases updated.
2. **Black keys moved to right side**: `left: 0` → `right: 0` on black key `Positioned`; border radius and depth shadow direction flipped accordingly; white key label and border radius mirrored to left side.
3. **20% right-side gap**: `effectiveWidth = totalWidth * 0.8`; white keys use `width: effectiveWidth`; black keys use `right: rightGap, width: effectiveWidth * 0.6`.
4. **Rotated key labels**: White key note labels wrapped in `RotatedBox(quarterTurns: 1)` to align with horizontal-bar orientation.
5. **Black key labels added**: `_BlackKeyH` given `alignment: centerLeft` + `RotatedBox` label; always visible (`Colors.white54` when unhighlighted, `colorScheme.surface` when highlighted).

## Edge Cases Handled
| Edge Case | Resolution |
|-----------|-----------|
| No chord rolled → button disabled | `onPressed: currentResult != null ? ... : null` — `FilledButton.tonal` auto-renders as greyed when null |
| Chord changes between keyboard visits | `ref.watch(diceProvider.select(...))` in `PianoScreen` — reactive rebuild on re-open |
| Portrait orientation | No action needed — app already locked in `main()` |
| Screen size variance | `keyHeight = constraints.maxHeight / 21` — fills available height exactly on any phone |

## Deviations From Original Plan
- **Phase 3**: `audio_service.dart` import also removed (was only consumed inside the deleted `_showPianoKeyboard` — caught by `flutter analyze` as `unused_import`)
- **Post-plan**: Five iterative layout refinements applied after final-check (see *Post-Final-Check Refinements* above); these were user-driven visual adjustments, not plan gaps

## Out of Scope (Not Implemented)
- Dynamic range fitting to chord (explicitly dropped during interview)
- Zooming or scrolling
- Horizontal keyboard layout on the piano page
- Arpeggio playback from the keyboard page
- Any changes to audio, dice, or theme systems

## Review Findings
No formal `/flow:review` runs. Validation report (pre-implementation) passed on first iteration — no issues found; deletion of `PianoKeyboard` confirmed safe (no test references).

## Final Check Outcome
All 16 expected-behavior items verified, all 4 edge cases verified, all 5 out-of-scope items confirmed absent. Zero issues, zero regressions. `flutter analyze` clean, all 137 tests pass.

## Files Changed
| File | Change |
|------|--------|
| `lib/widgets/vertical_piano_keyboard.dart` | **Created** — new vertical keyboard widget |
| `lib/screens/piano_screen.dart` | **Created** — full-screen piano page |
| `lib/screens/home_screen.dart` | **Modified** — piano button wired to `PianoScreen`; bottom sheet + old imports removed |
| `lib/widgets/piano_keyboard.dart` | **Deleted** — replaced entirely by `VerticalPianoKeyboard` |

## Notes
- The fix-result.md only formally captures the first post-final-check fix (note order). Fixes 2–5 were applied conversationally without separate fix-result files — all were verified with `flutter analyze` + `flutter test` (137/137 pass) after each change.
- A linter pass after the black-key label fix bumped font sizes from 8–9 px to 16 px on both white and black key labels.
