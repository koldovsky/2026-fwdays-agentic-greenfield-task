import 'note.dart';
import 'chord_type.dart';
import 'notation_preference.dart';
import '../utils/note_format.dart';

/// Represents a chord as the combination of a root [Note] and a [ChordType].
class Chord {
  const Chord({required this.root, required this.type});

  final Note root;
  final ChordType type;

  /// Full display name, e.g. "A Minor 7".
  String get name => '${root.displayName} ${type.displayName}';

  /// Compact chord symbol, e.g. "Am7".
  String get shortName => '${root.displayName}${type.symbol}';

  /// Note names (without octave) for every tone in the chord.
  List<String> get chordNotes => chordNotesWithOctave.map((p) => p.$1).toList();

  /// Note names paired with octave numbers for audio synthesis.
  List<(String note, int octave)> get chordNotesWithOctave {
    final rootPitch = root.mn.inOctave(3);
    return type.musicNotesIntervals.map((interval) {
      final pitch = rootPitch.transposeBy(interval);
      final noteName = NoteX.fromMn(pitch.note).displayName;
      return (noteName, pitch.octave);
    }).toList();
  }

  @override
  String toString() => name;

  @override
  bool operator ==(Object other) =>
      other is Chord && other.root == root && other.type == type;

  @override
  int get hashCode => Object.hash(root, type);
}

/// Notation-aware display helpers — wraps the sharp-only identity getters.
///
/// Use these for any user-facing text. The identity getters ([shortName],
/// [name], [chordNotes]) remain sharp-only for audio and MIDI purposes.
extension ChordDisplayX on Chord {
  String shortNameFor(NotationPreference pref) =>
      '${formatNote(root.displayName, pref)}${type.symbol}';

  String nameFor(NotationPreference pref) =>
      '${formatNote(root.displayName, pref)} ${type.displayName}';

  List<String> chordNotesFor(NotationPreference pref) =>
      chordNotes.map((n) => formatNote(n, pref)).toList();
}
