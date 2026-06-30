import 'package:music_notes/music_notes.dart' as mns;

/// The 12 chromatic notes in ascending semitone order.
/// The enum index directly equals the note's semitone value (C=0 … B=11).
enum Note { c, cSharp, d, dSharp, e, f, fSharp, g, gSharp, a, aSharp, b }

extension NoteX on Note {
  static const _names = [
    'C',
    'C#',
    'D',
    'D#',
    'E',
    'F',
    'F#',
    'G',
    'G#',
    'A',
    'A#',
    'B',
  ];

  String get displayName => _names[index];

  /// Semitone value (0–11), identical to enum index — exposed for clarity.
  int get semitone => index;

  /// Wraps any semitone value (including values > 11) back into a valid Note.
  static Note fromSemitone(int s) => Note.values[s % 12];

  /// The two circle-of-fifths neighbors: `[fifth up, fifth down]`.
  /// Example: C → [G, F], G → [D, C], F# → [C#, B].
  List<Note> get fifthNeighbors {
    final up = mn.transposeBy(mns.Interval.P5);
    final down = mn.transposeBy(-mns.Interval.P5);
    return [NoteX.fromMn(up), NoteX.fromMn(down)];
  }

  /// Converts this note to its [mns.Note] equivalent.
  ///
  /// The getter is named `mn` so call sites read `root.mn.inOctave(3)`.
  /// The local import alias is `mns` to avoid shadowing this getter name
  /// inside the extension body.
  mns.Note get mn => switch (this) {
        Note.c => mns.Note.c,
        Note.cSharp => mns.Note.c.sharp,
        Note.d => mns.Note.d,
        Note.dSharp => mns.Note.d.sharp,
        Note.e => mns.Note.e,
        Note.f => mns.Note.f,
        Note.fSharp => mns.Note.f.sharp,
        Note.g => mns.Note.g,
        Note.gSharp => mns.Note.g.sharp,
        Note.a => mns.Note.a,
        Note.aSharp => mns.Note.a.sharp,
        Note.b => mns.Note.b,
      };

  /// Converts a [mns.Note] back to our [Note] enum via its semitone value.
  ///
  /// Works for any accidental spelling (naturals, sharps, flats, enharmonics).
  /// `+12) % 12` guards against negative semitones from flat/double-flat notes.
  static Note fromMn(mns.Note note) =>
      Note.values[((note.semitones % 12) + 12) % 12];
}
