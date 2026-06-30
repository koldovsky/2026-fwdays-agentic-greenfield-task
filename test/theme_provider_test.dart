import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart'
    show SharedPreferencesAsync;
import 'package:shared_preferences_platform_interface/in_memory_shared_preferences_async.dart';
import 'package:shared_preferences_platform_interface/shared_preferences_async_platform_interface.dart';

import 'package:chord_dice/models/accent_palette.dart';
import 'package:chord_dice/models/theme_settings.dart';
import 'package:chord_dice/providers/theme_provider.dart';

// Resets the in-memory async prefs backend and returns a fresh instance.
SharedPreferencesAsync _resetPrefs({Map<String, Object> initial = const {}}) {
  SharedPreferencesAsyncPlatform.instance =
      InMemorySharedPreferencesAsync.withData(initial);
  return SharedPreferencesAsync();
}

// Trigger provider creation then pump the event loop so async hydration completes.
Future<void> _settle(ProviderContainer container) async {
  container.read(
      themeProvider); // trigger lazy provider creation + schedule microtask
  await Future<void>.delayed(Duration.zero);
  await Future<void>.delayed(Duration.zero);
}

void main() {
  group('ThemeNotifier', () {
    ProviderContainer makeContainer(SharedPreferencesAsync prefs) {
      return ProviderContainer(
        overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
      );
    }

    test('default state: dark mode + lavenderCyan palette (before hydration)',
        () async {
      final prefs = _resetPrefs();
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      // Read immediately — hydration hasn't run yet.
      final s = container.read(themeProvider);
      expect(s.mode, ThemeMode.dark);
      expect(s.palette, AccentPalette.lavenderCyan);
    });

    test('setMode updates state', () async {
      final prefs = _resetPrefs();
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await container.read(themeProvider.notifier).setMode(ThemeMode.light);
      expect(container.read(themeProvider).mode, ThemeMode.light);
    });

    test('setMode writes theme_mode to prefs', () async {
      final prefs = _resetPrefs();
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await container.read(themeProvider.notifier).setMode(ThemeMode.system);
      expect(await prefs.getString('theme_mode'), 'system');
    });

    test('setMode writes theme_mode=dark to prefs', () async {
      final prefs = _resetPrefs(initial: {'theme_mode': 'light'});
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await container.read(themeProvider.notifier).setMode(ThemeMode.dark);
      expect(await prefs.getString('theme_mode'), 'dark');
    });

    test('setPalette updates state', () async {
      final prefs = _resetPrefs();
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await container
          .read(themeProvider.notifier)
          .setPalette(AccentPalette.tealAmber);
      expect(
        container.read(themeProvider).palette,
        AccentPalette.tealAmber,
      );
    });

    test('setPalette writes accent_palette to prefs', () async {
      final prefs = _resetPrefs();
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await container
          .read(themeProvider.notifier)
          .setPalette(AccentPalette.lavenderCyan);
      expect(await prefs.getString('accent_palette'), 'lavenderCyan');
    });

    test('reads persisted mode on construction', () async {
      final prefs = _resetPrefs(initial: {'theme_mode': 'light'});
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      // Pump microtask so async hydration completes.
      await _settle(container);
      expect(container.read(themeProvider).mode, ThemeMode.light);
    });

    test('reads persisted palette on construction', () async {
      final prefs = _resetPrefs(initial: {'accent_palette': 'roseSage'});
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await _settle(container);
      expect(
        container.read(themeProvider).palette,
        AccentPalette.roseSage,
      );
    });

    test('reads legacy "defaultBlue" string as blue palette', () async {
      final prefs = _resetPrefs(initial: {'accent_palette': 'defaultBlue'});
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await _settle(container);
      expect(
        container.read(themeProvider).palette,
        AccentPalette.blue,
      );
    });

    test('unknown prefs values fall back to defaults', () async {
      final prefs = _resetPrefs(
        initial: {'theme_mode': 'bogus', 'accent_palette': 'bogus'},
      );
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await _settle(container);
      final s = container.read(themeProvider);
      expect(s.mode, ThemeMode.dark);
      expect(s.palette, AccentPalette.lavenderCyan);
    });
  });

  group('ThemeSettings', () {
    test('two instances with same fields are equal', () {
      const a = ThemeSettings(
        mode: ThemeMode.light,
        palette: AccentPalette.tealAmber,
      );
      const b = ThemeSettings(
        mode: ThemeMode.light,
        palette: AccentPalette.tealAmber,
      );
      expect(a, equals(b));
      expect(a.hashCode, equals(b.hashCode));
    });

    test('instances with different mode are not equal', () {
      const a =
          ThemeSettings(mode: ThemeMode.dark, palette: AccentPalette.blue);
      const b =
          ThemeSettings(mode: ThemeMode.light, palette: AccentPalette.blue);
      expect(a, isNot(equals(b)));
    });

    test('instances with different palette are not equal', () {
      const a =
          ThemeSettings(mode: ThemeMode.dark, palette: AccentPalette.blue);
      const b =
          ThemeSettings(mode: ThemeMode.dark, palette: AccentPalette.roseSage);
      expect(a, isNot(equals(b)));
    });

    test('copyWith replaces mode only', () {
      const original = ThemeSettings(
        mode: ThemeMode.dark,
        palette: AccentPalette.tealAmber,
      );
      final copy = original.copyWith(mode: ThemeMode.system);
      expect(copy.mode, ThemeMode.system);
      expect(copy.palette, AccentPalette.tealAmber);
    });

    test('copyWith replaces palette only', () {
      const original = ThemeSettings(
        mode: ThemeMode.light,
        palette: AccentPalette.blue,
      );
      final copy = original.copyWith(palette: AccentPalette.lavenderCyan);
      expect(copy.mode, ThemeMode.light);
      expect(copy.palette, AccentPalette.lavenderCyan);
    });

    test('copyWith with no args returns equivalent instance', () {
      const original = ThemeSettings(
        mode: ThemeMode.system,
        palette: AccentPalette.roseSage,
      );
      final copy = original.copyWith();
      expect(copy, equals(original));
    });
  });
}
