import 'package:flutter_test/flutter_test.dart';

import 'package:chord_dice/models/note.dart';
import 'package:chord_dice/models/notation_preference.dart';
import 'package:chord_dice/utils/note_format.dart';

void main() {
  group('formatNote — flats preference', () {
    test("C# → Db",
        () => expect(formatNote('C#', NotationPreference.flats), 'Db'));
    test("D# → Eb",
        () => expect(formatNote('D#', NotationPreference.flats), 'Eb'));
    test("F# → Gb",
        () => expect(formatNote('F#', NotationPreference.flats), 'Gb'));
    test("G# → Ab",
        () => expect(formatNote('G#', NotationPreference.flats), 'Ab'));
    test("A# → Bb",
        () => expect(formatNote('A#', NotationPreference.flats), 'Bb'));
  });

  group('formatNote — sharps preference (identity)', () {
    test("C# round-trips",
        () => expect(formatNote('C#', NotationPreference.sharps), 'C#'));
    test("D# round-trips",
        () => expect(formatNote('D#', NotationPreference.sharps), 'D#'));
    test("F# round-trips",
        () => expect(formatNote('F#', NotationPreference.sharps), 'F#'));
    test("G# round-trips",
        () => expect(formatNote('G#', NotationPreference.sharps), 'G#'));
    test("A# round-trips",
        () => expect(formatNote('A#', NotationPreference.sharps), 'A#'));
  });

  group('formatNote — natural notes unchanged', () {
    for (final n in ['C', 'D', 'E', 'F', 'G', 'A', 'B']) {
      test('$n unchanged under flats',
          () => expect(formatNote(n, NotationPreference.flats), n));
      test('$n unchanged under sharps',
          () => expect(formatNote(n, NotationPreference.sharps), n));
    }
  });

  group('formatNote — defensive: unknown string returned as-is', () {
    test(
        'unknown under flats',
        () =>
            expect(formatNote('unknown', NotationPreference.flats), 'unknown'));
    test(
        'unknown under sharps',
        () => expect(
            formatNote('unknown', NotationPreference.sharps), 'unknown'));
  });

  group('NoteFormatX.displayFor', () {
    test('F# → Gb under flats',
        () => expect(Note.fSharp.displayFor(NotationPreference.flats), 'Gb'));
    test('F# → F# under sharps',
        () => expect(Note.fSharp.displayFor(NotationPreference.sharps), 'F#'));
    test('C → C under both preferences', () {
      expect(Note.c.displayFor(NotationPreference.flats), 'C');
      expect(Note.c.displayFor(NotationPreference.sharps), 'C');
    });
  });
}
