import 'package:flutter/material.dart';

import 'models/accent_palette.dart';

// ─── Theme Builder ────────────────────────────────────────────────────────────

/// Builds the [ThemeData] for the given [palette] and [brightness].
///
/// Uses [ColorScheme.fromSeed] to derive a Material 3 tonal palette from
/// [AccentPaletteX.d20Color] (the D20 die, semantically primary), then
/// injects [AccentPaletteX.d12Color] as [ColorScheme.secondary] with a
/// contrast-safe [ColorScheme.onSecondary]. Surface, text, and divider
/// colors are derived by the seed — no hardcoded overrides.
ThemeData buildTheme(AccentPalette palette, Brightness brightness) {
  final colorScheme = ColorScheme.fromSeed(
    seedColor: palette.d20Color,
    brightness: brightness,
  ).copyWith(
    secondary: palette.d12Color,
    onSecondary: ThemeData.estimateBrightnessForColor(palette.d12Color) ==
            Brightness.dark
        ? Colors.white
        : Colors.black,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(200, 56),
      ),
    ),
  );
}
