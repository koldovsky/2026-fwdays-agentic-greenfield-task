import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart'
    show SharedPreferencesAsync;
import 'package:shared_preferences_platform_interface/in_memory_shared_preferences_async.dart';
import 'package:shared_preferences_platform_interface/shared_preferences_async_platform_interface.dart';

import 'package:chord_dice/models/chord_type.dart';
import 'package:chord_dice/providers/chord_selection_provider.dart';
import 'package:chord_dice/providers/theme_provider.dart'
    show sharedPreferencesProvider;

SharedPreferencesAsync _resetPrefs({Map<String, Object> initial = const {}}) {
  SharedPreferencesAsyncPlatform.instance =
      InMemorySharedPreferencesAsync.withData(initial);
  return SharedPreferencesAsync();
}

// Trigger provider + pump to let microtask hydration complete.
Future<void> _settle(ProviderContainer container) async {
  container.read(chordSelectionProvider);
  await Future<void>.delayed(Duration.zero);
  await Future<void>.delayed(Duration.zero);
}

void main() {
  group('ChordSelectionNotifier', () {
    ProviderContainer makeContainer(SharedPreferencesAsync prefs) {
      return ProviderContainer(
        overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
      );
    }

    test('default state on fresh install is kDefaultChordSelection', () async {
      final prefs = _resetPrefs();
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await _settle(container);
      expect(container.read(chordSelectionProvider).active,
          kDefaultChordSelection);
    });

    test('toggle removes a chord and persists', () async {
      final prefs = _resetPrefs();
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await _settle(container);
      await container
          .read(chordSelectionProvider.notifier)
          .toggle(ChordType.major);
      final state = container.read(chordSelectionProvider);
      expect(state.active.contains(ChordType.major), false);
      expect(state.active.length, 19);

      final raw = await prefs.getString('chord_selection');
      expect(raw, isNotNull);
      final decoded = jsonDecode(raw!) as List;
      expect(decoded.contains('major'), false);
      expect(decoded.length, 19);
    });

    test('toggle adds a new chord at the end', () async {
      final prefs = _resetPrefs();
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await _settle(container);
      // Start from a smaller set for predictability.
      await container.read(chordSelectionProvider.notifier).setActive([
        ChordType.major,
        ChordType.minor,
        ChordType.power5,
      ]);
      await container
          .read(chordSelectionProvider.notifier)
          .toggle(ChordType.maj13);
      final state = container.read(chordSelectionProvider);
      expect(state.active.last, ChordType.maj13);
      expect(state.active.length, 4);
    });

    test('toggle is no-op at minCount boundary', () async {
      final prefs = _resetPrefs();
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await _settle(container);
      await container.read(chordSelectionProvider.notifier).setActive([
        ChordType.major,
        ChordType.minor,
        ChordType.power5,
      ]);
      await container
          .read(chordSelectionProvider.notifier)
          .toggle(ChordType.major);
      final state = container.read(chordSelectionProvider);
      expect(state.active.length, 3);
      expect(state.active.contains(ChordType.major), true);
    });

    test('toggle is no-op at maxCount boundary', () async {
      final prefs = _resetPrefs();
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await _settle(container);
      // Default already has 20 entries.
      await container
          .read(chordSelectionProvider.notifier)
          .toggle(ChordType.maj13);
      final state = container.read(chordSelectionProvider);
      expect(state.active.length, 20);
      expect(state.active.contains(ChordType.maj13), false);
    });

    test('setActive rejects too-short lists', () async {
      final prefs = _resetPrefs();
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await _settle(container);
      await container.read(chordSelectionProvider.notifier).setActive([
        ChordType.major,
        ChordType.minor,
      ]);
      expect(container.read(chordSelectionProvider).active.length, 20);
    });

    test('setActive rejects too-long lists', () async {
      final prefs = _resetPrefs();
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await _settle(container);
      final tooLong = [...ChordType.values].take(21).toList();
      await container.read(chordSelectionProvider.notifier).setActive(tooLong);
      expect(container.read(chordSelectionProvider).active.length, 20);
      // Original default still intact.
      expect(
        container.read(chordSelectionProvider).active,
        kDefaultChordSelection,
      );
    });

    test('hydrates persisted selection on construction', () async {
      final stored = jsonEncode(['major', 'minor', 'power5', 'maj13']);
      final prefs = _resetPrefs(initial: {'chord_selection': stored});
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await _settle(container);
      expect(container.read(chordSelectionProvider).active, [
        ChordType.major,
        ChordType.minor,
        ChordType.power5,
        ChordType.maj13,
      ]);
    });

    test('corrupt JSON falls back to default and clears prefs', () async {
      final prefs = _resetPrefs(initial: {'chord_selection': '{not json'});
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await _settle(container);
      expect(container.read(chordSelectionProvider).active,
          kDefaultChordSelection);
      expect(await prefs.getString('chord_selection'), isNull);
    });

    test('unknown names are skipped on decode', () async {
      final stored =
          jsonEncode(['major', 'minor', 'power5', 'nonexistentChord']);
      final prefs = _resetPrefs(initial: {'chord_selection': stored});
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await _settle(container);
      expect(container.read(chordSelectionProvider).active, [
        ChordType.major,
        ChordType.minor,
        ChordType.power5,
      ]);
    });

    test('too-few surviving entries after filter falls back to default',
        () async {
      final stored = jsonEncode(['major', 'nonexistent1', 'nonexistent2']);
      final prefs = _resetPrefs(initial: {'chord_selection': stored});
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await _settle(container);
      expect(container.read(chordSelectionProvider).active,
          kDefaultChordSelection);
      expect(await prefs.getString('chord_selection'), isNull);
    });

    test('oversize saved list is truncated to 20', () async {
      final big = ChordType.values.take(25).map((c) => c.name).toList();
      final prefs = _resetPrefs(initial: {'chord_selection': jsonEncode(big)});
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await _settle(container);
      expect(container.read(chordSelectionProvider).active.length, 20);
    });

    test('duplicates in saved list are deduped (first occurrence kept)',
        () async {
      final stored = jsonEncode([
        'major',
        'minor',
        'major',
        'power5',
        'minor',
      ]);
      final prefs = _resetPrefs(initial: {'chord_selection': stored});
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await _settle(container);
      expect(container.read(chordSelectionProvider).active, [
        ChordType.major,
        ChordType.minor,
        ChordType.power5,
      ]);
    });

    test('resetToDefault clears prefs and restores default', () async {
      final prefs = _resetPrefs();
      final container = makeContainer(prefs);
      addTearDown(container.dispose);
      await _settle(container);
      await container.read(chordSelectionProvider.notifier).setActive([
        ChordType.major,
        ChordType.minor,
        ChordType.power5,
      ]);
      expect(await prefs.getString('chord_selection'), isNotNull);

      await container.read(chordSelectionProvider.notifier).resetToDefault();
      expect(container.read(chordSelectionProvider).active,
          kDefaultChordSelection);
      expect(await prefs.getString('chord_selection'), isNull);
    });
  });
}
