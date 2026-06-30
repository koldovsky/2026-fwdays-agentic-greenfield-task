/// Duration of a single dice-roll animation. Shared between
/// [DiceStage]'s AnimationController and [DiceNotifier]'s watchdog
/// so the two can never drift.
const kRollAnimationDuration = Duration(milliseconds: 1100);

/// Grace period after [kRollAnimationDuration] before the provider's
/// watchdog self-fires [DiceNotifier.settleRoll] — covers the case
/// where [DiceStage] is unmounted mid-roll before its `onSettled`
/// callback can run.
const kRollWatchdogGrace = Duration(milliseconds: 400);

/// Reserved height for the ChordInfoCard zone. Measured to fit the tallest
/// plausible card content (long chord names, wrapped note pills on 5+ note
/// chords like "C# Diminished 7th").
const kChordInfoCardHeight = 130.0;

/// Inter-note delay for arpeggio playback — 1/16 note at 80 BPM.
const kArpNoteInterval = Duration(milliseconds: 187);

/// Number of pattern cycles played per arpeggio invocation.
const kArpCycles = 2;

/// BPM used when exporting chord history to a MIDI file.
const kMidiExportBpm = 120;

/// MIDI note velocity used for exported chord notes.
const kMidiExportVelocity = 80;

/// Maximum height of the chord-selection list in the MIDI export picker sheet.
const kMidiPickerMaxHeight = 320.0;

/// Shake magnitude thresholds (m/s² above gravity) — requires firmer shake at higher values.
const kShakeThresholdLow = 25.0;
const kShakeThresholdMedium = 18.0;
const kShakeThresholdHigh = 12.0;

/// Minimum time between shake emissions from the detector — prevents a single
/// continuous shake from firing dozens of events. Independent of the rolling-state gate.
const kShakeMinIntervalBetweenEvents = Duration(milliseconds: 500);
