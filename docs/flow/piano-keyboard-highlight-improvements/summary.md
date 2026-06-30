# Feature Summary: Piano Keyboard Highlight Improvements
_Archived: 2026-06-30_
_Status: DONE_

## Goal
Replace the hardcoded gold highlight on the piano keyboard with theme-aware, octave-aware highlighting. The root note of the rolled chord gets `colorScheme.primary`; other chord tones get `colorScheme.secondary`. Each note lights up exactly once at its correct octave (not on every octave as before). The keyboard range was also extended rightward from C3–B4 (14 white keys) to C3–F5 (18 white keys) to accommodate the widest chords (`min11` rooted on B reaches E5).

## What Was Built

### `lib/widgets/piano_keyboard.dart`
- `_whiteKeys` extended from 14 (C3–B4) to 18 (C3–F5) entries: added `('C',5)`, `('D',5)`, `('E',5)`, `('F',5)`.
- `_blackKeyOffsets` loop replaced with flat `_allBlackKeys` list: 5 keys × oct 3, 5 × oct 4, plus C#5 and D#5 for the partial fifth octave — 12 black keys total. F#5 excluded (falls past F5).
- `keyWidth` divisor changed from `/ 14` to `/ 18`.
- `PianoKeyboard.highlightedNotes` type changed from `List<String>` to `List<(String note, int octave)>`.
- `highlightColor(noteName, octave)` local function added in `build`: index 0 → `colorScheme.primary`, any other index → `colorScheme.secondary`, no match → `null`.
- `_WhiteKey.highlighted: bool` → `highlightColor: Color?`. Fill: `highlightColor ?? Colors.white`; glow: `highlightColor!.withValues(alpha: 0.6)`; label visible when non-null.
- `_BlackKey.highlighted: bool` → `highlightColor: Color?`. Fill: `highlightColor ?? const Color(0xFF1A1A1A)`; glow: `highlightColor!.withValues(alpha: 0.8)`.
- `import '../theme.dart'` removed — `kGold` no longer referenced in this file.
- Class docstring and inline comment corrected to say "12 black keys" (post-fix).

### `lib/screens/home_screen.dart`
- `_showPianoKeyboard`: `chord?.chordNotes ?? const []` → `chord?.chordNotesWithOctave ?? const []`.

### `lib/theme.dart`
- No change. `kGold` retained — still used by `chord_info_card.dart` and `settings_screen.dart`.

## Phases Completed
| Phase | Name | Key Outcome |
|-------|------|-------------|
| 1 | Extend keyboard range (C3–F5) | 18 white keys, 12 black keys, keyWidth ÷ 18; highlight API unchanged |
| 2 | Octave-aware + themed highlighting | `highlightedNotes` type updated; `_WhiteKey`/`_BlackKey` use `Color?`; `home_screen` wired to `chordNotesWithOctave` |
| fix | Docstring correction | "13 black keys" → "12 black keys" in class docstring and inline comment |

## Edge Cases Handled
| Edge Case | Resolution |
|-----------|------------|
| No chord (idle state) | `chordNotesWithOctave` is null → `const []` → no keys highlighted |
| Root-only distinguishable | `power5: [0,7]` → index 0 = primary, index 1 = secondary |
| Notes beyond F5 | Not in `_whiteKeys`/`_allBlackKeys` → no match, no crash |
| Single-note tap (`onKeyTap`) | Unchanged — passes `(noteName, octave)` to `AudioService.playSingleNote` |
| Dark/light mode | Both `primary` and `secondary` are seed-derived via `ColorScheme.fromSeed`; glow alphas (0.6/0.8) match original `kGold` tuning |

## Deviations From Original Plan
- `highlightColor` was implemented as a local function inside `PianoKeyboard.build` (before the `LayoutBuilder`) rather than a named `_highlightColor` private method. This keeps `colorScheme` in scope without threading it as a parameter, and avoids adding a private instance method to a `StatelessWidget`. The plan described it as a helper "in `PianoKeyboard.build`", which this satisfies.

## Out of Scope (Not Implemented)
- No changes to the `Chord` model or `chordNotesWithOctave` logic.
- No animation on highlight color transitions.
- No changes to keyboard vertical height or key proportions.
- No octave labels (C3, C4, C5) on the keyboard.
- No changes to `onKeyTap` / audio playback behavior.
- `kGold` not removed from `theme.dart` — still used by `chord_info_card.dart` and `settings_screen.dart`.

## Review Findings
No review runs. Final check caught one docstring inaccuracy (see below).

## Final Check Outcome
All 21 verified items passed. One issue found and fixed:
- Class docstring and inline comment both claimed "13 black keys" but `_allBlackKeys` contains 12 (F#5 excluded per plan). Two comment strings corrected via `/flow:implement fix`.

No regressions. `flutter analyze` clean, all 95 tests passing.

## Files Changed
| File | Change |
|------|--------|
| `lib/widgets/piano_keyboard.dart` | Extended keyboard range, new `highlightedNotes` type, theme-colored `_WhiteKey`/`_BlackKey`, removed `kGold` import, corrected black-key count in docs |
| `lib/screens/home_screen.dart` | Pass `chordNotesWithOctave` instead of `chordNotes` to `PianoKeyboard` |

## Notes
- `chordNotesWithOctave` index 0 is always the root because all `_intervals` arrays in `chord_type.dart` start with `0`. This invariant is what makes the `i == 0 → primary` rule safe — no additional sorting or root-detection logic is needed.
- The brief mentioned "12–13 depending on cutoff". The plan chose 12 (F#5 excluded). Both were valid; the implementation is consistent with the plan's choice.
- If a future chord type is added with intervals that place notes above F5, those notes simply won't appear on the keyboard — no crash, no highlight. Extending the range further (to G5 or beyond) would be a separate feature.
