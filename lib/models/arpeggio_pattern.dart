// ─── ArpeggioPattern ─────────────────────────────────────────────────────────

/// The 13 arpeggio traversal patterns for sequential chord playback.
///
/// Each pattern describes how to traverse a sorted (low-to-high) note list
/// for one cycle. Two cycles are played in sequence by [AudioService.playArpeggio].
enum ArpeggioPattern {
  up,
  down,
  upDown,
  downUp,
  upAndDown,
  downAndUp,
  converge,
  diverge,
  conAndDiverge,
  pinkyUp,
  pinkyUpDown,
  thumbUp,
  thumbUpDown,
}

// ─── Consolidated metadata table ──────────────────────────────────────────────
//
// Single source of truth for every [ArpeggioPattern]. The `!` lookup in the
// extension getters enforces at compile time that adding or removing an enum
// value forces a matching table edit — same invariant as [_chordMeta] and
// [_notationMeta].

typedef _ArpMeta = ({String displayName, String description});

const _arpMeta = <ArpeggioPattern, _ArpMeta>{
  ArpeggioPattern.up: (
    displayName: 'Up',
    description: 'Ascends from lowest to highest note',
  ),
  ArpeggioPattern.down: (
    displayName: 'Down',
    description: 'Descends from highest to lowest note',
  ),
  ArpeggioPattern.upDown: (
    displayName: 'Up-Down',
    description: 'Ascends then descends, endpoints played once',
  ),
  ArpeggioPattern.downUp: (
    displayName: 'Down-Up',
    description: 'Descends then ascends, endpoints played once',
  ),
  ArpeggioPattern.upAndDown: (
    displayName: 'Up & Down',
    description: 'Ascends then descends, endpoints repeated',
  ),
  ArpeggioPattern.downAndUp: (
    displayName: 'Down & Up',
    description: 'Descends then ascends, endpoints repeated',
  ),
  ArpeggioPattern.converge: (
    displayName: 'Converge',
    description: 'Alternates outer notes inward toward the center',
  ),
  ArpeggioPattern.diverge: (
    displayName: 'Diverge',
    description: 'Alternates inner notes outward from the center',
  ),
  ArpeggioPattern.conAndDiverge: (
    displayName: 'Con & Diverge',
    description: 'Converges to center then diverges outward',
  ),
  ArpeggioPattern.pinkyUp: (
    displayName: 'Pinky Up',
    description: 'Highest note first, then ascending from the bottom',
  ),
  ArpeggioPattern.pinkyUpDown: (
    displayName: 'Pinky Up-Down',
    description: 'Highest note, up from bottom, then down',
  ),
  ArpeggioPattern.thumbUp: (
    displayName: 'Thumb Up',
    description: 'Lowest note first, then ascending from the second note',
  ),
  ArpeggioPattern.thumbUpDown: (
    displayName: 'Thumb Up-Down',
    description: 'Lowest note, up from second, then down',
  ),
};

// ─── Extension ────────────────────────────────────────────────────────────────

/// Typed accessors and sequence generation for [ArpeggioPattern].
extension ArpeggioPatternX on ArpeggioPattern {
  /// Human-readable label shown in the settings pattern picker.
  String get displayName => _arpMeta[this]!.displayName;

  /// One-line description of the traversal behaviour.
  String get description => _arpMeta[this]!.description;

  /// Returns the ordered note sequence for **one cycle** of this pattern.
  ///
  /// [notes] must be sorted low-to-high (as returned by
  /// [Chord.chordNotesWithOctave]). Generic so it works with any note
  /// representation ([String], `(String, int)` record, [int], etc.).
  ///
  /// Edge cases:
  /// - 1-element list: always returns `[notes[0]]`.
  /// - 2-element list: all patterns degrade gracefully (no crashes).
  List<T> sequence<T>(List<T> notes) {
    if (notes.isEmpty) return [];
    if (notes.length == 1) return List<T>.from(notes);

    switch (this) {
      // ── Simple linear patterns ───────────────────────────────────────────

      case ArpeggioPattern.up:
        // [C, E, G] → [C, E, G]
        return List<T>.from(notes);

      case ArpeggioPattern.down:
        // [C, E, G] → [G, E, C]
        return notes.reversed.toList();

      // ── Bounce patterns (endpoints NOT repeated) ─────────────────────────

      case ArpeggioPattern.upDown:
        // [C, E, G] → [C, E, G, E]   (top not repeated at junction)
        final ascending = List<T>.from(notes);
        final descending = notes.reversed.skip(1).toList();
        return [...ascending, ...descending.take(descending.length - 1)];

      case ArpeggioPattern.downUp:
        // [C, E, G] → [G, E, C, E]   (bottom not repeated at junction)
        final descending = notes.reversed.toList();
        final ascending = notes.skip(1).toList();
        return [...descending, ...ascending.take(ascending.length - 1)];

      // ── Bounce patterns (endpoints ARE repeated) ─────────────────────────

      case ArpeggioPattern.upAndDown:
        // [C, E, G] → [C, E, G, G, E, C]   (top repeated; bottom repeated
        //              at cycle boundary when two cycles are concatenated)
        final ascending = List<T>.from(notes);
        final descending = notes.reversed.toList();
        return [...ascending, ...descending];

      case ArpeggioPattern.downAndUp:
        // [C, E, G] → [G, E, C, C, E, G]   (bottom repeated; top repeated
        //              at cycle boundary when two cycles are concatenated)
        final descending = notes.reversed.toList();
        final ascending = List<T>.from(notes);
        return [...descending, ...ascending];

      // ── Convergent / divergent patterns ──────────────────────────────────

      case ArpeggioPattern.converge:
        // Alternate outermost remaining notes inward.
        // [C, E, G, B] → [C, B, E, G]
        // [C, E, G]    → [C, G, E]
        return _converge(notes);

      case ArpeggioPattern.diverge:
        // Alternate innermost remaining notes outward.
        // [C, E, G, B] → [E, G, C, B]   (inner pair first, then outer)
        // [C, E, G]    → [E, C, G]
        return _diverge(notes);

      case ArpeggioPattern.conAndDiverge:
        // Converge to centre then diverge back out.
        // For odd lengths the centre note is played once (shared).
        return [
          ..._converge(notes),
          ..._diverge(notes).skip(notes.length.isOdd ? 1 : 0)
        ];

      // ── Guitar-style patterns (anchor note + sweep) ──────────────────────

      case ArpeggioPattern.pinkyUp:
        // Highest note first, then sweep upward from the lowest.
        // [C, E, G] → [G, C, E, G]
        final highest = notes.last;
        return [highest, ...notes];

      case ArpeggioPattern.pinkyUpDown:
        // Highest, up from lowest, then back down (endpoints not repeated).
        // [C, E, G] → [G, C, E, G, E, C]
        final highest = notes.last;
        final up = List<T>.from(notes);
        final down =
            notes.reversed.skip(1).toList().take(notes.length - 1).toList();
        return [highest, ...up, ...down];

      case ArpeggioPattern.thumbUp:
        // Lowest note first, then sweep upward from the second note.
        // [C, E, G] → [C, E, G, C]   (lowest anchors the start)
        final lowest = notes.first;
        return [...notes, lowest];

      case ArpeggioPattern.thumbUpDown:
        // Lowest, up from second note, then back down (endpoints not repeated).
        // [C, E, G] → [C, E, G, E, C]
        final lowest = notes.first;
        final up = notes.skip(1).toList();
        final down = notes.reversed.skip(1).toList();
        return [lowest, ...up, ...down];
    }
  }
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/// Alternate picking outermost remaining notes, left-first (low first).
/// [C, E, G, B] → [C, B, E, G]
List<T> _converge<T>(List<T> notes) {
  final result = <T>[];
  var lo = 0;
  var hi = notes.length - 1;
  while (lo <= hi) {
    if (lo == hi) {
      result.add(notes[lo]);
    } else {
      result
        ..add(notes[lo])
        ..add(notes[hi]);
    }
    lo++;
    hi--;
  }
  return result;
}

/// Alternate picking innermost remaining notes, outward.
/// [C, E, G, B] → [E, G, C, B]
List<T> _diverge<T>(List<T> notes) {
  final mid = notes.length ~/ 2;
  // Build two halves: left half reversed (inner→outer low), right half (inner→outer high).
  final leftHalf = notes.sublist(0, mid).reversed.toList();
  final rightHalf = notes.sublist(mid);

  final result = <T>[];
  final maxLen =
      leftHalf.length > rightHalf.length ? leftHalf.length : rightHalf.length;
  for (var i = 0; i < maxLen; i++) {
    if (i < rightHalf.length) result.add(rightHalf[i]);
    if (i < leftHalf.length) result.add(leftHalf[i]);
  }
  return result;
}
