import 'package:flutter_test/flutter_test.dart';

import 'package:chord_dice/models/chord_type.dart';
import 'package:chord_dice/models/dice_result.dart';
import 'package:chord_dice/models/note.dart';

void main() {
  group('DiceResult.toJson / fromJson', () {
    test('round-trip preserves note, chordType, and rolledAt', () {
      final original = DiceResult(
        note: Note.c,
        chordType: ChordType.major,
        rolledAt: DateTime.utc(2026, 4, 12, 10, 0, 0),
      );
      final json = original.toJson();
      final restored = DiceResult.fromJson(json);
      expect(restored, equals(original));
    });

    test('all 12 Note values survive a round-trip', () {
      for (final note in Note.values) {
        final original = DiceResult(
          note: note,
          chordType: ChordType.minor,
          rolledAt: DateTime.utc(2026, 1, 1),
        );
        final restored = DiceResult.fromJson(original.toJson());
        expect(restored.note, note,
            reason: '${note.name} did not survive round-trip');
      }
    });

    test('all ChordType values survive a round-trip', () {
      for (final ct in ChordType.values) {
        final original = DiceResult(
          note: Note.a,
          chordType: ct,
          rolledAt: DateTime.utc(2026, 1, 1),
        );
        final restored = DiceResult.fromJson(original.toJson());
        expect(restored.chordType, ct,
            reason: '${ct.name} did not survive round-trip');
      }
    });

    test('toJson produces expected keys and types', () {
      final result = DiceResult(
        note: Note.d,
        chordType: ChordType.dom7,
        rolledAt: DateTime.utc(2026, 4, 12, 15, 30, 0),
      );
      final json = result.toJson();
      expect(json['note'], isA<String>());
      expect(json['chordType'], isA<String>());
      expect(json['rolledAt'], isA<String>());
      expect(json['note'], Note.d.name);
      expect(json['chordType'], ChordType.dom7.name);
      expect(json['rolledAt'], '2026-06-30T15:30:00.000Z');
    });

    test('fromJson with unknown note name throws ArgumentError', () {
      final json = <String, dynamic>{
        'note': 'zzz',
        'chordType': ChordType.major.name,
        'rolledAt': '2026-06-30T00:00:00.000Z',
      };
      expect(() => DiceResult.fromJson(json), throwsArgumentError);
    });

    test('fromJson with unknown chordType name throws ArgumentError', () {
      final json = <String, dynamic>{
        'note': Note.c.name,
        'chordType': 'zzz',
        'rolledAt': '2026-06-30T00:00:00.000Z',
      };
      expect(() => DiceResult.fromJson(json), throwsArgumentError);
    });
  });
}
