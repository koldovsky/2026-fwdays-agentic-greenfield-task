import 'package:music_notes/music_notes.dart' as mn;

import 'chord_category.dart';

/// The 52 chord types supported by the app catalog.
///
/// Grouped by [ChordCategory] in declaration order. The 20 legacy enum names
/// (`major`, `minor`, `dom7`, `maj7`, `min7`, `sus2`, `sus4`, `dim`, `aug`,
/// `min9`, `maj9`, `add9`, `sixth`, `min6`, `dom9`, `halfDim`, `dim7`,
/// `min11`, `minMaj7`, `power5`) are preserved verbatim so existing persisted
/// roll history deserializes unchanged via [ChordType.values.byName].
///
/// The D20 chord die samples from a user-curated subset of 3–20 chord types
/// (see `lib/models/chord_selection.dart`); it does **not** sample from
/// [ChordType.values] directly. [kDefaultChordSelection] below is the
/// first-run default — the original 20 chords in their original order.
enum ChordType {
  // ─── Triads ────────────────────────────────────────────────────────────────
  major,
  minor,
  dim,
  aug,
  power5,

  // ─── Suspended ─────────────────────────────────────────────────────────────
  sus2,
  sus4,
  sus4Add9,

  // ─── Added-tone ────────────────────────────────────────────────────────────
  add9,
  add11,
  addSharp11,
  minAdd9,
  minAdd11,

  // ─── Sixths ────────────────────────────────────────────────────────────────
  sixth,
  min6,
  sixNine,
  minSixNine,

  // ─── Sevenths ──────────────────────────────────────────────────────────────
  maj7,
  min7,
  dom7,
  dim7,
  halfDim,
  minMaj7,
  augMaj7,
  aug7,
  dom7Sus4,
  dom7Sus2,

  // ─── Ninths ────────────────────────────────────────────────────────────────
  maj9,
  min9,
  dom9,
  dom7Flat9,
  dom7Sharp9,
  minMaj9,

  // ─── Elevenths ─────────────────────────────────────────────────────────────
  maj11,
  min11,
  dom11,
  dom7Sharp11,
  maj7Sharp11,

  // ─── Thirteenths ───────────────────────────────────────────────────────────
  maj13,
  min13,
  dom13,

  // ─── Altered Dominants ─────────────────────────────────────────────────────
  dom7Flat5,
  dom7Flat9Flat5,
  dom7Sharp9Flat5,
  dom7Flat9Sharp5,
  dom7Sharp9Sharp5,
  dom9Flat5,

  // ─── Hybrid / Misc ─────────────────────────────────────────────────────────
  sixSus4,
  sus2Sus4,
  dimMaj7,
  minAdd13,
  maj13Sharp11,
}

// ─── Consolidated metadata table ───────────────────────────────────────────
//
// Single source of truth for every [ChordType]. The `!` lookup in the
// extension getters below enforces at compile time that adding or removing an
// enum value forces a matching table edit — the same invariant previously
// spread across four parallel [Map]s, now expressed once.
//
// Fields:
//   display    — long name shown on the chord info card and reference screen.
//   symbol     — compact suffix appended to the root note (e.g. "Am7").
//   intervals  — semitone offsets from the root. Values > 11 reach into
//                higher octaves (14 = 9th, 17 = 11th, 21 = 13th).
//   faceLabel  — abbreviated label rendered on a D20 die face (≤ 6 chars).
//                Rendered through [Dice3D]; Unicode ♭/♯ shrink-fit alongside
//                ASCII characters.
//   category   — used by [ChordReferenceScreen] to group chords into
//                sectioned lists.

typedef _ChordMeta = ({
  String display,
  String symbol,
  List<int> intervals,
  String faceLabel,
  ChordCategory category,
});

const _chordMeta = <ChordType, _ChordMeta>{
  // ─── Triads ────────────────────────────────────────────────────────────────
  ChordType.major: (
    display: 'Major',
    symbol: '',
    intervals: [0, 4, 7],
    faceLabel: 'Maj',
    category: ChordCategory.triads,
  ),
  ChordType.minor: (
    display: 'Minor',
    symbol: 'm',
    intervals: [0, 3, 7],
    faceLabel: 'min',
    category: ChordCategory.triads,
  ),
  ChordType.dim: (
    display: 'Diminished',
    symbol: '°',
    intervals: [0, 3, 6],
    faceLabel: 'dim',
    category: ChordCategory.triads,
  ),
  ChordType.aug: (
    display: 'Augmented',
    symbol: '+',
    intervals: [0, 4, 8],
    faceLabel: 'aug',
    category: ChordCategory.triads,
  ),
  ChordType.power5: (
    display: 'Power 5',
    symbol: '5',
    intervals: [0, 7],
    faceLabel: '5',
    category: ChordCategory.triads,
  ),

  // ─── Suspended ─────────────────────────────────────────────────────────────
  ChordType.sus2: (
    display: 'Suspended 2',
    symbol: 'sus2',
    intervals: [0, 2, 7],
    faceLabel: 'sus2',
    category: ChordCategory.suspended,
  ),
  ChordType.sus4: (
    display: 'Suspended 4',
    symbol: 'sus4',
    intervals: [0, 5, 7],
    faceLabel: 'sus4',
    category: ChordCategory.suspended,
  ),
  ChordType.sus4Add9: (
    display: 'Sus4 add9',
    symbol: 'sus4(add9)',
    intervals: [0, 5, 7, 14],
    faceLabel: 's4+9',
    category: ChordCategory.suspended,
  ),

  // ─── Added-tone ────────────────────────────────────────────────────────────
  ChordType.add9: (
    display: 'Add 9',
    symbol: 'add9',
    intervals: [0, 4, 7, 14],
    faceLabel: '+9',
    category: ChordCategory.added,
  ),
  ChordType.add11: (
    display: 'Add 11',
    symbol: 'add11',
    intervals: [0, 4, 7, 17],
    faceLabel: '+11',
    category: ChordCategory.added,
  ),
  ChordType.addSharp11: (
    display: 'Add ♯11',
    symbol: 'add♯11',
    intervals: [0, 4, 7, 18],
    faceLabel: '+♯11',
    category: ChordCategory.added,
  ),
  ChordType.minAdd9: (
    display: 'Minor add 9',
    symbol: 'm(add9)',
    intervals: [0, 3, 7, 14],
    faceLabel: 'm+9',
    category: ChordCategory.added,
  ),
  ChordType.minAdd11: (
    display: 'Minor add 11',
    symbol: 'm(add11)',
    intervals: [0, 3, 7, 17],
    faceLabel: 'm+11',
    category: ChordCategory.added,
  ),

  // ─── Sixths ────────────────────────────────────────────────────────────────
  ChordType.sixth: (
    display: '6th',
    symbol: '6',
    intervals: [0, 4, 7, 9],
    faceLabel: '6',
    category: ChordCategory.sixths,
  ),
  ChordType.min6: (
    display: 'Minor 6',
    symbol: 'm6',
    intervals: [0, 3, 7, 9],
    faceLabel: 'm6',
    category: ChordCategory.sixths,
  ),
  ChordType.sixNine: (
    display: '6/9',
    symbol: '6/9',
    intervals: [0, 4, 7, 9, 14],
    faceLabel: '6/9',
    category: ChordCategory.sixths,
  ),
  ChordType.minSixNine: (
    display: 'Minor 6/9',
    symbol: 'm6/9',
    intervals: [0, 3, 7, 9, 14],
    faceLabel: 'm6/9',
    category: ChordCategory.sixths,
  ),

  // ─── Sevenths ──────────────────────────────────────────────────────────────
  ChordType.maj7: (
    display: 'Major 7',
    symbol: 'maj7',
    intervals: [0, 4, 7, 11],
    faceLabel: 'Maj7',
    category: ChordCategory.sevenths,
  ),
  ChordType.min7: (
    display: 'Minor 7',
    symbol: 'm7',
    intervals: [0, 3, 7, 10],
    faceLabel: 'm7',
    category: ChordCategory.sevenths,
  ),
  ChordType.dom7: (
    display: 'Dominant 7',
    symbol: '7',
    intervals: [0, 4, 7, 10],
    faceLabel: '7',
    category: ChordCategory.sevenths,
  ),
  ChordType.dim7: (
    display: 'Diminished 7',
    symbol: '°7',
    intervals: [0, 3, 6, 9],
    faceLabel: '°7',
    category: ChordCategory.sevenths,
  ),
  ChordType.halfDim: (
    display: 'Half-Diminished',
    symbol: 'ø',
    intervals: [0, 3, 6, 10],
    faceLabel: 'ø7',
    category: ChordCategory.sevenths,
  ),
  ChordType.minMaj7: (
    display: 'Minor Major 7',
    symbol: 'mMaj7',
    intervals: [0, 3, 7, 11],
    faceLabel: 'mM7',
    category: ChordCategory.sevenths,
  ),
  ChordType.augMaj7: (
    display: 'Augmented Major 7',
    symbol: '+maj7',
    intervals: [0, 4, 8, 11],
    faceLabel: '+M7',
    category: ChordCategory.sevenths,
  ),
  ChordType.aug7: (
    display: 'Augmented 7',
    symbol: '+7',
    intervals: [0, 4, 8, 10],
    faceLabel: '+7',
    category: ChordCategory.sevenths,
  ),
  ChordType.dom7Sus4: (
    display: '7 sus4',
    symbol: '7sus4',
    intervals: [0, 5, 7, 10],
    faceLabel: '7s4',
    category: ChordCategory.sevenths,
  ),
  ChordType.dom7Sus2: (
    display: '7 sus2',
    symbol: '7sus2',
    intervals: [0, 2, 7, 10],
    faceLabel: '7s2',
    category: ChordCategory.sevenths,
  ),

  // ─── Ninths ────────────────────────────────────────────────────────────────
  ChordType.maj9: (
    display: 'Major 9',
    symbol: 'maj9',
    intervals: [0, 4, 7, 11, 14],
    faceLabel: 'Maj9',
    category: ChordCategory.ninths,
  ),
  ChordType.min9: (
    display: 'Minor 9',
    symbol: 'm9',
    intervals: [0, 3, 7, 10, 14],
    faceLabel: 'm9',
    category: ChordCategory.ninths,
  ),
  ChordType.dom9: (
    display: 'Dominant 9',
    symbol: '9',
    intervals: [0, 4, 7, 10, 14],
    faceLabel: '9',
    category: ChordCategory.ninths,
  ),
  ChordType.dom7Flat9: (
    display: '7 ♭9',
    symbol: '7♭9',
    intervals: [0, 4, 7, 10, 13],
    faceLabel: '7♭9',
    category: ChordCategory.ninths,
  ),
  ChordType.dom7Sharp9: (
    display: '7 ♯9',
    symbol: '7♯9',
    intervals: [0, 4, 7, 10, 15],
    faceLabel: '7♯9',
    category: ChordCategory.ninths,
  ),
  ChordType.minMaj9: (
    display: 'Minor Major 9',
    symbol: 'mMaj9',
    intervals: [0, 3, 7, 11, 14],
    faceLabel: 'mM9',
    category: ChordCategory.ninths,
  ),

  // ─── Elevenths ─────────────────────────────────────────────────────────────
  ChordType.maj11: (
    display: 'Major 11',
    symbol: 'maj11',
    intervals: [0, 4, 7, 11, 14, 17],
    faceLabel: 'M11',
    category: ChordCategory.elevenths,
  ),
  ChordType.min11: (
    display: 'Minor 11',
    symbol: 'm11',
    intervals: [0, 3, 7, 10, 14, 17],
    faceLabel: 'm11',
    category: ChordCategory.elevenths,
  ),
  ChordType.dom11: (
    display: 'Dominant 11',
    symbol: '11',
    intervals: [0, 4, 7, 10, 14, 17],
    faceLabel: '11',
    category: ChordCategory.elevenths,
  ),
  ChordType.dom7Sharp11: (
    display: '7 ♯11',
    symbol: '7♯11',
    intervals: [0, 4, 7, 10, 14, 18],
    faceLabel: '7♯11',
    category: ChordCategory.elevenths,
  ),
  ChordType.maj7Sharp11: (
    display: 'Major 7 ♯11',
    symbol: 'maj7♯11',
    intervals: [0, 4, 7, 11, 14, 18],
    faceLabel: 'M7♯11',
    category: ChordCategory.elevenths,
  ),

  // ─── Thirteenths ───────────────────────────────────────────────────────────
  ChordType.maj13: (
    display: 'Major 13',
    symbol: 'maj13',
    intervals: [0, 4, 7, 11, 14, 17, 21],
    faceLabel: 'M13',
    category: ChordCategory.thirteenths,
  ),
  ChordType.min13: (
    display: 'Minor 13',
    symbol: 'm13',
    intervals: [0, 3, 7, 10, 14, 17, 21],
    faceLabel: 'm13',
    category: ChordCategory.thirteenths,
  ),
  ChordType.dom13: (
    display: 'Dominant 13',
    symbol: '13',
    intervals: [0, 4, 7, 10, 14, 17, 21],
    faceLabel: '13',
    category: ChordCategory.thirteenths,
  ),

  // ─── Altered Dominants ─────────────────────────────────────────────────────
  ChordType.dom7Flat5: (
    display: '7 ♭5',
    symbol: '7♭5',
    intervals: [0, 4, 6, 10],
    faceLabel: '7♭5',
    category: ChordCategory.alteredDominants,
  ),
  ChordType.dom7Flat9Flat5: (
    display: '7 ♭9 ♭5',
    symbol: '7♭9♭5',
    intervals: [0, 4, 6, 10, 13],
    faceLabel: '7♭9♭5',
    category: ChordCategory.alteredDominants,
  ),
  ChordType.dom7Sharp9Flat5: (
    display: '7 ♯9 ♭5',
    symbol: '7♯9♭5',
    intervals: [0, 4, 6, 10, 15],
    faceLabel: '7♯9♭5',
    category: ChordCategory.alteredDominants,
  ),
  ChordType.dom7Flat9Sharp5: (
    display: '7 ♭9 ♯5',
    symbol: '7♭9♯5',
    intervals: [0, 4, 8, 10, 13],
    faceLabel: '7♭9♯5',
    category: ChordCategory.alteredDominants,
  ),
  ChordType.dom7Sharp9Sharp5: (
    display: '7 ♯9 ♯5',
    symbol: '7♯9♯5',
    intervals: [0, 4, 8, 10, 15],
    faceLabel: '7♯9♯5',
    category: ChordCategory.alteredDominants,
  ),
  ChordType.dom9Flat5: (
    display: '9 ♭5',
    symbol: '9♭5',
    intervals: [0, 4, 6, 10, 14],
    faceLabel: '9♭5',
    category: ChordCategory.alteredDominants,
  ),

  // ─── Hybrid / Misc ─────────────────────────────────────────────────────────
  ChordType.sixSus4: (
    display: '6 sus4',
    symbol: '6sus4',
    intervals: [0, 5, 7, 9],
    faceLabel: '6s4',
    category: ChordCategory.hybrid,
  ),
  ChordType.sus2Sus4: (
    display: 'Sus2 sus4',
    symbol: 'sus2sus4',
    intervals: [0, 2, 5, 7],
    faceLabel: 's2s4',
    category: ChordCategory.hybrid,
  ),
  ChordType.dimMaj7: (
    display: 'Diminished Major 7',
    symbol: '°maj7',
    intervals: [0, 3, 6, 11],
    faceLabel: '°M7',
    category: ChordCategory.hybrid,
  ),
  ChordType.minAdd13: (
    display: 'Minor add 13',
    symbol: 'm(add13)',
    intervals: [0, 3, 7, 21],
    faceLabel: 'm+13',
    category: ChordCategory.hybrid,
  ),
  ChordType.maj13Sharp11: (
    display: 'Major 13 ♯11',
    symbol: 'maj13♯11',
    intervals: [0, 4, 7, 11, 14, 18, 21],
    faceLabel: 'M13♯11',
    category: ChordCategory.hybrid,
  ),
};

/// The first-run default active set used when no user selection has been
/// persisted yet. Lists the 20 chord types that shipped in the original
/// catalog, in their original order. The Chord Selection provider
/// (see `lib/providers/chord_selection_provider.dart`) uses this constant
/// as its initial `build()` value before prefs hydration completes, and
/// `DiceService.rollD20(activePool:)` falls back to it when the live pool
/// is null or empty.
const kDefaultChordSelection = <ChordType>[
  ChordType.major,
  ChordType.minor,
  ChordType.dom7,
  ChordType.maj7,
  ChordType.min7,
  ChordType.sus2,
  ChordType.sus4,
  ChordType.dim,
  ChordType.aug,
  ChordType.min9,
  ChordType.maj9,
  ChordType.add9,
  ChordType.sixth,
  ChordType.min6,
  ChordType.dom9,
  ChordType.halfDim,
  ChordType.dim7,
  ChordType.min11,
  ChordType.minMaj7,
  ChordType.power5,
];

/// Maps each distinct semitone offset used across the 52-chord catalog to the
/// corresponding [mn.Interval] constant. Keys cover simple intervals
/// {0,2,3,4,5,6,7,8,9,10,11} and extensions {13,14,15,17,18,21}.
const _intervalBySemitones = <int, mn.Interval>{
  0: mn.Interval.P1,
  2: mn.Interval.M2,
  3: mn.Interval.m3,
  4: mn.Interval.M3,
  5: mn.Interval.P4,
  6: mn.Interval.d5,
  7: mn.Interval.P5,
  8: mn.Interval.m6,
  9: mn.Interval.M6,
  10: mn.Interval.m7,
  11: mn.Interval.M7,
  13: mn.Interval.m9,
  14: mn.Interval.M9,
  15: mn.Interval.A9,
  17: mn.Interval.P11,
  18: mn.Interval.A11,
  21: mn.Interval.M13,
};

extension ChordTypeX on ChordType {
  /// Human-readable name shown on the chord info card.
  String get displayName => _chordMeta[this]!.display;

  /// Compact chord symbol appended to the root note name (e.g. "Am7").
  String get symbol => _chordMeta[this]!.symbol;

  /// Intervals from the root in semitones.
  List<int> get intervals => _chordMeta[this]!.intervals;

  /// Short label (≤ 6 chars) for rendering on the D20 die face.
  String get faceLabel => _chordMeta[this]!.faceLabel;

  /// Musical category, used by [ChordReferenceScreen] to group the catalog.
  ChordCategory get category => _chordMeta[this]!.category;

  /// Intervals of this chord as [mn.Interval] values, derived from [intervals].
  List<mn.Interval> get musicNotesIntervals =>
      intervals.map((i) => _intervalBySemitones[i]!).toList();
}
