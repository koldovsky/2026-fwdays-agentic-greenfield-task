import 'package:chord_dice/models/shake_sensitivity.dart';
import 'package:chord_dice/models/shake_settings.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('ShakeSettings', () {
    test('default values', () {
      const s = ShakeSettings();
      expect(s.enabled, isTrue);
      expect(s.sensitivity, ShakeSensitivity.medium);
    });

    test('equality — same values', () {
      const a = ShakeSettings(enabled: true, sensitivity: ShakeSensitivity.low);
      const b = ShakeSettings(enabled: true, sensitivity: ShakeSensitivity.low);
      expect(a, equals(b));
    });

    test('equality — different enabled', () {
      const a =
          ShakeSettings(enabled: true, sensitivity: ShakeSensitivity.medium);
      const b =
          ShakeSettings(enabled: false, sensitivity: ShakeSensitivity.medium);
      expect(a, isNot(equals(b)));
    });

    test('equality — different sensitivity', () {
      const a = ShakeSettings(enabled: true, sensitivity: ShakeSensitivity.low);
      const b =
          ShakeSettings(enabled: true, sensitivity: ShakeSensitivity.high);
      expect(a, isNot(equals(b)));
    });

    test('hashCode matches for equal objects', () {
      const a =
          ShakeSettings(enabled: false, sensitivity: ShakeSensitivity.high);
      const b =
          ShakeSettings(enabled: false, sensitivity: ShakeSensitivity.high);
      expect(a.hashCode, equals(b.hashCode));
    });

    test('hashCode differs for unequal objects', () {
      const a = ShakeSettings(enabled: true, sensitivity: ShakeSensitivity.low);
      const b =
          ShakeSettings(enabled: true, sensitivity: ShakeSensitivity.medium);
      expect(a.hashCode, isNot(equals(b.hashCode)));
    });

    test('copyWith — replaces enabled', () {
      const original =
          ShakeSettings(enabled: true, sensitivity: ShakeSensitivity.high);
      final copy = original.copyWith(enabled: false);
      expect(copy.enabled, isFalse);
      expect(copy.sensitivity, ShakeSensitivity.high);
    });

    test('copyWith — replaces sensitivity', () {
      const original =
          ShakeSettings(enabled: false, sensitivity: ShakeSensitivity.low);
      final copy = original.copyWith(sensitivity: ShakeSensitivity.medium);
      expect(copy.enabled, isFalse);
      expect(copy.sensitivity, ShakeSensitivity.medium);
    });

    test('copyWith — no args returns equal object', () {
      const original =
          ShakeSettings(enabled: true, sensitivity: ShakeSensitivity.high);
      final copy = original.copyWith();
      expect(copy, equals(original));
    });

    test('identical instance equality', () {
      const s = ShakeSettings();
      expect(s == s, isTrue);
    });
  });

  group('ShakeSensitivityX', () {
    test('low threshold matches kShakeThresholdLow', () {
      expect(ShakeSensitivity.low.thresholdMps2, equals(25.0));
    });

    test('medium threshold matches kShakeThresholdMedium', () {
      expect(ShakeSensitivity.medium.thresholdMps2, equals(18.0));
    });

    test('high threshold matches kShakeThresholdHigh', () {
      expect(ShakeSensitivity.high.thresholdMps2, equals(12.0));
    });

    test('displayNames', () {
      expect(ShakeSensitivity.low.displayName, equals('Low'));
      expect(ShakeSensitivity.medium.displayName, equals('Medium'));
      expect(ShakeSensitivity.high.displayName, equals('High'));
    });

    test('subtitles are non-empty', () {
      for (final s in ShakeSensitivity.values) {
        expect(s.subtitle, isNotEmpty);
      }
    });
  });
}
