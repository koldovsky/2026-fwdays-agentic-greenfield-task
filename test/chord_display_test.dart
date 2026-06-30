import 'package:flutter_test/flutter_test.dart';

import 'package:chord_dice/models/chord.dart';
import 'package:chord_dice/models/chord_type.dart';
import 'package:chord_dice/models/note.dart';
import 'package:chord_dice/models/notation_preference.dart';

void main() {
  const sharps = NotationPreference.sharps;
  const flats = NotationPreference.flats;

  group('ChordDisplayX.shortNameFor', () {
    test('F# Major with flats → Gb', () {
      expect(
        Chord(root: Note.fSharp, type: ChordType.major).shortNameFor(flats),
        'Gb',
      );
    });

    test('F# Minor with flats → Gbm', () {
      expect(
        Chord(root: Note.fSharp, type: ChordType.minor).shortNameFor(flats),
        'Gbm',
      );
    });

    test('F# Minor 7 with sharps → F#m7 (identity round-trip)', () {
      expect(
        Chord(root: Note.fSharp, type: ChordType.min7).shortNameFor(sharps),
        'F#m7',
      );
    });
  });

  group('ChordDisplayX.chordNotesFor', () {
    test('B Major with flats → [B, Eb, Gb]', () {
      expect(
        Chord(root: Note.b, type: ChordType.major).chordNotesFor(flats),
        ['B', 'Eb', 'Gb'],
      );
    });

    test('A Minor with flats → [A, C, E] (no sharps — unchanged)', () {
      expect(
        Chord(root: Note.a, type: ChordType.minor).chordNotesFor(flats),
        ['A', 'C', 'E'],
      );
    });
  });

  group('ChordDisplayX.nameFor', () {
    test('C Major with flats → C Major (natural root — identical)', () {
      expect(
        Chord(root: Note.c, type: ChordType.major).nameFor(flats),
        'C Major',
      );
    });
  });
}
