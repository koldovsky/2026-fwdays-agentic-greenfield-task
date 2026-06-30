import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/accent_palette.dart';
import '../models/theme_settings.dart';

part 'theme_provider.g.dart';

// ─── Prefs Keys ───────────────────────────────────────────────────────────────

const _kThemeMode = 'theme_mode';
const _kAccentPalette = 'accent_palette';

// ─── Shared Preferences Provider ─────────────────────────────────────────────

/// Provides the pre-initialized [SharedPreferencesAsync] instance.
///
/// Must be overridden in [main] via
/// `sharedPreferencesProvider.overrideWithValue(prefs)` before the app runs.
/// Kept as a manual [Provider] (not codegen) so it can be overridden in tests
/// and in `main()` with a pre-constructed instance.
final sharedPreferencesProvider = Provider<SharedPreferencesAsync>(
  (ref) => throw UnimplementedError(
    'Override sharedPreferencesProvider in main()',
  ),
);

// ─── ThemeNotifier ────────────────────────────────────────────────────────────

/// Manages [ThemeSettings] state and persists every change to
/// [SharedPreferencesAsync].
///
/// [build] returns the default state synchronously and schedules an async
/// [_load] via [Future.microtask] to hydrate from persisted prefs. At most
/// one frame of default state is shown before the saved theme swaps in.
@Riverpod(keepAlive: true)
class ThemeNotifier extends _$ThemeNotifier {
  @override
  ThemeSettings build() {
    Future.microtask(_load);
    return const ThemeSettings(
      mode: ThemeMode.dark,
      palette: AccentPalette.lavenderCyan,
    );
  }

  Future<void> _load() async {
    final prefs = ref.read(sharedPreferencesProvider);
    final modeStr = await prefs.getString(_kThemeMode);
    final paletteStr = await prefs.getString(_kAccentPalette);
    if (!ref.mounted) return;
    final mode = switch (modeStr) {
      'light' => ThemeMode.light,
      'system' => ThemeMode.system,
      _ => ThemeMode.dark,
    };
    final palette = switch (paletteStr) {
      'defaultBlue' => AccentPalette.blue, // backward-compat alias
      'blue' => AccentPalette.blue,
      'tealAmber' => AccentPalette.tealAmber,
      'lavenderCyan' => AccentPalette.lavenderCyan,
      'roseSage' => AccentPalette.roseSage,
      'indigoMint' => AccentPalette.indigoMint,
      'plumPeach' => AccentPalette.plumPeach,
      'emeraldGold' => AccentPalette.emeraldGold,
      'crimsonSlate' => AccentPalette.crimsonSlate,
      _ => AccentPalette.lavenderCyan,
    };
    state = ThemeSettings(mode: mode, palette: palette);
  }

  /// Updates the theme mode, applies it immediately, and persists it.
  Future<void> setMode(ThemeMode mode) async {
    state = state.copyWith(mode: mode);
    final key = switch (mode) {
      ThemeMode.light => 'light',
      ThemeMode.system => 'system',
      _ => 'dark',
    };
    await ref.read(sharedPreferencesProvider).setString(_kThemeMode, key);
  }

  /// Updates the accent palette, applies it immediately, and persists it.
  Future<void> setPalette(AccentPalette palette) async {
    state = state.copyWith(palette: palette);
    final key = switch (palette) {
      AccentPalette.blue => 'blue',
      AccentPalette.tealAmber => 'tealAmber',
      AccentPalette.lavenderCyan => 'lavenderCyan',
      AccentPalette.roseSage => 'roseSage',
      AccentPalette.indigoMint => 'indigoMint',
      AccentPalette.plumPeach => 'plumPeach',
      AccentPalette.emeraldGold => 'emeraldGold',
      AccentPalette.crimsonSlate => 'crimsonSlate',
    };
    await ref.read(sharedPreferencesProvider).setString(_kAccentPalette, key);
  }
}
