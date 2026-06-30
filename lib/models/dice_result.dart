import 'note.dart';
import 'chord_type.dart';
import 'chord.dart';

/// Represents a single roll of both dice: a [Note] from the D12 and a
/// [ChordType] from the D20, stamped with the roll time.
class DiceResult {
  const DiceResult({
    required this.note,
    required this.chordType,
    required this.rolledAt,
  });

  final Note note;
  final ChordType chordType;
  final DateTime rolledAt;

  /// Derives the [Chord] from this roll result.
  Chord get chord => Chord(root: note, type: chordType);

  /// Serializes this result to a JSON-compatible map.
  ///
  /// Uses enum names (e.g. `"c"`, `"major"`) for [note] and [chordType].
  /// Name-based serialization is stable under reordering of enum values but
  /// fragile under renaming — renaming a value will corrupt persisted history
  /// that used the old name. [rolledAt] is stored as an ISO 8601 string.
  Map<String, dynamic> toJson() => {
        'note': note.name,
        'chordType': chordType.name,
        'rolledAt': rolledAt.toIso8601String(),
      };

  /// Deserializes a [DiceResult] from a JSON-compatible map produced by
  /// [toJson].
  ///
  /// Throws [ArgumentError] if [json['note']] or [json['chordType']] does
  /// not match any current enum value name — callers are responsible for
  /// catching this when loading persisted data that may predate a rename.
  factory DiceResult.fromJson(Map<String, dynamic> json) {
    return DiceResult(
      note: Note.values.byName(json['note'] as String),
      chordType: ChordType.values.byName(json['chordType'] as String),
      rolledAt: DateTime.parse(json['rolledAt'] as String),
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DiceResult &&
          other.note == note &&
          other.chordType == chordType &&
          other.rolledAt == rolledAt;

  @override
  int get hashCode => Object.hash(note, chordType, rolledAt);
}
