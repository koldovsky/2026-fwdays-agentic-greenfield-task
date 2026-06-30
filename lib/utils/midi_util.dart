import 'package:music_notes/music_notes.dart' as mn;

final _midiAnchor = mn.Pitch.parse('C-1'); // MIDI 0

/// Converts a `music_notes.Pitch` to a MIDI note number.
///
/// Standard MIDI: middle C (C4) = 60, A4 = 69.
int pitchToMidi(mn.Pitch pitch) => _midiAnchor.difference(pitch);

/// Converts an ASCII note name + octave to a MIDI note number.
///
/// Preserves the pre-migration signature for AudioService / MidiExportService.
int noteToMidi(String noteName, int octave) {
  final pitch = mn.Note.parse(_toUnicode(noteName)).inOctave(octave);
  return pitchToMidi(pitch);
}

String _toUnicode(String ascii) =>
    ascii.replaceAll('#', '\u266F').replaceAll('b', '\u266D');
