import 'package:music_notes/music_notes.dart' as mn;

import '../models/note.dart';
import '../models/notation_preference.dart';

// Input is assumed to be one of the 12 canonical sharp strings from
// NoteX.displayName; any other string is returned unchanged (defensive).
String formatNote(String canonical, NotationPreference preference) {
  if (preference == NotationPreference.sharps) return canonical;
  if (!canonical.contains('#')) {
    return canonical; // naturals + defensive unknowns
  }
  try {
    final mnNote = mn.Note.parse(_toUnicode(canonical));
    return _toAscii(mnNote.respellByAccidental(mn.Accidental.flat).toString());
  } catch (_) {
    return canonical; // defensive: unparseable → return as-is
  }
}

extension NoteFormatX on Note {
  String displayFor(NotationPreference preference) =>
      formatNote(displayName, preference);
}

String _toUnicode(String ascii) =>
    ascii.replaceAll('#', '\u266F').replaceAll('b', '\u266D');

String _toAscii(String unicode) =>
    unicode.replaceAll('\u266F', '#').replaceAll('\u266D', 'b');
