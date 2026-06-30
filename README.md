# Chord Dice

A music practice tool that rolls a **D12 note die** and a **D20 chord type die**
to give you a random chord to practice. Fully offline — audio is synthesized on-device.

---

## Architecture

```
UI Layer (screens/, widgets/)
        │
        ▼
Riverpod Providers (providers/dice_provider.dart)
        │
        ▼
Services (services/)
  ├── DiceService   — random D12/D20 rolls
  └── AudioService  — flutter_midi_pro (FluidSynth + SF2) chord playback
        │
        ▼
Models (models/)
  ├── Note         — 12-note enum (C … B)
  ├── ChordType    — 20 chord types with interval arrays
  ├── Chord        — root + type → note list computation
  └── DiceResult   — roll snapshot with timestamp
```

**State flow:**
1. User taps ROLL → `DiceService.rollBoth()` picks a random note + chord type
2. `DiceNotifier.roll()` publishes the result via `DiceState.rollingTarget` so `DiceStage` can compute each die's settle rotation, and flips `rollState` to `rolling`
3. 1100 ms delay — `DiceStage` tumble animation plays: each die travels to a fresh random landing position along a parabolic arc, bounces once, and lands with the result face pointing at the camera
4. State flips to `result`, `rollingTarget` clears into `current`, history prepended, `AudioService.playChord()` called

---

## Run

```bash
flutter pub get
flutter run
```

For tests:
```bash
flutter test test/chord_test.dart
```

For static analysis:
```bash
flutter analyze
```

---

## Music Theory Reference

All intervals are in semitones from the root. Full table in `lib/models/chord_type.dart`.

| Chord     | Symbol | Intervals        |
|-----------|--------|------------------|
| Major     |        | 0, 4, 7          |
| Minor     | m      | 0, 3, 7          |
| Dom7      | 7      | 0, 4, 7, 10      |
| Maj7      | maj7   | 0, 4, 7, 11      |
| Min7      | m7     | 0, 3, 7, 10      |
| Sus2      | sus2   | 0, 2, 7          |
| Sus4      | sus4   | 0, 5, 7          |
| Dim       | °      | 0, 3, 6          |
| Aug       | +      | 0, 4, 8          |
| Min9      | m9     | 0, 3, 7, 10, 14  |
| Maj9      | maj9   | 0, 4, 7, 11, 14  |
| Add9      | add9   | 0, 4, 7, 14      |
| 6th       | 6      | 0, 4, 7, 9       |
| Min6      | m6     | 0, 3, 7, 9       |
| Dom9      | 9      | 0, 4, 7, 10, 14  |
| Half-Dim  | ø      | 0, 3, 6, 10      |
| Dim7      | °7     | 0, 3, 6, 9       |
| Min11     | m11    | 0, 3, 7, 10, 14, 17 |
| MinMaj7   | mMaj7  | 0, 3, 7, 11      |
| Power5    | 5      | 0, 7             |

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `flutter_riverpod` + `riverpod_annotation` | State management — `@Riverpod(keepAlive: true)` codegen Notifiers |
| `flutter_animate` | UI entrance animations, die shimmer |
| `flutter_midi_pro` ^3.1.6 | On-device SF2 soundfont playback via FluidSynth |
| `sensors_plus` | Accelerometer stream for shake-to-roll |
| `share_plus` + `path_provider` | MIDI export — write SMF to temp, share via OS sheet |
| `shared_preferences` | Persisted history, theme, shake + arpeggio settings |
| `vector_math` | 3D matrix math for `Dice3D` polyhedra rendering |
