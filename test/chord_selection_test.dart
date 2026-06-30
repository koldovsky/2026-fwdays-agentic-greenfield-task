import 'package:flutter_test/flutter_test.dart';

import 'package:chord_dice/models/chord_selection.dart';
import 'package:chord_dice/models/chord_type.dart';

void main() {
  group('ChordSelection.faceLabels', () {
    test('length is always 20 for valid selections', () {
      expect(
        const ChordSelection([
          ChordType.major,
          ChordType.minor,
          ChordType.power5,
        ]).faceLabels.length,
        20,
      );
      expect(
        const ChordSelection(kDefaultChordSelection).faceLabels.length,
        20,
      );
    });

    test('cyclic repeat for active length 3', () {
      final sel = const ChordSelection([
        ChordType.major,
        ChordType.minor,
        ChordType.power5,
      ]);
      final labels = sel.faceLabels;
      // Positions 0..2 = A B C; 3..5 = A B C; ...; 18..19 = A B.
      expect(labels[0], 'Maj');
      expect(labels[1], 'min');
      expect(labels[2], '5');
      expect(labels[3], 'Maj');
      expect(labels[18], 'Maj');
      expect(labels[19], 'min');
    });

    test('active length 7 fills all 20 faces via 2 full + 1 partial cycle', () {
      final sel = const ChordSelection([
        ChordType.major,
        ChordType.minor,
        ChordType.dom7,
        ChordType.maj7,
        ChordType.min7,
        ChordType.dim,
        ChordType.aug,
      ]);
      final labels = sel.faceLabels;
      // 20 / 7 = 2 rem 6 — first 6 chords appear 3 times, the 7th (aug) 2×.
      expect(labels.where((l) => l == 'Maj').length, 3);
      expect(labels.where((l) => l == 'aug').length, 2);
    });

    test('active length 20 returns labels verbatim in order', () {
      final sel = const ChordSelection(kDefaultChordSelection);
      final expected = kDefaultChordSelection.map((c) => c.faceLabel).toList();
      expect(sel.faceLabels, expected);
    });
  });

  group('ChordSelection.faceChordTypes', () {
    test('cyclic mapping mirrors faceLabels for length 3', () {
      final sel = const ChordSelection([
        ChordType.major,
        ChordType.minor,
        ChordType.power5,
      ]);
      final types = sel.faceChordTypes;
      expect(types.length, 20);
      expect(types[0], ChordType.major);
      expect(types[1], ChordType.minor);
      expect(types[2], ChordType.power5);
      expect(types[19], ChordType.minor);
    });
  });

  group('ChordSelection.copyWithToggled', () {
    test('adds a chord when inactive and below maxCount', () {
      const sel = ChordSelection([
        ChordType.major,
        ChordType.minor,
        ChordType.power5,
      ]);
      final next = sel.copyWithToggled(ChordType.maj7);
      expect(next.active.last, ChordType.maj7);
      expect(next.active.length, 4);
    });

    test('removes a chord when active and above minCount', () {
      const sel = ChordSelection([
        ChordType.major,
        ChordType.minor,
        ChordType.power5,
        ChordType.maj7,
      ]);
      final next = sel.copyWithToggled(ChordType.maj7);
      expect(next.active.contains(ChordType.maj7), false);
      expect(next.active.length, 3);
    });

    test('no-op when removing would drop below minCount', () {
      const sel = ChordSelection([
        ChordType.major,
        ChordType.minor,
        ChordType.power5,
      ]);
      final next = sel.copyWithToggled(ChordType.major);
      expect(identical(next, sel), true);
    });

    test('no-op when adding would exceed maxCount', () {
      final sel = ChordSelection(kDefaultChordSelection); // 20 entries
      final next = sel.copyWithToggled(ChordType.maj13);
      expect(next, sel);
      expect(next.active.length, 20);
    });
  });

  group('ChordSelection equality', () {
    test('same active order → equal', () {
      const a = ChordSelection([
        ChordType.major,
        ChordType.minor,
        ChordType.power5,
      ]);
      const b = ChordSelection([
        ChordType.major,
        ChordType.minor,
        ChordType.power5,
      ]);
      expect(a, b);
      expect(a.hashCode, b.hashCode);
    });

    test('different order → not equal (order matters for die faces)', () {
      const a = ChordSelection([
        ChordType.major,
        ChordType.minor,
        ChordType.power5,
      ]);
      const b = ChordSelection([
        ChordType.power5,
        ChordType.minor,
        ChordType.major,
      ]);
      expect(a == b, false);
    });

    test('different content → not equal', () {
      const a = ChordSelection([
        ChordType.major,
        ChordType.minor,
        ChordType.power5,
      ]);
      const b = ChordSelection([
        ChordType.major,
        ChordType.minor,
        ChordType.dim,
      ]);
      expect(a == b, false);
    });
  });

  group('ChordSelection.isActive', () {
    test('returns true for entries in active', () {
      const sel = ChordSelection([ChordType.major, ChordType.minor]);
      expect(sel.isActive(ChordType.major), true);
    });

    test('returns false for entries not in active', () {
      const sel = ChordSelection([ChordType.major, ChordType.minor]);
      expect(sel.isActive(ChordType.maj13), false);
    });
  });
}
