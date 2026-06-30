import 'dart:math';

import 'package:flutter_test/flutter_test.dart';

import 'package:chord_dice/models/chord_type.dart';
import 'package:chord_dice/models/note.dart';
import 'package:chord_dice/services/dice_service.dart';

void main() {
  group('NoteX.fifthNeighbors', () {
    test('C neighbors are G (fifth up) and F (fifth down)', () {
      expect(Note.c.fifthNeighbors, equals([Note.g, Note.f]));
    });

    test('G neighbors are D and C', () {
      expect(Note.g.fifthNeighbors, equals([Note.d, Note.c]));
    });

    test('F# neighbors are C# and B', () {
      expect(Note.fSharp.fifthNeighbors, equals([Note.cSharp, Note.b]));
    });

    test('B neighbors are F# and E', () {
      expect(Note.b.fifthNeighbors, equals([Note.fSharp, Note.e]));
    });

    test('each note returns exactly 2 neighbors', () {
      for (final note in Note.values) {
        expect(note.fifthNeighbors.length, equals(2),
            reason: '${note.displayName} should have 2 neighbors');
      }
    });

    test('neighbors wrap correctly at chromatic boundaries (Ab)', () {
      // Ab semitone=8. Fifth up: (8+7)%12=3=D#. Fifth down: (8+5)%12=1=C#
      expect(Note.gSharp.fifthNeighbors, equals([Note.dSharp, Note.cSharp]));
    });
  });

  group('DiceService.rollD12Biased', () {
    test('null lastNote returns a valid Note (first-roll fallback)', () {
      final service = DiceService(random: Random(0));
      final result = service.rollD12Biased(null);
      expect(Note.values, contains(result));
    });

    test('seeded regression: pool has 14 slots and draws deterministically',
        () {
      // Build the expected pool the same way the implementation does,
      // then draw from it with the same seed — this locks in correct pool construction.
      const lastNote = Note.c;
      final pool = [...Note.values, ...lastNote.fifthNeighbors];
      expect(pool.length, equals(14)); // sanity: 12 + 2 neighbors
      final expectedIndex = Random(42).nextInt(14);
      final expected = pool[expectedIndex];

      final service = DiceService(random: Random(42));
      expect(service.rollD12Biased(lastNote), equals(expected));
    });

    test('statistical bias: neighbors appear ~2x as often as non-neighbors',
        () {
      // 10,000 rolls from C. Neighbors are G and F; non-neighbor sample is F#.
      // Expected: G ≈ 2/14 × 10000 ≈ 1428, F# ≈ 1/14 × 10000 ≈ 714.
      // Accept anything in [1.8×, 2.2×] ratio to account for variance.
      final service = DiceService(random: Random(0));
      final counts = <Note, int>{for (final n in Note.values) n: 0};
      for (var i = 0; i < 10000; i++) {
        final note = service.rollD12Biased(Note.c);
        counts[note] = counts[note]! + 1;
      }
      final gCount = counts[Note.g]!;
      final fCount = counts[Note.f]!;
      final fSharpCount = counts[Note.fSharp]!;

      // Both neighbors must appear more than non-neighbors.
      expect(gCount, greaterThan(fSharpCount),
          reason:
              'G (neighbor) should appear more often than F# (non-neighbor)');
      expect(fCount, greaterThan(fSharpCount),
          reason:
              'F (neighbor) should appear more often than F# (non-neighbor)');

      // Ratio must be in [1.8, 2.2] window.
      final gRatio = gCount / fSharpCount;
      final fRatio = fCount / fSharpCount;
      expect(gRatio, inInclusiveRange(1.8, 2.2),
          reason: 'G/F# ratio was $gRatio, expected ~2.0');
      expect(fRatio, inInclusiveRange(1.8, 2.2),
          reason: 'F/F# ratio was $fRatio, expected ~2.0');
    });
  });

  group('DiceService.rollD20 with activePool', () {
    test('null activePool falls back to kDefaultChordSelection', () {
      final service = DiceService(random: Random(0));
      final result = service.rollD20();
      expect(kDefaultChordSelection, contains(result));
    });

    test('empty activePool falls back to kDefaultChordSelection', () {
      final service = DiceService(random: Random(0));
      final result = service.rollD20(activePool: const []);
      expect(kDefaultChordSelection, contains(result));
    });

    test('3-chord pool only rolls chords from that pool', () {
      final service = DiceService(random: Random(0));
      const pool = [ChordType.major, ChordType.minor, ChordType.power5];
      for (var i = 0; i < 100; i++) {
        expect(pool, contains(service.rollD20(activePool: pool)));
      }
    });

    test('single-chord pool always rolls that chord', () {
      final service = DiceService(random: Random(0));
      const pool = [ChordType.maj13];
      for (var i = 0; i < 10; i++) {
        expect(service.rollD20(activePool: pool), ChordType.maj13);
      }
    });

    test(
        'statistical coverage: 5-chord pool hits every chord within 1000 rolls',
        () {
      final service = DiceService(random: Random(0));
      const pool = [
        ChordType.major,
        ChordType.minor,
        ChordType.dom7,
        ChordType.maj7,
        ChordType.min7,
      ];
      final seen = <ChordType>{};
      for (var i = 0; i < 1000; i++) {
        seen.add(service.rollD20(activePool: pool));
      }
      expect(seen.length, pool.length,
          reason: 'every chord in pool should appear at least once');
    });

    test('rollBothBiased threads activePool through chord-type sampling', () {
      final service = DiceService(random: Random(0));
      const pool = [ChordType.maj13, ChordType.min13, ChordType.dom13];
      for (var i = 0; i < 50; i++) {
        final result = service.rollBothBiased(Note.c, activePool: pool);
        expect(pool, contains(result.chordType));
      }
    });
  });
}
