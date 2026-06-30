import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart'
    show SharedPreferencesAsync;
import 'package:shared_preferences_platform_interface/in_memory_shared_preferences_async.dart';
import 'package:shared_preferences_platform_interface/shared_preferences_async_platform_interface.dart';

import 'package:chord_dice/models/shake_sensitivity.dart';
import 'package:chord_dice/models/shake_settings.dart';
import 'package:chord_dice/providers/shake_provider.dart';
import 'package:chord_dice/providers/theme_provider.dart';

SharedPreferencesAsync _resetPrefs({Map<String, Object> initial = const {}}) {
  SharedPreferencesAsyncPlatform.instance =
      InMemorySharedPreferencesAsync.withData(initial);
  return SharedPreferencesAsync();
}

Future<void> _settle(ProviderContainer container) async {
  container.read(shakeProvider);
  await Future<void>.delayed(Duration.zero);
  await Future<void>.delayed(Duration.zero);
}

void main() {
  group('ShakeNotifier', () {
    ProviderContainer makeContainer(SharedPreferencesAsync prefs) {
      return ProviderContainer(
        overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
      );
    }

    test('default state pre-hydration: enabled=true, sensitivity=medium',
        () async {
      final prefs = _resetPrefs();
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      final s = container.read(shakeProvider);
      expect(s.enabled, isTrue);
      expect(s.sensitivity, ShakeSensitivity.medium);
    });

    test('setEnabled(false) updates state', () async {
      final prefs = _resetPrefs();
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await container.read(shakeProvider.notifier).setEnabled(false);
      expect(container.read(shakeProvider).enabled, isFalse);
    });

    test('setEnabled(false) writes shake_enabled=false to prefs', () async {
      final prefs = _resetPrefs();
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await container.read(shakeProvider.notifier).setEnabled(false);
      expect(await prefs.getBool('shake_enabled'), false);
    });

    test('setSensitivity(low) updates state', () async {
      final prefs = _resetPrefs();
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await container
          .read(shakeProvider.notifier)
          .setSensitivity(ShakeSensitivity.low);
      expect(container.read(shakeProvider).sensitivity, ShakeSensitivity.low);
    });

    test('setSensitivity(low) writes shake_sensitivity=low to prefs', () async {
      final prefs = _resetPrefs();
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await container
          .read(shakeProvider.notifier)
          .setSensitivity(ShakeSensitivity.low);
      expect(await prefs.getString('shake_sensitivity'), 'low');
    });

    test('reads persisted {enabled: false, sensitivity: high} after settle',
        () async {
      final prefs = _resetPrefs(
        initial: {'shake_enabled': false, 'shake_sensitivity': 'high'},
      );
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await _settle(container);
      final s = container.read(shakeProvider);
      expect(s.enabled, isFalse);
      expect(s.sensitivity, ShakeSensitivity.high);
    });

    test('unknown shake_sensitivity falls back to medium', () async {
      final prefs = _resetPrefs(
        initial: {'shake_sensitivity': 'bogus'},
      );
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await _settle(container);
      expect(
          container.read(shakeProvider).sensitivity, ShakeSensitivity.medium);
    });

    test('missing shake_enabled key falls back to true (fresh install)',
        () async {
      final prefs = _resetPrefs();
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await _settle(container);
      expect(container.read(shakeProvider).enabled, isTrue);
    });
  });

  group('ShakeSettings', () {
    test('two instances with same fields are equal', () {
      const a =
          ShakeSettings(enabled: true, sensitivity: ShakeSensitivity.medium);
      const b =
          ShakeSettings(enabled: true, sensitivity: ShakeSensitivity.medium);
      expect(a, equals(b));
      expect(a.hashCode, equals(b.hashCode));
    });

    test('instances with different enabled are not equal', () {
      const a =
          ShakeSettings(enabled: true, sensitivity: ShakeSensitivity.medium);
      const b =
          ShakeSettings(enabled: false, sensitivity: ShakeSensitivity.medium);
      expect(a, isNot(equals(b)));
    });

    test('instances with different sensitivity are not equal', () {
      const a = ShakeSettings(enabled: true, sensitivity: ShakeSensitivity.low);
      const b =
          ShakeSettings(enabled: true, sensitivity: ShakeSensitivity.high);
      expect(a, isNot(equals(b)));
    });

    test('copyWith replaces enabled only', () {
      const original =
          ShakeSettings(enabled: true, sensitivity: ShakeSensitivity.medium);
      final copy = original.copyWith(enabled: false);
      expect(copy.enabled, isFalse);
      expect(copy.sensitivity, ShakeSensitivity.medium);
    });

    test('copyWith replaces sensitivity only', () {
      const original =
          ShakeSettings(enabled: true, sensitivity: ShakeSensitivity.medium);
      final copy = original.copyWith(sensitivity: ShakeSensitivity.high);
      expect(copy.enabled, isTrue);
      expect(copy.sensitivity, ShakeSensitivity.high);
    });

    test('copyWith with no args returns equivalent instance', () {
      const original =
          ShakeSettings(enabled: false, sensitivity: ShakeSensitivity.low);
      final copy = original.copyWith();
      expect(copy, equals(original));
    });
  });
}
