# AGENTS.md

This file provides guidance to coding agents (Claude Code, etc.) when working with code in this repository.

## What this app is

Chord Dice — a fully-offline Flutter app (iOS + Android) that rolls a **D12 note die** + a **D20 chord type die** to suggest a chord for music practice, displays it on a piano keyboard, and plays it on-device via `flutter_midi_pro` using a Salamander Grand Piano SF2 soundfont. The D20 rolls from a user-curated subset of 3–20 chords drawn from a 52-chord catalog (10 categories: triads, suspended, added-tone, sixths, sevenths, ninths, elevenths, thirteenths, altered dominants, hybrid/misc); the subset is edited from the **Chords** screen (Settings → CHORDS → Chord Reference).

The app is locked to portrait-up orientation on both platforms (`SystemChrome.setPreferredOrientations` in `main()`). All core features are shipped. Non-trivial subsystem changes are captured as design specs under `docs/superpowers/specs/` — **read the relevant spec before making non-trivial changes**, the specs capture *why* each decision was made.

## Commands

```bash
flutter pub get                                          # fetch deps
flutter run                                              # run on attached device/simulator
flutter analyze                                          # static analysis (must stay zero-issue; also runs riverpod_lint)
                                                         # Note: dart run custom_lint is NOT needed — riverpod_lint 3.x uses analysis_server_plugin directly
dart format lib test                                     # format sources (run before finishing a task)
dart run build_runner build --delete-conflicting-outputs # regenerate *.g.dart after @riverpod annotation changes
flutter test                                             # run entire suite
flutter test test/chord_test.dart                        # music-theory suite (all 52 chord types; 60+ cases)
flutter test test/chord_selection_test.dart              # ChordSelection model (faceLabels / copyWithToggled / equality)
flutter test test/chord_selection_provider_test.dart     # ChordSelectionNotifier + prefs persistence + defensive decoding
flutter test test/chord_reference_screen_test.dart       # Chords screen widget test (selection toggles, preview, counter pill)
flutter test test/chord_category_test.dart               # ChordCategory enum + per-category chord counts
flutter test test/dice_provider_test.dart                # provider lifecycle (uses fake_async)
flutter test test/shake_detector_test.dart               # shake threshold + debounce + ignore-while-rolling gate
flutter test test/midi_export_service_test.dart          # SMF byte-level output verification
flutter test test/note_format_test.dart                  # sharp↔flat conversion edge cases
flutter test test/notation_provider_test.dart            # notation preference persistence
flutter test test/chord_display_test.dart                # ChordDisplayX extension
flutter test test/chord_test.dart --plain-name "C Major" # single test by substring
```

There is no CI or pre-commit hook — run `flutter analyze` and the relevant tests locally before calling a task done.

## Architecture at a glance

```
UI (screens/, widgets/) → Riverpod (providers/dice_provider.dart) → services/ → models/
```

### Roll lifecycle — callback-driven with watchdog

State lives in `diceProvider` (generated from `@Riverpod(keepAlive: true) class DiceNotifier`) at `lib/providers/dice_provider.dart`. `RollState` is `idle` / `rolling` / `result`. `DiceState` carries both `current` (last settled result — feeds `ChordInfoCard` and the piano keyboard) and `rollingTarget` (the newly-rolled result during the rolling phase — feeds `DiceStage` so it can settle on the correct face).

The roll is split into `beginRoll()` / `settleRoll()`:

1. `beginRoll()` reads the user's active chord list from `chordSelectionProvider`, calls `DiceService.rollBothBiased(state.current?.note, activePool: active)` so the rolled `ChordType` is sampled uniformly from the active subset, publishes the result via `rollingTarget`, flips `rollState` to `rolling`, computes `chordFaceIndex` (one of the 20 die faces matching the rolled chord — randomized across matching indices when the active set has repeats), and arms a `Timer` watchdog.
2. `DiceStage` drives the tumble animation and calls `settleRoll()` via its `onSettled` callback when it lands naturally.
3. The watchdog is a **safety net only** for when the stage unmounts mid-roll (route change, app backgrounded) — `settleRoll()` is **idempotent** so the callback and the watchdog can both safely fire.
4. `settleRoll()` moves `rollingTarget` → `current`, prepends to history (capped at `DiceState.maxHistory = 16`), flips to `result`, persists the new history to `SharedPreferencesAsync` under the `_kHistory = 'dice_history'` key, and calls `AudioService.playChord(chord)` (or `playArpeggio` if arpeggio mode is on).

Timing constants `kRollAnimationDuration` (1100 ms) and `kRollWatchdogGrace` (400 ms) live in `lib/constants.dart` — change them there, not inline. Both `DiceStage` and the provider read from the same source. `kChordInfoCardHeight` (130 lp) also lives there — it reserves a fixed-height zone for `ChordInfoCard` in `home_screen.dart` so the `DiceStage` never resizes on first roll.

### Note selection is biased toward the circle of fifths

`DiceService.rollBothBiased(prevNote)` uses `NoteX.fifthNeighbors` (±7 and ±5 semitones from the previous note) to weight rolls ~2× toward neighbor keys for more musical-feeling sequences. First roll (no prior note) is uniform.

### Geometry / motion / rendering are three separate files

- `lib/widgets/polyhedron.dart` — real dodecahedron (D12) + icosahedron (D20) geometry. Single source of geometric truth, covered by `polyhedron_test.dart`.
- `lib/widgets/dice_motion.dart` — pure tumble math (arc + rotation + bounce), covered by `dice_motion_test.dart`.
- `lib/widgets/dice_3d.dart` — a pure `CustomPainter` render widget. **Animation state does not live here** — it lives in `DiceStage`.

Keep these three split. Fixing a rendering bug by reaching into geometry or moving motion logic into the painter is a smell.

### Chord math is centralized in `lib/models/`

- `ChordType` (52 values across 10 `ChordCategory` groups) stores all metadata in **one** top-level `const Map<ChordType, _ChordMeta>` record map in `lib/models/chord_type.dart` (fields: `display`, `symbol`, `intervals`, `faceLabel`, `category`). Adding a chord means one row per chord; the `!` lookup in the extension getters enforces compile-time exhaustiveness (adding or renaming an enum value without updating the map fails to compile). **Do not split this back into parallel tables, collapse to a `switch`, or move metadata onto the enum.** The same one-record-per-enum convention is reused for `NotationPreference` via `_NotationMeta` in `lib/models/notation_preference.dart` — extend this pattern (not parallel maps) for any new enum carrying multiple fields. The original 20 enum names (`major`, `minor`, `dom7`, `maj7`, `min7`, `sus2`, `sus4`, `dim`, `aug`, `min9`, `maj9`, `add9`, `sixth`, `min6`, `dom9`, `halfDim`, `dim7`, `min11`, `minMaj7`, `power5`) are preserved verbatim so persisted roll history deserializes unchanged via `ChordType.values.byName(...)`.
- `Chord.chordNotesWithOctave` → `List<(String noteName, int octave)>` is the **single source of truth** for which notes a chord contains. `AudioService.playChord` and the piano keyboard widget both call it. Do not reimplement interval math elsewhere.
- **Note display uses sharps canonically, flats only at render time.** `Chord.name`, `chordNotesWithOctave`, `noteToMidi`, and `chord_test.dart` are sharp-only — do not branch on `NotationPreference` inside them. Display conversion happens via `formatNote(canonical, pref)` / `ChordDisplayX` in `lib/utils/note_format.dart`, called from widgets (`ChordInfoCard`, `HistoryChip`, `VerticalPianoKeyboard`, piano AppBar, MIDI picker). Audio and MIDI output are byte-for-byte identical regardless of preference. `notationProvider` persists the choice via `SharedPreferencesAsync`.

### Piano keyboard is a full-screen push route

- `PianoScreen` (`lib/screens/piano_screen.dart`) has two modes driven by optional constructor params `previewChord` and `showHistory` (defaults `true`). **Rolled mode** (defaults): pushed from `HomeScreen` when a result exists, reads `diceProvider` so it re-renders if the user rolls while on-screen, renders a `Row` of `VerticalPianoKeyboard` (flex 4 ≈ 80%) + `RotatedBox(quarterTurns: 1)` wrapping `VerticalHistoryStrip` (flex 1 ≈ 20%) — the rotation turns the internally-horizontal ListView into a vertical column so user-facing vertical swipes arrive at the child as horizontal drags, no extra gesture wiring. **Preview mode** (`showHistory: false` + `previewChord` set): pushed from `ChordReferenceScreen`'s piano-icon button with `Chord(root: Note.c, type: chordType)`; the keyboard fills the full width and the history strip is omitted.
- `VerticalPianoKeyboard` (`lib/widgets/vertical_piano_keyboard.dart`) renders a 3-octave vertical keyboard (C3–B5, top-to-bottom). The old horizontal `PianoKeyboard` widget and its bottom-sheet launch code have been deleted.

### Audio

- Backend is `flutter_midi_pro` ^3.1.6 playing `assets/audio/salamander_grand.sf2` via FluidSynth.
- **Init is lazy + pre-fired** — `AudioService.init()` runs on the first `playChord`/`playSingleNote` call, not from `main()`. iOS requires the audio engine to start after a user gesture; eager init breaks first-roll audio on iOS. `beginRoll()` fires `unawaited(_audio.init())` so the SF2 loads in parallel with the dice animation. A `Completer<void>` deduplicates concurrent callers; init failures reset the completer to `null` so the next call retries.
- `noteToMidi(noteName, octave)` in `lib/utils/midi_util.dart` is the authoritative `(noteName, octave) → MIDI number` helper (C4=60, A4=69). Top-level function shared by `AudioService` and `MidiExportService`. Do not duplicate the formula or reintroduce a private copy on either service.
- Chord notes trigger with a 30 ms per-note stagger for a subtle strum. A `_playGeneration` counter cancels in-flight stagger loops when a new chord arrives. Active notes are tracked as `Set<int>` so `stopAll()` can send `noteOff` for each.
- **Audio is triggered from `DiceNotifier.settleRoll()`, never from widgets** — keeps muting/replay/stopAll logic centralized.

### Arpeggio mode

When enabled, `settleRoll()` calls `AudioService.playArpeggio(chord, pattern)` instead of `playChord`. The arpeggio engine plays notes sequentially using `kArpNoteInterval` (187 ms, ≈ 1/16 at 80 BPM) for `kArpCycles` (2) cycles — both constants live in `lib/constants.dart`.

Thirteen traversal patterns are defined in `lib/models/arpeggio_pattern.dart` as `ArpeggioPattern`: `up`, `down`, `upDown`, `downUp`, `upAndDown`, `downAndUp`, `converge`, `diverge`, `conAndDiverge`, `pinkyUp`, `pinkyUpDown`, `thumbUp`, `thumbUpDown`. Each implements `ArpeggioPatternX.sequence<T>(notes)` — a generic that takes the low-to-high note list from `Chord.chordNotesWithOctave` and returns the traversal order for one cycle.

User preferences (`enabled`, `pattern`) are held in `ArpeggioSettings` (`lib/models/arpeggio_settings.dart`) and managed by `arpeggioProvider` (`lib/providers/arpeggio_provider.dart`). The same `_playGeneration` / `stopAll()` cancellation logic that governs chord playback applies here.

### Shake-to-roll

- `ShakeDetector` (`lib/services/shake_detector.dart`) wraps a `sensors_plus` `accelerometerEventStream()` and fires `onShake` when `sqrt(x²+y²+z²) − 9.81 > threshold`. Debounced by `kShakeMinIntervalBetweenEvents` (500 ms) and gated by an injectable `shouldIgnoreEvent` callback (used to suppress shakes while a roll is already in flight). The constructor accepts a `clock` closure for deterministic tests.
- Thresholds live in `lib/constants.dart` as `kShakeThresholdLow = 25.0`, `kShakeThresholdMedium = 18.0`, `kShakeThresholdHigh = 12.0` (m/s² above gravity — **higher threshold = less sensitive**, i.e. requires a firmer shake). The Settings UI labels these as Low / Medium / High sensitivity; sensitivity "High" is the easiest to trigger.
- `ShakeNotifier` (`lib/providers/shake_provider.dart`) persists enabled + sensitivity in `SharedPreferencesAsync`. Default is enabled + medium.
- **The subscription is lifecycle-aware.** `_HomeScreenState._updateSubscription()` only calls `_detector.start()` when all three conditions hold: `shakeProvider.enabled`, `AppLifecycleState.resumed`, and `ModalRoute.isCurrent == true`. Any false condition calls `_detector.stop()`. This is critical for battery life — don't weaken the gating.
- Sensitivity changes are live — `_detector.updateThreshold(...)` mutates the live detector without tearing the subscription down.
- `_onShake` calls `DiceNotifier.beginRoll()` — **never** `AudioService` directly. The audio-through-provider invariant applies to shake too.

### MIDI export

- `MidiExportService` (`lib/services/midi_export_service.dart`) builds a Standard MIDI File (type 0, single track, 480 PPQ) byte stream from a `List<DiceResult>` and writes it via `path_provider` + `share_plus`. One whole note (4 beats = 1920 ticks) per chord at `kMidiExportBpm = 120`, `kMidiExportVelocity = 80`, channel 0.
- The Export button (`ios_share` icon) lives in the home-screen bottom button row, enabled only when history is non-empty and no roll is in flight. Tapping it opens a picker sheet (max height `kMidiPickerMaxHeight = 320.0`) to select the history slice before sharing.
- `buildMidiBytesForTest` exposes the raw SMF bytes for `test/midi_export_service_test.dart` — the test validates header/track chunks, tempo meta-event, paired note-on/note-off, and VLQ delta-time encoding byte-by-byte. Don't change the byte layout casually.

### Reusable UI primitives

- `HistoryChip` (`lib/widgets/history_chip.dart`) is the shared chip used by both `HistoryStrip` (home screen) and `VerticalHistoryStrip` (piano screen). Handles active-chord highlight + tap-to-replay.
- `SettingsCard` (+ `SettingsSectionHeader`) in `lib/widgets/settings_card.dart` is the card-with-section-title shell for every section of `SettingsScreen`.
- `CircleIconButton` (`lib/widgets/circle_icon_button.dart`) has a `Variant` enum (`tonal` / `filled`) and backs the three non-ROLL buttons in the home-screen bottom row: Arp toggle (`filled` when enabled, else `tonal`), piano nav, MIDI export.

### Theme settings

- `buildTheme(AccentPalette palette, Brightness brightness)` in `lib/theme.dart` is a thin wrapper around `ColorScheme.fromSeed(seedColor: palette.d20Color, brightness: ...)` with `palette.d12Color` injected as `ColorScheme.secondary`. There are **no hand-picked surface/text/divider colors** — everything is derived from the seed. There are no palette-independent color constants; all colors come from `colorScheme`.
- User-facing theme state (`ThemeMode` + `AccentPalette`) lives in `themeProvider` (`lib/providers/theme_provider.dart`), backed by `SharedPreferencesAsync`. `sharedPreferencesProvider` (a manual `Provider<SharedPreferencesAsync>`) must be overridden in `main()` with a pre-constructed instance. `ThemeNotifier.build()` returns the default synchronously then hydrates from prefs via `Future.microtask(_load)` — at most one frame of default theme before saved theme appears. Eight palettes ship: `lavenderCyan` (default), `blue`, `tealAmber`, `roseSage`, `indigoMint`, `plumPeach`, `emeraldGold`, `crimsonSlate` (see `lib/models/accent_palette.dart`). The string key `"defaultBlue"` is kept as a deserialization alias for `blue` for backward compatibility.
- **Adding a palette:** touch `_d12Colors`, `_d20Colors` (in `accent_palette.dart`), both `_load` and `setPalette` switches (in `theme_provider.dart`), and the count assertion in `test/accent_palette_test.dart`. Bang operators enforce exhaustiveness in extension getters.
- **MD3 red seed limitation:** pure-red HCT hues (~25°) produce brownish/terracotta primaries at tone 40 in light mode. Use a magenta-adjacent seed (`#AD1457` style) instead of a true red hex for any "red" palette.
- `SettingsScreen` (`lib/screens/settings_screen.dart`) is the only UI surface that writes to `themeProvider`, `notationProvider`, `shakeProvider`, and `arpeggioProvider`. It reads `diceProvider` only to enable/disable the Clear History action. Sections (top-to-bottom): **DISPLAY** (ThemeMode SegmentedButton + accent palette picker), **CHORDS** (notation sharps/flats SegmentedButton + Chord Reference nav ListTile), **INTERACTION** (shake-to-roll switch + sensitivity SegmentedButton), **PLAYBACK** (arpeggio switch + pattern ChoiceChips), **DATA** (Clear History with a confirm dialog). Each section is a `SettingsCard`.
- `ChordReferenceScreen` (`lib/screens/chord_reference_screen.dart`, title "Chords") renders all 52 `ChordType` values grouped into 10 `ChordCategory` sections, pushed from the CHORDS card in `SettingsScreen`. Each row has a leading `Checkbox` that toggles whether the chord is in the user's active D20 roll set (silently no-op at the 3 / 20 boundaries) and **two** trailing preview buttons: a "▶︎" that plays `Chord(Note.c, type)` via `audioServiceProvider` — mirroring the user's arpeggio toggle (calls `playArpeggio(preview, arp.pattern)` when `arpeggioProvider.enabled`, else `playChord(preview)`) — and a piano-outlined icon that pushes `PianoScreen(previewChord: ..., showHistory: false)` so the user can see the chord voiced on the keyboard. An AppBar counter pill shows "N / 20" (tinted `primary` at 20, `secondaryContainer` otherwise).

### Chord catalog + selection

- The **catalog** is `ChordType` itself — 52 values, grouped by `ChordCategory` in declaration order (`lib/models/chord_category.dart`). The 20 legacy enum names are preserved; all the rest are new (triads / suspensions / added-tones / sixths / 7ths / 9ths / 11ths / 13ths / altered dominants / hybrid).
- The **active selection** lives in `chordSelectionProvider` (`lib/providers/chord_selection_provider.dart`). It holds an ordered `List<ChordType>` of length 3 – 20; cardinality enforced by the notifier via silent no-op on boundary-violating `toggle` calls. Persisted as a JSON array of `.name` strings under prefs key `chord_selection` (defensive decoding skips unknown names, dedupes duplicates, truncates >20, and falls back to `kDefaultChordSelection` on corrupt JSON or <3 survivors).
- The **D20 die** is the same icosahedron as before (20 faces, geometry untouched). When the active selection has fewer than 20 entries, `ChordSelection.faceLabels` fills 20 face slots by cyclically repeating labels (`faceIndex → active[faceIndex % active.length]`). Sampling in `DiceService.rollD20(activePool:)` happens over the **active list** (length N), not over faces — repeats bias visual landing only, not roll probability.
- `DiceState.chordFaceIndex` stores the 0–19 face index of the currently-settled (or in-flight) chord. Set by `beginRoll()` via random selection among all matching face indices (visual variety for repeated rolls), by `replayFromHistory` via `firstFaceFor` (deterministic), and auto-re-resolved to `firstFaceFor` when the selection changes mid-session (via `ref.listen(chordSelectionProvider, ...)` inside `DiceNotifier.build()`).
- **Default active set on first launch = `kDefaultChordSelection`** — the legacy 20 chord types in their legacy order. Backward-compatible: a pre-update user upgrading sees identical dice behavior.

## Codebase navigation

Use **Serena MCP** for all source navigation — `get_symbols_overview`, `find_symbol`, `find_referencing_symbols`, `search_for_pattern`. These are symbol-aware and have a much smaller context footprint than `Read`/`Grep`. Fall back to `Read`/`Grep`/`Glob` only for non-code files (JSON, Markdown, yaml) or when you already know exactly what you need.

## Deep code review

For architectural audits / "find drift or bugs" passes, invoke **`/deep-review [scope]`** (defined in `.claude/commands/deep-review.md`). It enumerates 11 invariant lenses (roll lifecycle, chord math centralization, notation canonicality, geometry/motion/rendering split, Riverpod codegen contract, theme purity, selection invariants, lifecycle gating, persistence defenses, spec/code divergence, test coverage) and the expected finding format. Scope can be a path, a commit range, or empty for all of `lib/`.

## Conventions & gotchas

- **`flutter analyze` must stay zero-issue.** The project ships with an unmodified `analysis_options.yaml` (just `package:flutter_lints/flutter.yaml`). Don't silently tweak rules.
- **Never hardcode colors in widgets — pull from `Theme.of(context).colorScheme`.** Surface/text/divider colors are *all* derived by `ColorScheme.fromSeed` in `buildTheme()`; there is no palette of top-level `kColor` constants to reach for. The D20 accent is `colorScheme.primary`, the D12 accent is `colorScheme.secondary`. Typography is plain MD3 — `google_fonts` has been removed, don't add it back.
- **For icons/text overlapping a `secondary`-colored surface** (e.g. a selected palette swatch), use `cs.onSecondary` — not `cs.secondary` — so MD3 contrast is guaranteed across all palettes.
- **Animation uses `flutter_animate` + raw `AnimationController` / `Matrix4`.** The project deliberately does **not** use Flame — `CustomPainter` is the chosen path for dice rendering.
- **Top-level constants use a `kCamelCase` prefix** (`kRollAnimationDuration`, `kBgColor`). Private members use `_underscorePrefix`. Enum values are `lowerCamelCase`.
- **Immutable models use manual `==` / `hashCode` with `Object.hash(...)`** — no `equatable` dependency. `copyWith` uses a `clearX` boolean flag when a field can be intentionally nulled (see `DiceState.copyWith`'s `clearRollingTarget`).
- **State management uses `@Riverpod(keepAlive: true) class` codegen Notifiers** (`@riverpod` annotation API). All eight providers (`diceProvider`, `themeProvider`, `arpeggioProvider`, `shakeProvider`, `notationProvider`, `chordSelectionProvider`, `audioServiceProvider`, `diceServiceProvider`) generate `.g.dart` part files via `build_runner`. After changing any `@riverpod` annotation, run `dart run build_runner build --delete-conflicting-outputs` before analyzing or testing. Do not revert to `StateNotifierProvider` or hand-write providers without discussion.
- **Section headers inside long files** use box-drawing comments: `// ─── Section Name ───` — keep this consistent.
- **After any `await` in a method that mutates notifier/widget state**, re-check `ref.mounted` (in Notifier methods) or `mounted` (in State subclasses). `settleRoll()` does this twice; `AudioService.playChord` checks `_playGeneration` between stagger steps to abort if a newer chord was requested.
- **Use `unawaited(...)` explicitly** for fire-and-forget MIDI calls — don't drop futures silently.
- **Music-theory tests (`test/chord_test.dart`, 60+ cases covering all 52 chord types) are the irreplaceable safety net.** After any change under `lib/models/`, they must all pass. If they fail, fix the code, never the test.
- **`music_notes` is the canonical library for interval/pitch math.** `Chord.chordNotesWithOctave` uses `mn.Pitch.transposeBy`, `NoteX.fifthNeighbors` uses `mn.Interval.P5`, `noteToMidi` goes through `mn.Pitch`. Bridge helpers live on `NoteX` (`mn` getter, `fromMn` static) and `ChordTypeX.musicNotesIntervals`. Don't reintroduce `(octave + 1) * 12 + semitone` formulas or modular `% 12` interval math in new code.
