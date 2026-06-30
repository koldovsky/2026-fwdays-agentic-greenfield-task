import 'package:flutter_test/flutter_test.dart';

import 'package:chord_dice/models/note.dart';
import 'package:chord_dice/models/chord_type.dart';
import 'package:chord_dice/models/chord.dart';

void main() {
  // ─── Note helper ────────────────────────────────────────────────────────────

  group('NoteX.fromSemitone', () {
    test('wraps correctly mod 12', () {
      expect(NoteX.fromSemitone(0), Note.c);
      expect(NoteX.fromSemitone(11), Note.b);
      expect(NoteX.fromSemitone(12), Note.c); // octave wrap
      expect(NoteX.fromSemitone(25), Note.cSharp); // 25 % 12 = 1
    });
  });

  // ─── Chord note computation ──────────────────────────────────────────────────

  group('Chord.chordNotes', () {
    test('A Minor = A C E', () {
      final chord = Chord(root: Note.a, type: ChordType.minor);
      expect(chord.chordNotes, ['A', 'C', 'E']);
    });

    test('C Major = C E G', () {
      final chord = Chord(root: Note.c, type: ChordType.major);
      expect(chord.chordNotes, ['C', 'E', 'G']);
    });

    test('C Dom7 = C E G A#', () {
      final chord = Chord(root: Note.c, type: ChordType.dom7);
      expect(chord.chordNotes, ['C', 'E', 'G', 'A#']);
    });

    test('B Major wraps correctly: B D# F#', () {
      final chord = Chord(root: Note.b, type: ChordType.major);
      expect(chord.chordNotes, ['B', 'D#', 'F#']);
    });

    test('F# Maj9 has 5 notes', () {
      final chord = Chord(root: Note.fSharp, type: ChordType.maj9);
      expect(chord.chordNotes.length, 5);
    });

    test('Power5 has exactly 2 notes', () {
      final chord = Chord(root: Note.a, type: ChordType.power5);
      expect(chord.chordNotes, ['A', 'E']);
    });

    test('C Minor 11 = C D# G A# D F', () {
      final chord = Chord(root: Note.c, type: ChordType.min11);
      expect(chord.chordNotes, ['C', 'D#', 'G', 'A#', 'D', 'F']);
    });

    test('A Minor 11 root lands correctly and includes the 11th', () {
      final chord = Chord(root: Note.a, type: ChordType.min11);
      // A m11 = A C E G B D (root, ♭3, 5, ♭7, 9, 11)
      expect(chord.chordNotes.first, 'A');
      expect(chord.chordNotes.last, 'D'); // 11th from A = D
    });

    test('Diminished 7 = equally-spaced minor thirds', () {
      final chord = Chord(root: Note.c, type: ChordType.dim7);
      expect(chord.chordNotes, ['C', 'D#', 'F#', 'A']);
    });
  });

  // ─── Chord notes with octave ─────────────────────────────────────────────────

  group('Chord.chordNotesWithOctave', () {
    test('C Major: C3 E3 G3 (all in octave 3)', () {
      final chord = Chord(root: Note.c, type: ChordType.major);
      final notes = chord.chordNotesWithOctave;
      expect(notes, [('C', 3), ('E', 3), ('G', 3)]);
    });

    test('B Major: root B3, then D#4 F#4 (cross-octave wrap)', () {
      final chord = Chord(root: Note.b, type: ChordType.major);
      final notes = chord.chordNotesWithOctave;
      // B = semitone 11; 11+0=11 → oct 3; 11+4=15 → oct 4; 11+7=18 → oct 4
      expect(notes[0], ('B', 3));
      expect(notes[1], ('D#', 4));
      expect(notes[2], ('F#', 4));
    });

    test('C Maj9 9th lands in octave 4', () {
      final chord = Chord(root: Note.c, type: ChordType.maj9);
      final notes = chord.chordNotesWithOctave;
      // interval 14: 0+14=14 → oct 4 (14~/12 = 1, so 3+1=4)
      final ninth = notes.last;
      expect(ninth.$1, 'D');
      expect(ninth.$2, 4);
    });

    test(
        'C Minor 11: 9th (interval 14) and 11th (interval 17) land in octave 4',
        () {
      final chord = Chord(root: Note.c, type: ChordType.min11);
      final notes = chord.chordNotesWithOctave;
      // C: semitone 0; interval 14 → 0+14=14; 3 + 14~/12 = 3+1 = 4; note: 14%12 = 2 → D
      // C: semitone 0; interval 17 → 0+17=17; 3 + 17~/12 = 3+1 = 4; note: 17%12 = 5 → F
      expect(notes.length, 6);
      expect(notes[4], ('D', 4)); // 9th
      expect(notes[5], ('F', 4)); // 11th
    });
  });

  // ─── Chord identity ──────────────────────────────────────────────────────────

  group('Chord equality and names', () {
    test('same root+type are equal', () {
      final a = Chord(root: Note.a, type: ChordType.minor);
      final b = Chord(root: Note.a, type: ChordType.minor);
      expect(a, equals(b));
      expect(a.hashCode, b.hashCode);
    });

    test('shortName is compact', () {
      expect(
        Chord(root: Note.a, type: ChordType.min7).shortName,
        'Am7',
      );
      expect(
        Chord(root: Note.c, type: ChordType.major).shortName,
        'C',
      );
    });

    test('name is full human-readable', () {
      expect(
        Chord(root: Note.fSharp, type: ChordType.halfDim).name,
        'F# Half-Diminished',
      );
    });
  });

  // ─── Extended catalog coverage — representative chord per category ──────────

  group('Catalog: suspended / added-tone / sixths', () {
    test('C sus4Add9 = C F G D', () {
      final chord = Chord(root: Note.c, type: ChordType.sus4Add9);
      expect(chord.chordNotes, ['C', 'F', 'G', 'D']);
    });

    test('C addSharp11 = C E G F#', () {
      final chord = Chord(root: Note.c, type: ChordType.addSharp11);
      expect(chord.chordNotes, ['C', 'E', 'G', 'F#']);
    });

    test('C minAdd9 = C D# G D', () {
      final chord = Chord(root: Note.c, type: ChordType.minAdd9);
      expect(chord.chordNotes, ['C', 'D#', 'G', 'D']);
    });

    test('C sixNine (6/9) = C E G A D', () {
      final chord = Chord(root: Note.c, type: ChordType.sixNine);
      expect(chord.chordNotes, ['C', 'E', 'G', 'A', 'D']);
    });

    test('C minSixNine = C D# G A D', () {
      final chord = Chord(root: Note.c, type: ChordType.minSixNine);
      expect(chord.chordNotes, ['C', 'D#', 'G', 'A', 'D']);
    });
  });

  group('Catalog: sevenths — new additions', () {
    test('C augMaj7 = C E G# B', () {
      final chord = Chord(root: Note.c, type: ChordType.augMaj7);
      expect(chord.chordNotes, ['C', 'E', 'G#', 'B']);
    });

    test('C aug7 = C E G# A#', () {
      final chord = Chord(root: Note.c, type: ChordType.aug7);
      expect(chord.chordNotes, ['C', 'E', 'G#', 'A#']);
    });

    test('C dom7Sus4 = C F G A#', () {
      final chord = Chord(root: Note.c, type: ChordType.dom7Sus4);
      expect(chord.chordNotes, ['C', 'F', 'G', 'A#']);
    });

    test('C dom7Sus2 = C D G A#', () {
      final chord = Chord(root: Note.c, type: ChordType.dom7Sus2);
      expect(chord.chordNotes, ['C', 'D', 'G', 'A#']);
    });
  });

  group('Catalog: altered ninths (semitones 13 and 15)', () {
    test('C dom7Flat9 = C E G A# C# (interval 13 = m9)', () {
      final chord = Chord(root: Note.c, type: ChordType.dom7Flat9);
      expect(chord.chordNotes, ['C', 'E', 'G', 'A#', 'C#']);
    });

    test('C dom7Sharp9 = C E G A# D# (interval 15 = A9)', () {
      final chord = Chord(root: Note.c, type: ChordType.dom7Sharp9);
      expect(chord.chordNotes, ['C', 'E', 'G', 'A#', 'D#']);
    });

    test('C minMaj9 = C D# G B D', () {
      final chord = Chord(root: Note.c, type: ChordType.minMaj9);
      expect(chord.chordNotes, ['C', 'D#', 'G', 'B', 'D']);
    });
  });

  group('Catalog: elevenths — semitone 18 = A11', () {
    test('C maj11 = C E G B D F', () {
      final chord = Chord(root: Note.c, type: ChordType.maj11);
      expect(chord.chordNotes, ['C', 'E', 'G', 'B', 'D', 'F']);
    });

    test('C dom11 = C E G A# D F', () {
      final chord = Chord(root: Note.c, type: ChordType.dom11);
      expect(chord.chordNotes, ['C', 'E', 'G', 'A#', 'D', 'F']);
    });

    test('C dom7Sharp11 contains F# (A11)', () {
      final chord = Chord(root: Note.c, type: ChordType.dom7Sharp11);
      expect(chord.chordNotes.contains('F#'), true);
      expect(chord.chordNotes.contains('F'), false);
    });

    test('C maj7Sharp11 = C E G B D F#', () {
      final chord = Chord(root: Note.c, type: ChordType.maj7Sharp11);
      expect(chord.chordNotes, ['C', 'E', 'G', 'B', 'D', 'F#']);
    });
  });

  group('Catalog: thirteenths — semitone 21 = M13', () {
    test('C maj13 last note is A (M13 lands on semitone 9)', () {
      final chord = Chord(root: Note.c, type: ChordType.maj13);
      expect(chord.chordNotes.length, 7);
      expect(chord.chordNotes.last, 'A');
    });

    test('C min13 last note is A and includes both ♭7 and 11', () {
      final chord = Chord(root: Note.c, type: ChordType.min13);
      expect(chord.chordNotes.last, 'A');
      expect(chord.chordNotes.contains('A#'), true); // ♭7
      expect(chord.chordNotes.contains('F'), true); // 11
    });

    test('C dom13 = C E G A# D F A', () {
      final chord = Chord(root: Note.c, type: ChordType.dom13);
      expect(chord.chordNotes, ['C', 'E', 'G', 'A#', 'D', 'F', 'A']);
    });
  });

  group('Catalog: altered dominants', () {
    test('C dom7Flat5 = C E F# A#', () {
      final chord = Chord(root: Note.c, type: ChordType.dom7Flat5);
      expect(chord.chordNotes, ['C', 'E', 'F#', 'A#']);
    });

    test('C dom7Flat9Flat5 = C E F# A# C#', () {
      final chord = Chord(root: Note.c, type: ChordType.dom7Flat9Flat5);
      expect(chord.chordNotes, ['C', 'E', 'F#', 'A#', 'C#']);
    });

    test('C dom7Sharp9Sharp5 = C E G# A# D#', () {
      final chord = Chord(root: Note.c, type: ChordType.dom7Sharp9Sharp5);
      expect(chord.chordNotes, ['C', 'E', 'G#', 'A#', 'D#']);
    });

    test('C dom9Flat5 = C E F# A# D', () {
      final chord = Chord(root: Note.c, type: ChordType.dom9Flat5);
      expect(chord.chordNotes, ['C', 'E', 'F#', 'A#', 'D']);
    });
  });

  group('Catalog: hybrid / misc', () {
    test('C sixSus4 = C F G A', () {
      final chord = Chord(root: Note.c, type: ChordType.sixSus4);
      expect(chord.chordNotes, ['C', 'F', 'G', 'A']);
    });

    test('C sus2Sus4 = C D F G', () {
      final chord = Chord(root: Note.c, type: ChordType.sus2Sus4);
      expect(chord.chordNotes, ['C', 'D', 'F', 'G']);
    });

    test('C dimMaj7 = C D# F# B', () {
      final chord = Chord(root: Note.c, type: ChordType.dimMaj7);
      expect(chord.chordNotes, ['C', 'D#', 'F#', 'B']);
    });

    test('C minAdd13 = C D# G A (21 → M6 in next octave)', () {
      final chord = Chord(root: Note.c, type: ChordType.minAdd13);
      expect(chord.chordNotes, ['C', 'D#', 'G', 'A']);
    });

    test('C maj13Sharp11 last note is A, contains F#', () {
      final chord = Chord(root: Note.c, type: ChordType.maj13Sharp11);
      expect(chord.chordNotes.last, 'A');
      expect(chord.chordNotes.contains('F#'), true);
    });
  });

  // ─── All chord types have correct interval counts ────────────────────────────

  group('ChordType intervals', () {
    test('all 52 chord types have at least 2 intervals', () {
      for (final type in ChordType.values) {
        expect(
          type.intervals.length,
          greaterThanOrEqualTo(2),
          reason: '${type.name} must have at least 2 intervals',
        );
        // Root interval must always be 0
        expect(
          type.intervals.first,
          0,
          reason: '${type.name} first interval must be 0 (root)',
        );
      }
    });

    test('exactly 52 chord types defined', () {
      expect(ChordType.values.length, 52);
    });

    test('exactly 12 notes defined', () {
      expect(Note.values.length, 12);
    });

    test('all 20 legacy chord names still exist (history back-compat)', () {
      const legacy = [
        'major', 'minor', 'dom7', 'maj7', 'min7', 'sus2', 'sus4', 'dim', //
        'aug', 'min9', 'maj9', 'add9', 'sixth', 'min6', 'dom9', 'halfDim', //
        'dim7', 'min11', 'minMaj7', 'power5',
      ];
      final names = ChordType.values.map((c) => c.name).toSet();
      for (final n in legacy) {
        expect(names.contains(n), true,
            reason: 'legacy chord name "$n" is missing from ChordType');
      }
    });
  });

  // ─── Face-label regression guard ─────────────────────────────────────────────

  group('ChordType.faceLabel', () {
    test('every chord type has a label ≤ 6 chars and non-empty', () {
      for (final c in ChordType.values) {
        expect(c.faceLabel.isNotEmpty, true,
            reason: '${c.name} has an empty face label');
        expect(c.faceLabel.length <= 6, true,
            reason: '${c.name} face label "${c.faceLabel}" exceeds 6 chars');
      }
    });

    test('face labels are distinct', () {
      final labels = ChordType.values.map((c) => c.faceLabel).toList();
      expect(labels.toSet().length, labels.length,
          reason: 'duplicate face labels detected: $labels');
    });
  });
}
