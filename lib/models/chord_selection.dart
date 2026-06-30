import 'chord_type.dart';

/// The user's active chord set — the 3 – 20 [ChordType] values actually
/// rolled by the D20 chord die.
///
/// Immutable. Cardinality invariant: [minCount] ≤ [active].length ≤ [maxCount].
/// Order matters — it determines face-to-chord assignment on the D20 die via
/// `faceIndex → active[faceIndex % active.length]`.
///
/// When the active set has fewer than 20 entries, the die's 20 physical faces
/// repeat labels cyclically. See [faceLabels].
class ChordSelection {
  const ChordSelection(this.active);

  /// Ordered list of active chord types. The die die-face order follows this
  /// order; reordering the list reshuffles the die's face assignment.
  final List<ChordType> active;

  /// Inclusive minimum number of active chords. Enforced by [ChordSelectionNotifier]
  /// (silently no-ops a toggle that would drop below this value).
  static const minCount = 3;

  /// Inclusive maximum number of active chords. Matches the D20 die face count.
  static const maxCount = 20;

  /// The 20 labels for the D20 die, built by cyclically repeating
  /// `active.map((c) => c.faceLabel)` until 20 entries are reached.
  ///
  /// Example for `active = [A, B, C]` (length 3):
  ///   `[A, B, C, A, B, C, A, B, C, A, B, C, A, B, C, A, B, C, A, B]`
  /// (face 0 → A, face 19 → B — 20 entries total, 7 A, 7 B, 6 C.)
  ///
  /// The roll itself samples uniformly from `active`; the cyclic mapping only
  /// affects which physical face the die settles on for visual variety.
  List<String> get faceLabels {
    if (active.isEmpty) return const [];
    final labels = active.map((c) => c.faceLabel).toList();
    if (labels.length >= maxCount) return labels.take(maxCount).toList();
    return List<String>.generate(
      maxCount,
      (i) => labels[i % labels.length],
    );
  }

  /// Same cyclic mapping as [faceLabels], but returns the resolved
  /// [ChordType] per face instead of the face label. Used by the settle-face
  /// picker when resolving which die face a rolled chord should land on.
  List<ChordType> get faceChordTypes {
    if (active.isEmpty) return const [];
    if (active.length >= maxCount) return active.take(maxCount).toList();
    return List<ChordType>.generate(
      maxCount,
      (i) => active[i % active.length],
    );
  }

  /// `true` if [type] is in the active set.
  bool isActive(ChordType type) => active.contains(type);

  /// Returns all 0–19 face indices that resolve to [type] via the cyclic
  /// mapping used by [faceChordTypes]. Empty if [type] is not in [active].
  List<int> facesFor(ChordType type) {
    if (active.isEmpty) return const [];
    final faces = faceChordTypes;
    final result = <int>[];
    for (var i = 0; i < faces.length; i++) {
      if (faces[i] == type) result.add(i);
    }
    return result;
  }

  /// First face index (0–19) that resolves to [type]. Returns `0` when
  /// [type] is not in [active]. Useful when a single stable face is
  /// required (history replay, post-settle snapping).
  int firstFaceFor(ChordType type) {
    final faces = facesFor(type);
    return faces.isEmpty ? 0 : faces.first;
  }

  /// Toggles [type]. Returns a new [ChordSelection] if the change respects the
  /// [minCount] / [maxCount] invariants, or `this` unchanged otherwise.
  ///
  /// New entries append at the end of the list.
  ChordSelection copyWithToggled(ChordType type) {
    if (active.contains(type)) {
      if (active.length <= minCount) return this;
      return ChordSelection(
        [...active]..remove(type),
      );
    }
    if (active.length >= maxCount) return this;
    return ChordSelection([...active, type]);
  }

  /// Replaces the entire active list. Caller is responsible for honoring
  /// the [minCount] – [maxCount] invariants. Primarily used for hydration
  /// from prefs and in tests; UI surfaces should prefer [copyWithToggled].
  ChordSelection copyWith({List<ChordType>? active}) =>
      ChordSelection(active ?? this.active);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    if (other is! ChordSelection) return false;
    if (other.active.length != active.length) return false;
    for (var i = 0; i < active.length; i++) {
      if (other.active[i] != active[i]) return false;
    }
    return true;
  }

  @override
  int get hashCode => Object.hashAll(active);

  @override
  String toString() =>
      'ChordSelection(${active.map((c) => c.name).join(', ')})';
}
