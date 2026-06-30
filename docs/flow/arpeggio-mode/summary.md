# Feature Summary: Arpeggio Mode
_Archived: 2026-06-30_
_Status: DONE_

## Goal

Add an arpeggio playback mode to Chord Dice so that when enabled, rolled chords play their notes sequentially in a chosen pattern instead of all at once. This gives users ear-training variety and mimics arpeggiator functionality found in DAWs and synthesizers. Timing is fixed at 1/16 notes at 80 BPM (~187 ms between note onsets), patterns play 2 complete cycles, and the feature persists across app restarts via SharedPreferences.

## What Was Built

### Models (`lib/models/`)
- **`arpeggio_pattern.dart`** — `enum ArpeggioPattern` (13 values: `up`, `down`, `upDown`, `downUp`, `upAndDown`, `downAndUp`, `converge`, `diverge`, `conAndDiverge`, `pinkyUp`, `pinkyUpDown`, `thumbUp`, `thumbUpDown`). Top-level `_displayNames` and `_descriptions` lookup tables follow the `ChordType`/`AccentPalette` pattern. Extension `ArpeggioPatternX` exposes `displayName`, `description`, and generic `sequence<T>(List<T> notes) → List<T>`. Private helpers `_converge<T>` and `_diverge<T>` serve the convergent/divergent family.
- **`arpeggio_settings.dart`** — `class ArpeggioSettings` with `enabled: bool` (default `false`) and `pattern: ArpeggioPattern` (default `up`). Implements `copyWith`, `operator ==`, and `hashCode` via `Object.hash`.

### Provider (`lib/providers/`)
- **`arpeggio_provider.dart`** — `ArpeggioNotifier extends StateNotifier<ArpeggioSettings>` mirroring `ThemeNotifier`. SharedPreferences keys: `'arp_enabled'`, `'arp_pattern'`. Synchronous initial load via `static _load(prefs)`. Exposes `toggle()`, `setEnabled(bool)`, `setPattern(ArpeggioPattern)`. `arpeggioProvider` consumes `sharedPreferencesProvider`.

### Audio (`lib/services/audio_service.dart`)
- **`playArpeggio(Chord, ArpeggioPattern)`** — lazy `init()`, `stopAll()` at entry, builds `fullSequence` by spreading `kArpCycles` repetitions of `pattern.sequence(notes)`, iterates with `await Future.delayed(kArpNoteInterval)` between notes, uses the existing `_playGeneration` cancellation contract. Schedules `_releaseAll()` after the full sequence completes.

### Constants (`lib/constants.dart`)
- `kArpNoteInterval = Duration(milliseconds: 187)` — 1/16 note at 80 BPM
- `kArpCycles = 2`

### Provider integration (`lib/providers/dice_provider.dart`)
- `DiceNotifier` gains `Ref _ref` as first constructor parameter.
- `settleRoll()` and `replayFromHistory()` read `_ref.read(arpeggioProvider)` and branch between `playArpeggio` and `playChord` based on `arpSettings.enabled`.
- `diceProvider` factory passes `ref` as first argument to `DiceNotifier`.

### UI (`lib/screens/`)
- **`home_screen.dart`** — Button row restructured to `[Arp 56×56][12px][Roll flexible][12px][Piano 56×56]`. Arp toggle: `FilledButton` (solid, on) / `FilledButton.tonal` (off), `Icons.graphic_eq`, `CircleBorder`, calls `arpeggioProvider.notifier.toggle()`.
- **`settings_screen.dart`** — ARPEGGIO section added after ACCENT COLOR. `SwitchListTile` for enable/disable. `Wrap` of 13 `ChoiceChip` widgets showing `pattern.displayName`, selected chip uses `colorScheme.primaryContainer`. Pattern picker wrapped in `AnimatedOpacity` (0.38 when disabled) + `AbsorbPointer`.

### Tests
- **`test/arpeggio_pattern_test.dart`** — 42 tests covering all 13 patterns (3-note canonical output, 2-note graceful degradation, 1-note/empty edge cases, endpoint-repetition assertions for `upDown`/`downUp`/`upAndDown`/`downAndUp`, generic type preservation).
- **`test/dice_provider_test.dart`** — Updated: added `playArpeggio` stub to `_RecordingAudioService`, added `setUpAll` for `SharedPreferences.setMockInitialValues`, injected `sharedPreferencesProvider.overrideWithValue(_fakePrefs)` in `_makeContainer`. All 137 tests pass.

## Phases Completed

| Phase | Name | Key Outcome |
|-------|------|-------------|
| 1 | Model & Pattern Sequencing | `ArpeggioPattern` enum + `sequence<T>()` for all 13 patterns; 42 unit tests |
| 2 | Settings Model & Provider | `ArpeggioSettings` + `ArpeggioNotifier` with SharedPreferences persistence |
| 3 | Audio — `playArpeggio()` | `AudioService.playArpeggio()` + `kArpNoteInterval`/`kArpCycles` constants |
| 4 | Dice Provider Integration | `DiceNotifier` reads arp state in `settleRoll()` and `replayFromHistory()` |
| 5 | UI — Home Screen Toggle + Settings Screen Section | Home toggle button + settings pattern picker |

## Edge Cases Handled

| Edge Case | Resolution |
|-----------|-----------|
| Arp toggled mid-playback | In-flight arpeggio completes naturally; only `stopAll()` or a new play call bumps `_playGeneration`. Next roll uses updated setting. |
| Single-note chord | `sequence()` returns `[note]` for length == 1 (early-return guard at `arpeggio_pattern.dart:79`). |
| Pattern with < 3 notes | All 13 patterns handle 2-element and 1-element inputs without crash — verified by "2-note: no crash" test suite. |
| App restart | `ArpeggioNotifier._load()` restores `enabled` and pattern from SharedPreferences synchronously on startup. Pattern deserialized via `ArpeggioPattern.values.firstWhere(p => p.name == saved)` with `orElse: () => up` fallback. |
| `stopAudio()` cancels in-flight arpeggio | `DiceNotifier.stopAudio()` → `_audio.stopAll()` → increments `_playGeneration`, breaking the arpeggio await loop. |
| New roll cancels in-flight arpeggio | `playArpeggio` calls `stopAll()` at entry, which bumps `_playGeneration`. In-flight arpeggio bails at its next `await` point. |

## Deviations From Original Plan

- **Phase 2 — `_load` deserialization**: Plan suggested a `switch`; implementation used `ArpeggioPattern.values.firstWhere(p => p.name == name)` for automatic round-tripping. More robust: new patterns added later work without touching persistence code. The `ThemeNotifier` uses `switch` only because of legacy alias remapping (`'defaultBlue'`), which doesn't apply here.
- **Phase 3 — `test/dice_provider_test.dart`**: Adding `playArpeggio` to `AudioService` required updating `_RecordingAudioService` in the test file (Dart interface contract). Anticipated; treated as a natural consequence.
- **Phase 5 — Icon**: Used `Icons.graphic_eq` (one of the two valid options noted in the plan). `Icons.arpeggiator` does not exist in Flutter.

## Out of Scope (Not Implemented)

- Tempo/BPM setting — fixed at 80 BPM (`kArpNoteInterval = 187ms`)
- Note duration / sustain setting
- Cycle count setting — fixed at 2 (`kArpCycles = 2`)
- Per-note piano key highlighting during arpeggio playback
- Arpeggio for `playSingleNote` (piano keyboard taps are unaffected)

## Review Findings

One review run (`review-all-report.md`, status: `HAS_ISSUES`). **Must-fix: 0. Should-fix: 3.**

1. `AudioService.playArpeggio` used `return` inside the generation check; `playChord` uses `break`. Cosmetic asymmetry between two parallel methods.
2. Arp toggle button in `home_screen.dart` duplicated `style` and `child` across the two `FilledButton` branches.
3. `SettingsScreen` class docstring said "two preferences"; screen now has three sections.

The docstring issue (item 3) was fixed via a dedicated `/flow:implement fix` pass (see `fix-result.md`). Items 1 and 2 were "should-fix" findings that did not block the final check.

## Final Check Outcome

All 14 brief requirements verified (7 expected behaviors + 5 edge cases + 5 out-of-scope guards). Zero regressions. `flutter analyze` — zero issues. `flutter test` — 137/137 passed.

**Minor discrepancy noted**: The brief's description for `ThumbUp` ("lowest note first, then ascending from 2nd lowest") would produce `[C, E, G]` — a duplicate of `Up`. The implementation uses `[...notes, lowest]` → `[C, E, G, C]`, which is the symmetric counterpart of `PinkyUp` (`[G, C, E, G]`). The implementation is the correct musical intent; the brief description was imprecise.

## Files Changed

| File | Change |
|------|--------|
| `lib/models/arpeggio_pattern.dart` | Created — 13-value enum, lookup tables, `sequence<T>()` extension |
| `lib/models/arpeggio_settings.dart` | Created — immutable settings class |
| `lib/providers/arpeggio_provider.dart` | Created — `ArpeggioNotifier` + `arpeggioProvider` |
| `lib/constants.dart` | Modified — added `kArpNoteInterval`, `kArpCycles` |
| `lib/services/audio_service.dart` | Modified — added `playArpeggio()` method |
| `lib/providers/dice_provider.dart` | Modified — `DiceNotifier` gains `Ref`; `settleRoll()`/`replayFromHistory()` branch on arp state |
| `lib/screens/home_screen.dart` | Modified — arp toggle button added to button row |
| `lib/screens/settings_screen.dart` | Modified — ARPEGGIO section added; docstring updated |
| `test/arpeggio_pattern_test.dart` | Created — 42 pattern unit tests |
| `test/dice_provider_test.dart` | Modified — `_RecordingAudioService` stub, SharedPreferences setup, `_makeContainer` override |

## Notes

- The plan's validation pass (`validation-report.md`) caught a missing `test/dice_provider_test.dart` entry in the affected-files table before any implementation began. Phase 4 was updated to include a step for the test update.
- Open "should-fix" items from the review (items 1 and 2 above) were not addressed during this feature cycle. They are cosmetic and do not affect correctness: the `return`/`break` asymmetry in `AudioService` and the duplicated `style`/`child` in the arp toggle button. Both are candidates for a future housekeeping pass.
- The `conAndDiverge` tests assert "no crash + contains all notes" rather than exact sequence order. A regression in traversal order would not be caught. Candidate for a future test-hardening pass.
