import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:chord_dice/models/accent_palette.dart';

void main() {
  group('AccentPalette', () {
    test('every variant has a non-null d12Color', () {
      for (final p in AccentPalette.values) {
        expect(p.d12Color, isA<Color>(),
            reason: '${p.name}.d12Color should be a Color');
      }
    });

    test('every variant has a non-null d20Color', () {
      for (final p in AccentPalette.values) {
        expect(p.d20Color, isA<Color>(),
            reason: '${p.name}.d20Color should be a Color');
      }
    });

    test('d12Colors are distinct across variants', () {
      final colors = AccentPalette.values.map((p) => p.d12Color).toSet();
      expect(colors.length, AccentPalette.values.length,
          reason: 'each palette must have a unique d12Color');
    });

    test('d20Colors are distinct across variants', () {
      final colors = AccentPalette.values.map((p) => p.d20Color).toSet();
      expect(colors.length, AccentPalette.values.length,
          reason: 'each palette must have a unique d20Color');
    });

    test('has exactly 8 variants', () {
      expect(AccentPalette.values.length, 8);
    });
  });
}
