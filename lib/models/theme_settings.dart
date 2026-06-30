import 'package:flutter/material.dart';

import 'accent_palette.dart';

// ─── ThemeSettings ────────────────────────────────────────────────────────────

/// Immutable snapshot of the user's theme preferences.
///
/// Default: [ThemeMode.dark] + [AccentPalette.lavenderCyan].
class ThemeSettings {
  const ThemeSettings({
    this.mode = ThemeMode.dark,
    this.palette = AccentPalette.lavenderCyan,
  });

  /// Whether to show dark, light, or system-determined theme.
  final ThemeMode mode;

  /// Active accent color pair for the D12 and D20 dice.
  final AccentPalette palette;

  /// Returns a copy with the given fields replaced.
  ThemeSettings copyWith({ThemeMode? mode, AccentPalette? palette}) =>
      ThemeSettings(
        mode: mode ?? this.mode,
        palette: palette ?? this.palette,
      );

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ThemeSettings && other.mode == mode && other.palette == palette;

  @override
  int get hashCode => Object.hash(mode, palette);
}
