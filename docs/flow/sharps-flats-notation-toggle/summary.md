# Feature Summary: Sharps / Flats Notation Toggle
_Archived: 2026-06-30_
_Status: DONE_

## Goal

Add a user-facing global toggle that switches all visible note-name spelling between **sharps** (`C#`, `D#`, `F#`, `G#`, `A#` — current behavior) and **flats** (`Db`, `Eb`, `Gb`, `Ab`, `Bb`). The preference lives in Settings, persists across app restarts, and re-renders every note name in the UI live when flipped. The toggle is purely a **display-layer** change — audio playback, MIDI export, persisted history, and `Note` enum identity remain unchanged. Broadens the app's audience from sharps-only (guitar / pop / jazz lead sheets) to learners taught in flats (classical / wind instruments / many European curricula).

## What Was Built

### Core infrastructure (new files)
- **`lib/models/notation_preference.dart`** — `NotationPreference { sharps, flats }` enum + `NotationPreferenceX` extension exposing `glyph` (♯/♭ Unicode) and `prefsValue` (string keys for persistence).
- **`lib/utils/note_format.dart`** — `formatNote(canonical, preference)` helper with a static 5-entry map (C#→Db, D#→Eb, F#→Gb, G#→Ab, A#→Bb); defensive: unknown/natural inputs returned unchanged. Includes a `NoteFormatX.displayFor` convenience extension on `Note`.
- **`lib/providers/notation_provider.dart`** (+ `.g.dart` codegen) — `@Riverpod(keepAlive: true) class NotationNotifier` with sync default `NotationPreference.sharps`, `Future.microtask(_load)` hydration, `ref.mounted` guard after the `await`, and `setPreference(p)` persisting via `sharedPreferencesProvider`. Structural mirror of `shake_provider.dart`.

### UI integration (existing files modified additively)
- **`lib/screens/settings_screen.dart`** — new NOTATION `SettingsCard` between DISPLAY and INTERACTION, containing a `SegmentedButton<NotationPreference>` with `FittedBox`-wrapped ♯ / ♭ glyph-only labels (no text, no icons).
- **`lib/models/chord.dart`** — additive `ChordDisplayX` extension providing `shortNameFor(pref)` / `nameFor(pref)` / `chordNotesFor(pref)`. Existing `Chord.shortName` / `name` / `chordNotes` / `chordNotesWithOctave` signatures and return semantics **unchanged** (sharp-only identity preserved).
- **`lib/screens/home_screen.dart`** — deleted the `static final _noteLabels` class-init memoization (closing the critical gotcha) and replaced it with a per-build `final noteLabels = [for (final n in Note.values) n.displayFor(notation)];` computed from `ref.watch(notationProvider)`. `_showExportPicker` signature gained a trailing `NotationPreference preference` parameter.
- **`lib/widgets/chord_info_card.dart`** — `StatelessWidget` → `ConsumerWidget`. Uses `chord.shortNameFor(pref)` / `chordNotesFor(pref)` / `nameFor(pref)`. `ValueKey` now `(chord, pref)` tuple so `AnimatedSwitcher` cross-fades cleanly on toggle.
- **`lib/widgets/history_chip.dart`** — `StatelessWidget` → `ConsumerWidget`. Uses `result.chord.shortNameFor(pref)`. Self-reactive for both `HistoryStrip` and the rotated `VerticalHistoryStrip`.
- **`lib/widgets/vertical_piano_keyboard.dart`** — `StatelessWidget` → `ConsumerWidget`. New `displayLabel` parameter on `_WhiteKeyH` and `_BlackKeyH` alongside existing `noteName`. `Text(...)` renders `displayLabel`; `onTap` still carries `noteName` (sharp identity). Static key tables (`_vWhiteKeys`, `_vBlackKeyOffsets`, `_allVBlackKeys`) and `highlightColor` comparison logic unchanged.
- **`lib/screens/piano_screen.dart`** — AppBar title fix (applied as follow-up): `Text(chord?.nameFor(pref) ?? 'Piano')` watching `notationProvider`. Identity paths (`VerticalPianoKeyboard.highlightedNotes`, `onKeyTap: audio.playSingleNote`) unchanged.

### Test coverage (new files)
- **`test/note_format_test.dart`** — 24 cases: all 5 sharp→flat mappings, round-trip sharps, natural notes, defensive unknown, `NoteFormatX.displayFor`.
- **`test/notation_provider_test.dart`** — 6 cases mirroring `shake_provider_test.dart`: default state pre-hydration, `setPreference`, persistence write, hydration read, unknown fallback, missing-key fallback.
- **`test/chord_display_test.dart`** — 6 cases for `ChordDisplayX`: `shortNameFor` under flats/sharps/identity, `chordNotesFor` for B major & A minor, `nameFor` for natural root.

## Phases Completed

| Phase | Name | Key Outcome |
|-------|------|-------------|
| 1 | Foundation — preference enum, formatter, provider | 6 new files (4 lib + 2 test), strictly additive, 0 existing files modified. All exit gates green. |
| 2 | Settings UI — NOTATION SettingsCard | Only `settings_screen.dart` modified. SegmentedButton with ♯/♭ glyphs inserted between DISPLAY and INTERACTION. Two small polish fixes applied post-review (header-to-button padding; stale class docstring deleted). |
| 3 | Display surfaces + `_noteLabels` gotcha | `chord.dart` additive extension, `ChordInfoCard`/`HistoryChip` → `ConsumerWidget`, `_noteLabels` static-final deleted (verified via grep), `_showExportPicker` threading. All 240 tests green incl. 22 music-theory cases. |
| 4 | Piano keyboard key labels | Only `vertical_piano_keyboard.dart` modified. Identity invariant preserved: highlight matching and tap routing still use sharp `noteName`; only `Text` renders `displayLabel`. MIDI byte output byte-for-byte identical regardless of preference. |
| Fix | PianoScreen AppBar title | Checker flagged gap: AppBar title used sharp-only `chord?.name`. Patched to `chord?.nameFor(pref)` with provider watch. 3-line fix. |

## Edge Cases Handled

- **Identity vs. display** — `Chord.chordNotesWithOctave` has three consumers with different needs (audio playback, MIDI export, piano highlight matching — all need **identity**; `ChordInfoCard` note pills need **display**). Resolved via AD-2 Shape (b): canonical APIs stay sharp-only, a `formatNote()` helper handles display at render time only. Avoids broadening `noteToMidi` or doubling the piano's static key tables.
- **Dice face labels memoized at class init** — `HomeScreen._noteLabels` was a `static final` computed once at first access, not reactive to provider changes. Phase-3 exit gate mandated deletion of the identifier; replaced with a per-build local computed from `ref.watch(notationProvider)`. Verified via `grep -n '_noteLabels' lib/screens/home_screen.dart` returning 0 matches.
- **Live toggle during roll animation** — tumble animation is independent of face labels; `settleRoll()` idempotence + watchdog still hold; no special handling needed beyond reactive label list.
- **Persisted history format stability** — `DiceResult.fromJson`/`toJson` persist `Note.name` (enum variant name `"cSharp"`). Enum not renamed; existing persisted history deserializes unchanged; only display spelling re-renders.
- **Chord-type symbols** — none of the 20 `ChordType` symbols embed ♭/♯ (verified in brief against `_symbols` list). Toggle is purely a root-note concern — no `chord_type.dart` touch required.
- **MIDI export filename** — hardcoded `chord_dice_export.mid` contains no note names. Brief recorded this as a trivial no-op for this feature; the picker tile text inside `_showExportPicker` does honor the preference via `chord.nameFor(preference)`.
- **ChordReferenceScreen** — verified to render only `ChordType.displayName` + interval semitone integers + `ChordType.symbol`. No root-note text. Recorded as Known Non-Impact (AD-3) so reviewers/checker don't flag the absence of changes.
- **Character-set choice** — AD-1 picked ASCII for display strings (`C#`, `Db`) to preserve the 22 `chord_test.dart` cases without modification and avoid font-rendering inconsistency between letters and Unicode glyphs at small sizes. Unicode `♯`/`♭` used only on the SegmentedButton segment where no baseline-matching concern exists.

## Deviations From Original Plan

**One miss, caught by the checker and fixed.** The plan marked `lib/screens/piano_screen.dart` as "untouched" (key-tap wiring stays the same), but overlooked that the AppBar title was another visible surface. The checker's first pass reported `HAS_ISSUES` pointing to the hardcoded `chord?.name` AppBar title. A 3-line `implementer-fix` patch added `ref.watch(notationProvider)` and switched to `chord?.nameFor(pref)`. Re-check after fix: **DONE** with no other gaps.

Otherwise, all 4 phases landed as specified — no scope changes, no architectural pivots, all exit gates hit on first implementation attempt.

## Fixes Applied

| Issue | Files changed | Verification |
|-------|---------------|--------------|
| PianoScreen AppBar title still rendered sharp-only `chord?.name` | `lib/screens/piano_screen.dart` (3 lines: 2 imports + 1 `ref.watch` + title substitution) | `flutter analyze` 0 issues; `flutter test` 240/240 green; checker re-verified all 7 brief surfaces, identity paths, and test coverage — no other gaps. |

Polish (phase 2, non-blocking): NOTATION card padding adjusted from `fromLTRB(16, 0, 16, 16)` to `fromLTRB(16, 12, 16, 16)` for header-to-button spacing; stale class docstring on `SettingsScreen` (which omitted INTERACTION and was about to omit NOTATION too) deleted per project "default to no comments" convention.

## Out of Scope (Not Implemented)

Preserved from the brief for future reference:
- **Context-aware / key-aware spelling.** Pure global toggle only. `Note.fSharp` displays as either "F#" or "Gb" regardless of the containing chord's tonal context. No "F# major uses F#/A#/C# but Gb major uses Gb/Bb/Db".
- **Renaming `Note` enum values.** `cSharp`, `dSharp`, etc. stay — identity, not display. Persisted history format unchanged.
- **Chord types embedding `♭`.** No `m7♭5`, `7♭9`, `7#9`, `♭13`. The 20-member `ChordType` set is unchanged.
- **MIDI export filename embedding notes.** `chord_dice_export.mid` stays.
- **Third "automatic by key context" mode.** Two binary values only.
- **Locale-based spelling.** English letter names only; no German "H" for B, no Italian solfège.
- **Toggle label text variations.** Raw `♯`/`♭` symbols only; not "Sharps/Flats", not "Sharps/Bemols".
- **Default-to-flats migration.** Default stays sharps for backward compatibility.
- **Sub-pages or dialogs for the setting.** Entire UI surface is one `SegmentedButton` in one `SettingsCard`.
- **Toggle transition animation/styling.** Standard Riverpod rebuild — no transition work.

## Review Findings

- **Phase 1:** PASSED. One non-blocking suggestion (split a packed-expectation test case for clarity) — not applied.
- **Phase 2:** PASSED with 2 non-blocking suggestions, **both applied** (padding gap; stale docstring deletion).
- **Phase 3:** PASSED. No must-fix, no should-fix.
- **Phase 4:** PASSED. No must-fix, no should-fix. One minor doc discrepancy noted (pre-existing, not introduced by phase).
- **Final check (pre-fix):** HAS_ISSUES — 1 gap (PianoScreen AppBar title).
- **Final check (post-fix):** PASSED / DONE. No regressions. No issues remaining.

## Final Check Outcome

Full audit re-walked all 7 brief surfaces, identity paths, `_noteLabels` gotcha, and test coverage. All gates re-run:

- `flutter analyze` — **0 issues**
- `flutter test` — **240/240 green** (including 22 irreplaceable `chord_test.dart` music-theory cases)
- `flutter test test/midi_export_service_test.dart` — passes; MIDI byte output bit-for-bit identical regardless of preference
- All 7 brief surfaces verified honoring the toggle (with ChordReferenceScreen + MIDI filename confirmed as Known Non-Impact per AD-3 and brief)
- Identity invariant (AD-2 Shape (b)): `noteToMidi`, `AudioService.playChord` / `playArpeggio` / `playSingleNote`, `MidiExportService._buildTrackBytes`, `lib/models/note.dart` all untouched. `Chord.name` / `shortName` / `chordNotes` / `chordNotesWithOctave` signatures and semantics unchanged.
- `_noteLabels` gotcha: `grep -rn '_noteLabels' lib/` returns 0 matches.

## Files Changed

### New (7 files)
- `lib/models/notation_preference.dart` — enum + extension for glyph/prefsValue.
- `lib/utils/note_format.dart` — `formatNote` helper + `NoteFormatX.displayFor` extension.
- `lib/providers/notation_provider.dart` — `NotationNotifier` with keepAlive + microtask hydration.
- `lib/providers/notation_provider.g.dart` — codegen artifact (committed).
- `test/note_format_test.dart` — 24 formatter cases.
- `test/notation_provider_test.dart` — 6 provider lifecycle cases.
- `test/chord_display_test.dart` — 6 `ChordDisplayX` cases.

### Modified (7 files, +101 / −28 lines)
- `lib/models/chord.dart` — additive `ChordDisplayX` extension; existing API unchanged.
- `lib/screens/settings_screen.dart` — NOTATION SettingsCard insertion; stale class docstring removed.
- `lib/screens/home_screen.dart` — `_noteLabels` static-final deleted, per-build reactive `noteLabels`; `_showExportPicker` threading.
- `lib/screens/piano_screen.dart` — AppBar title reads `nameFor(pref)`; identity paths untouched.
- `lib/widgets/chord_info_card.dart` — `ConsumerWidget` conversion; display calls swapped to `*For(pref)`; `ValueKey` now `(chord, pref)` tuple.
- `lib/widgets/history_chip.dart` — `ConsumerWidget` conversion; `shortName` → `shortNameFor(pref)`.
- `lib/widgets/vertical_piano_keyboard.dart` — `ConsumerWidget` conversion; `displayLabel` parameter on key widgets; identity via `noteName` unchanged.

### Critical non-changes (verified)
- `lib/models/note.dart` — `NoteX.displayName` and `_names` untouched (identity).
- `lib/utils/midi_util.dart` — `noteToMidi` sharp-only lookup untouched.
- `lib/services/audio_service.dart` — no changes.
- `lib/services/midi_export_service.dart` — no changes.
- `lib/models/chord_type.dart` — no changes.
- `lib/screens/chord_reference_screen.dart` — no changes (Known Non-Impact per AD-3).
- `lib/providers/dice_provider.dart` — roll lifecycle untouched.
- `test/chord_test.dart` — 22 music-theory cases unchanged and green.

## Notes

- **Plan gap caught by checker:** the plan explicitly forecast `piano_screen.dart` as "untouched," which caused the AppBar title miss. The brief's Goal wording ("all visible note-name spelling", "every note name in the UI") was the higher-authority reference that flagged the discrepancy during `/flow:check`. Lesson for future features: the checker auditing against the brief (not just the plan) is what surfaced this — the pipeline's fresh-context reviewer at each phase wouldn't have caught it because the plan sanctioned the non-change.
- **Review artifacts on disk:** Phase 1 and Phase 2 reviews were persisted as `.flow-spec/review-*-report.md`. Phase 3 and Phase 4 reviews were conducted and confirmed PASSED via team-lead coordination but not persisted as separate files — flagged as informational in the check report.
- **Architectural seam:** AD-2 Shape (b) (canonical identity + render-time formatter) is worth reusing for any future display-vs-identity feature in the app. The seam is in `Chord` and `formatNote()` — it kept the 22 music-theory tests green without modification, and insulated the audio/MIDI pipeline completely.
- **Manual UI verification** (flutter run on device/simulator) is the one gate the pipeline couldn't execute. The plan's per-phase manual checklists (NOTATION card rendering, live re-render of history chips on toggle, persistence across cold restart, piano tap on `Gb` playing the same pitch as `F#`) remain user-owned.
