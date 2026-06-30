# Feature Summary: chord-preview-keyboard
_Archived: 2026-06-30_
_Status: DONE_

## Goal

Add a button next to each chord row in the **Chords** screen (`lib/screens/chord_reference_screen.dart`, opened from Settings → REFERENCE) that opens the existing `PianoScreen` (`lib/screens/piano_screen.dart`) to visually preview that chord on the keyboard. The button is a *visual* preview action — distinct from the existing **▶︎** audio-preview button, which stays put. When opened from the chord list, the history strip on the right is hidden and the keyboard fills the width. The same `PianoScreen` is reused — no fork, no duplicate screen.

## What Was Built

- **`PianoScreen` grew two optional, defaulted constructor params.** `Chord? previewChord` and `bool showHistory = true`. The HomeScreen call site `const PianoScreen()` stays byte-unchanged. `build` computes `final displayed = previewChord ?? diceState.current?.chord;` — single binding that feeds both the AppBar title (`displayed?.nameFor(pref) ?? 'Piano'`) and the keyboard highlights (`displayed?.chordNotesWithOctave ?? const []`). Body branches on `showHistory`: `true` preserves the historical `Row` + 2× `Expanded` + `RotatedBox(VerticalHistoryStrip)` tree byte-for-byte; `false` returns the `VerticalPianoKeyboard` directly inside `SafeArea`. `onKeyTap: audio.playSingleNote` retained in both branches. `ref.watch(notationProvider)` retained so the title re-spells reactively on sharps/flats flip.

- **`_ChordRow` in `chord_reference_screen.dart` gained a 🎹 IconButton.** Appended after the existing ▶︎ button in the trailing `Row`, using `Icons.piano_outlined` with tooltip `"Preview on keyboard"`. `onPressed` builds `Chord(root: Note.c, type: chordType)` and calls `Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => PianoScreen(previewChord: preview, showHistory: false)))`. Both IconButtons sit inside the existing `Opacity(0.5)` wrapper (locked-state visual only; both remain tappable). No new `enabled` gate added. No audio calls from the new button — navigation only.

- **Two widget-test files.** `test/piano_screen_test.dart` is new (272 lines, 5 cases). `test/chord_reference_screen_test.dart` is extended with T6–T9 plus one bonus case (existing 5 tests byte-unchanged).

## Phases Completed

| Phase | Name | Key Outcome |
|-------|------|-------------|
| 1 | PianoScreen: accept `previewChord` + `showHistory` | Contract change. Constructor + fields + body branching landed; `test/piano_screen_test.dart` added with T1–T5 (fallback, rolled-mode, preview-mode, notation reactivity, orthogonality). HomeScreen call site byte-unchanged. Exit gates: analyze 0 / tests green / format clean. |
| 2 | ChordReferenceScreen: wire the 🎹 button | Consumer change. Appended `IconButton(Icons.piano_outlined, tooltip: "Preview on keyboard")` after ▶︎ in `_ChordRow`; wired `Navigator.push` to `PianoScreen(previewChord: Chord(root: Note.c, type: chordType), showHistory: false)`. Extended `test/chord_reference_screen_test.dart` with T6–T9 (button renders, tap pushes correctly-configured screen, silent contract, tappable while row is locked). Existing 5 tests byte-unchanged. Exit gates: analyze 0 / 327 tests green / format clean. |

## Edge Cases Handled

- **AppBar title length for long chord names** (e.g. `"C Augmented Major 7"`, `"C Dominant 13 ♯11"`) — default `Text` ellipsis suffices; no manual constraint added.
- **Notation preference during preview** — `ref.watch(notationProvider)` retained (not `ref.read`), so toggling sharps↔flats while the preview is open re-spells the AppBar title reactively. Guarded by T4.
- **Orthogonality of `previewChord` and `showHistory`** — both `previewChord != null + showHistory == true` and `previewChord == null + showHistory == false` are legal combinations. Brief §8 risks #3/#4 were not collapsed into a single "mode" enum. T5 guards the non-trivial cross-case.
- **Scroll position on back-nav** — Flutter's default `Navigator.push` + `ListView.builder` preserves it because the Chords screen stays mounted; no explicit work needed and no rebuild forced.
- **Tap target / two sibling IconButtons** — each `IconButton` has its own 48 dp hit-target and absorbs its own taps; no propagation to the ListTile `onTap` selection toggle. Verified by today's ▶︎ behavior and by T7/T8 passing.
- **Locked-row interaction** — locked (at min=3 or max=20 selection boundary) rows dim via the existing `Opacity(0.5)` wrapper, but both IconButtons remain tappable. Locked state gates the selection toggle only, not navigation. Guarded by T9 (plus the implementer's bonus "at maxCount boundary" test).

## Deviations From Original Plan

**None** of substance. Two minor additive notes:

- Phase 1 inlined the two branches inside `build` rather than extracting a `_buildBody` private method — this was explicitly flagged as non-prescriptive in the plan's Implementer Hints and the diff stays small either way.
- Phase 2 implementer added one bonus test (`at maxCount boundary, tapping an inactive chord no-ops`) beyond the T6–T9 spec — valid extra coverage, no conflicts with existing tests, accepted by the reviewer.

## Fixes Applied

**None.** No `/flow:implement fix` runs occurred; both phases passed review on the first pass.

## Out of Scope (Not Implemented)

- No new screen. `PianoScreen` reused via constructor params only — no fork, no parallel screen.
- No root-note picker. Root is hard-locked to `Note.c` (brief D4).
- No auto-play, no AppBar play button, no per-row audio-mode change.
- No changes to the existing ▶︎ audio-preview button or its arpeggio-toggle behavior.
- No changes to the Chords screen's selection toggle (leading Checkbox), counter pill, category headers, or locked-state `Opacity(0.5)` behavior.
- No new provider, no new model, no new constant. State for the previewed chord is route-local via constructor only.
- No new asset, icon font, or color literal. `Icons.piano_outlined` is already bundled.
- No changes to persistence (no new prefs keys), no changes to history, no changes to audio/MIDI output paths, no changes to the roll lifecycle or `DiceNotifier`.

## Review Findings

- Phase 1 review: **PASSED** — 0 must-fix / 0 should-fix. Behavioral checks all green (HomeScreen call site byte-unchanged, `showHistory == true` branch identical, `showHistory == false` drops history subtree, params orthogonal, notation reactive, I-5 holds, no hardcoded colors).
- Phase 2 review: **PASSED** — 0 must-fix / 0 should-fix. Existing 5 tests byte-unchanged, ▶︎ untouched, 🎹 `onPressed` contains zero `AudioService` calls, icon/tooltip/navigation match the spec, `Opacity(0.5)` wrapper unchanged.

## Final Check Outcome

**FEATURE VERIFIED.** Re-ran exit gates on the integrated working tree:

| Gate | Command | Result |
|------|---------|--------|
| `build_command` | `flutter pub get` | `Got dependencies!` |
| `lint_command` | `flutter analyze` | `No issues found! (ran in 15.5s)` |
| `test_command` | `flutter test` | `All tests passed!` — **327 tests** |
| `format_command` | `dart format lib test` | `Formatted 75 files (0 changed)` |

All acceptance criteria (A.1–A.4 row, B.1–B.5 screen, C.1–C.5 cross-cutting) verified end-to-end. All invariants preserved (I-5 audio-only-from-provider with scoped ▶︎ exception NOT extended; roll-lifecycle isolation; `Chord.chordNotesWithOctave` single source of truth; no hardcoded colors; `kCamelCase` constants / `_underscorePrefix` privates; `flutter_midi_pro` lazy init preserved). No regressions.

## Files Changed

| File | Nature | Note |
|------|--------|------|
| `lib/screens/piano_screen.dart` | modified | +93 / −36 (net +57). Constructor gains `previewChord` + `showHistory`; body branches on `showHistory`; `displayed` binding drives title + highlights. |
| `lib/screens/chord_reference_screen.dart` | modified | +16. `_ChordRow` trailing Row gains a 4th child — the 🎹 IconButton — with `Navigator.push` to preview mode. Import for `piano_screen.dart` added. |
| `test/piano_screen_test.dart` | new | +272. Widget tests T1–T5 covering fallback, rolled-mode, preview-mode, notation reactivity, and param orthogonality. |
| `test/chord_reference_screen_test.dart` | modified | +123. Existing 5 tests byte-unchanged; T6–T9 appended covering button presence, navigation push, silent contract, and tap-while-locked. One bonus maxCount-boundary case. |

Aggregate delta ≈ **+504 insertions / −36 deletions (net ~+468 lines)**.

## Notes

- `HomeScreen`'s `PianoScreen()` call site (`lib/screens/home_screen.dart`) is byte-unchanged — verified by `git diff lib/screens/home_screen.dart` returning empty. This is the critical reuse guarantee from brief §9.
- No `@riverpod` annotation changes, so **no codegen was needed** — `dart run build_runner build --delete-conflicting-outputs` was intentionally skipped.
- The brief, plan, and all phase artifacts lived under `.flow-spec/` during development; they are now consolidated in this summary and the feature-scoped artifacts have been deleted per `/flow:compact`. Only `.flow-spec/project.md` remains for the next feature.
- No follow-up work identified. The feature is complete and committed as `feat(chords): add keyboard-preview button to chord reference screen`.
