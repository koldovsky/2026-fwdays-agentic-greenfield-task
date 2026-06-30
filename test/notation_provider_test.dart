import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart'
    show SharedPreferencesAsync;
import 'package:shared_preferences_platform_interface/in_memory_shared_preferences_async.dart';
import 'package:shared_preferences_platform_interface/shared_preferences_async_platform_interface.dart';

import 'package:chord_dice/models/notation_preference.dart';
import 'package:chord_dice/providers/notation_provider.dart';
import 'package:chord_dice/providers/theme_provider.dart';

SharedPreferencesAsync _resetPrefs({Map<String, Object> initial = const {}}) {
  SharedPreferencesAsyncPlatform.instance =
      InMemorySharedPreferencesAsync.withData(initial);
  return SharedPreferencesAsync();
}

Future<void> _settle(ProviderContainer container) async {
  container.read(notationProvider);
  await Future<void>.delayed(Duration.zero);
  await Future<void>.delayed(Duration.zero);
}

void main() {
  group('NotationNotifier', () {
    ProviderContainer makeContainer(SharedPreferencesAsync prefs) {
      return ProviderContainer(
        overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
      );
    }

    test('default state pre-hydration: sharps', () {
      final prefs = _resetPrefs();
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      expect(container.read(notationProvider), NotationPreference.sharps);
    });

    test('setPreference(flats) updates state', () async {
      final prefs = _resetPrefs();
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await container
          .read(notationProvider.notifier)
          .setPreference(NotationPreference.flats);
      expect(container.read(notationProvider), NotationPreference.flats);
    });

    test("setPreference(flats) writes notation_preference='flats' to prefs",
        () async {
      final prefs = _resetPrefs();
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await container
          .read(notationProvider.notifier)
          .setPreference(NotationPreference.flats);
      expect(await prefs.getString('notation_preference'), 'flats');
    });

    test("reads persisted 'flats' after hydrate settle", () async {
      final prefs = _resetPrefs(
        initial: {'notation_preference': 'flats'},
      );
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await _settle(container);
      expect(container.read(notationProvider), NotationPreference.flats);
    });

    test('unknown value in prefs falls back to sharps', () async {
      final prefs = _resetPrefs(
        initial: {'notation_preference': 'bogus'},
      );
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await _settle(container);
      expect(container.read(notationProvider), NotationPreference.sharps);
    });

    test('missing key falls back to sharps (fresh install)', () async {
      final prefs = _resetPrefs();
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await _settle(container);
      expect(container.read(notationProvider), NotationPreference.sharps);
    });
  });
}
