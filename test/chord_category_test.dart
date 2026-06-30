import 'package:flutter_test/flutter_test.dart';

import 'package:chord_dice/models/chord_category.dart';
import 'package:chord_dice/models/chord_type.dart';

void main() {
  group('ChordCategory', () {
    test('has 10 categories', () {
      expect(ChordCategory.values.length, 10);
    });

    test('each category has a non-empty display name', () {
      for (final c in ChordCategory.values) {
        expect(c.displayName.isNotEmpty, true,
            reason: '${c.name} has empty display name');
      }
    });

    test('category display names are distinct', () {
      final names = ChordCategory.values.map((c) => c.displayName).toSet();
      expect(names.length, ChordCategory.values.length);
    });
  });

  group('ChordType ↔ ChordCategory coverage', () {
    test('every chord type maps to a category', () {
      for (final type in ChordType.values) {
        // The getter throws via `!` if the entry is missing; this test just
        // exercises it for every value.
        expect(() => type.category, returnsNormally,
            reason: '${type.name} has no category assigned');
      }
    });

    test('every category has at least one chord type', () {
      final occupiedCategories =
          ChordType.values.map((c) => c.category).toSet();
      for (final cat in ChordCategory.values) {
        expect(occupiedCategories.contains(cat), true,
            reason: '${cat.name} has no chord types assigned');
      }
    });

    test('category counts match the 52-chord catalog', () {
      final counts = <ChordCategory, int>{};
      for (final type in ChordType.values) {
        counts[type.category] = (counts[type.category] ?? 0) + 1;
      }

      expect(counts[ChordCategory.triads], 5);
      expect(counts[ChordCategory.suspended], 3);
      expect(counts[ChordCategory.added], 5);
      expect(counts[ChordCategory.sixths], 4);
      expect(counts[ChordCategory.sevenths], 10);
      expect(counts[ChordCategory.ninths], 6);
      expect(counts[ChordCategory.elevenths], 5);
      expect(counts[ChordCategory.thirteenths], 3);
      expect(counts[ChordCategory.alteredDominants], 6);
      expect(counts[ChordCategory.hybrid], 5);

      final total = counts.values.fold(0, (a, b) => a + b);
      expect(total, 52);
    });
  });

  group('kDefaultChordSelection', () {
    test('has exactly 20 entries', () {
      expect(kDefaultChordSelection.length, 20);
    });

    test('all entries are distinct', () {
      expect(
          kDefaultChordSelection.toSet().length, kDefaultChordSelection.length);
    });

    test('preserves the legacy 20 chord types', () {
      const legacy = [
        ChordType.major, ChordType.minor, ChordType.dom7, ChordType.maj7, //
        ChordType.min7, ChordType.sus2, ChordType.sus4, ChordType.dim, //
        ChordType.aug, ChordType.min9, ChordType.maj9, ChordType.add9, //
        ChordType.sixth, ChordType.min6, ChordType.dom9, ChordType.halfDim, //
        ChordType.dim7, ChordType.min11, ChordType.minMaj7, ChordType.power5,
      ];
      expect(kDefaultChordSelection, legacy);
    });
  });
}
