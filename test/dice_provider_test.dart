import 'dart:convert';

import 'package:fake_async/fake_async.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart'
    show SharedPreferencesAsync;
import 'package:shared_preferences_platform_interface/in_memory_shared_preferences_async.dart';
import 'package:shared_preferences_platform_interface/shared_preferences_async_platform_interface.dart';

import 'package:chord_dice/constants.dart';
import 'package:chord_dice/models/chord.dart';
import 'package:chord_dice/models/chord_type.dart';
import 'package:chord_dice/models/dice_result.dart';
import 'package:chord_dice/models/note.dart';
import 'package:chord_dice/models/arpeggio_pattern.dart';
import 'package:chord_dice/providers/dice_provider.dart';
import 'package:chord_dice/providers/theme_provider.dart';
import 'package:chord_dice/services/audio_service.dart';
import 'package:chord_dice/services/dice_service.dart';

// ─── Fakes ───────────────────────────────────────────────────────────────────

class _FakeDiceService implements DiceService {
  _FakeDiceService(this._results);
  final List<DiceResult> _results;
  var _i = 0;

  @override
  DiceResult rollBoth({List<ChordType>? activePool}) {
    final r = _results[_i % _results.length];
    _i++;
    return r;
  }

  @override
  Note rollD12() => _results[_i % _results.length].note;

  @override
  ChordType rollD20({List<ChordType>? activePool}) =>
      _results[_i % _results.length].chordType;

  @override
  Note rollD12Biased(Note? lastNote) => rollD12();

  @override
  DiceResult rollBothBiased(Note? lastNote, {List<ChordType>? activePool}) =>
      rollBoth();
}

class _RecordingAudioService implements AudioService {
  final List<String> calls = [];
  final List<Chord> playedChords = [];

  @override
  Future<void> init() async {}

  @override
  Future<void> playChord(Chord chord) async {
    calls.add('playChord');
    playedChords.add(chord);
  }

  @override
  Future<void> playArpeggio(Chord chord, ArpeggioPattern pattern) async {
    calls.add('playArpeggio');
    playedChords.add(chord);
  }

  @override
  Future<void> playSingleNote(String note, int octave) async {
    calls.add('playSingleNote');
  }

  @override
  Future<void> stopAll() async {
    calls.add('stopAll');
  }

  @override
  void dispose() {}
}

// Mirrors the private key in dice_provider.dart — kept in sync manually.
const _kHistoryKey = 'dice_history';

// Initialized before each test via _resetPrefs().
late SharedPreferencesAsync _fakePrefs;

// Trigger provider creation then pump the event loop so async hydration completes.
// Chain: build() → microtask → prefs.getString (I/O future) → state update.
Future<void> _settle(ProviderContainer container) async {
  container.read(diceProvider); // trigger lazy creation + schedule microtask
  await Future<void>.delayed(Duration.zero);
  await Future<void>.delayed(Duration.zero);
}

// Resets the in-memory prefs backend and returns a fresh SharedPreferencesAsync.
SharedPreferencesAsync _resetPrefs({Map<String, Object> initial = const {}}) {
  SharedPreferencesAsyncPlatform.instance =
      InMemorySharedPreferencesAsync.withData(initial);
  return SharedPreferencesAsync();
}

// Helper to construct a ProviderContainer wired to our fakes.
// Includes sharedPreferencesProvider so arpeggioProvider resolves correctly
// when DiceNotifier reads it via ref.
(ProviderContainer, _RecordingAudioService) _makeContainer(
  List<DiceResult> rollResults,
) {
  final audio = _RecordingAudioService();
  final dice = _FakeDiceService(rollResults);
  final container = ProviderContainer(overrides: [
    diceServiceProvider.overrideWithValue(dice),
    audioServiceProvider.overrideWithValue(audio),
    sharedPreferencesProvider.overrideWithValue(_fakePrefs),
  ]);
  return (container, audio);
}

DiceResult _r(Note n, ChordType c) =>
    DiceResult(note: n, chordType: c, rolledAt: DateTime(2026, 4, 10));

void main() {
  setUpAll(() async {
    _fakePrefs = _resetPrefs();
  });

  group('DiceNotifier', () {
    setUp(() async {
      // Reset persisted history before each test so that history loaded on
      // DiceNotifier construction does not bleed across tests.
      _fakePrefs = _resetPrefs();
    });

    test(
        '1. beginRoll publishes rollingTarget synchronously and flips to rolling',
        () {
      final (container, _) = _makeContainer([_r(Note.c, ChordType.major)]);
      addTearDown(container.dispose);
      final notifier = container.read(diceProvider.notifier);

      notifier.beginRoll();

      final state = container.read(diceProvider);
      expect(state.rollState, RollState.rolling);
      expect(state.rollingTarget, isNotNull);
      expect(state.rollingTarget!.note, Note.c);
      expect(state.rollingTarget!.chordType, ChordType.major);
    });

    test('2. beginRoll is re-entry-guarded during rolling', () {
      final (container, _) = _makeContainer([
        _r(Note.c, ChordType.major),
        _r(Note.d, ChordType.minor),
      ]);
      addTearDown(container.dispose);
      final notifier = container.read(diceProvider.notifier);

      notifier.beginRoll();
      final targetAfterFirst = container.read(diceProvider).rollingTarget;
      notifier.beginRoll(); // should be a no-op

      // rollingTarget must not change — second call was ignored.
      expect(container.read(diceProvider).rollingTarget, targetAfterFirst);
    });

    test('3. settleRoll moves rollingTarget into current and prepends history',
        () async {
      final (container, audio) = _makeContainer([_r(Note.e, ChordType.maj7)]);
      addTearDown(container.dispose);
      final notifier = container.read(diceProvider.notifier);

      notifier.beginRoll();
      await notifier.settleRoll();

      final state = container.read(diceProvider);
      expect(state.rollState, RollState.result);
      expect(state.current?.note, Note.e);
      expect(state.current?.chordType, ChordType.maj7);
      expect(state.rollingTarget, isNull);
      expect(state.history.length, 1);
      expect(state.history.first.note, Note.e);
      expect(audio.calls, contains('playChord'));
    });

    test('4. settleRoll is idempotent — double-call does not double-history',
        () async {
      final (container, audio) = _makeContainer([_r(Note.a, ChordType.minor)]);
      addTearDown(container.dispose);
      final notifier = container.read(diceProvider.notifier);

      notifier.beginRoll();
      await notifier.settleRoll();
      await notifier.settleRoll();

      final state = container.read(diceProvider);
      expect(state.history.length, 1);
      expect(audio.calls.where((c) => c == 'playChord').length, 1);
    });

    test('5. settleRoll during non-rolling state is a no-op', () async {
      final (container, audio) = _makeContainer([_r(Note.c, ChordType.major)]);
      addTearDown(container.dispose);
      final notifier = container.read(diceProvider.notifier);

      await notifier.settleRoll();

      final state = container.read(diceProvider);
      expect(state.rollState, RollState.idle);
      expect(state.current, isNull);
      expect(audio.calls, isEmpty);
    });

    test('6. history caps at maxHistory (16)', () async {
      final rolls = List.generate(
        21,
        (i) => _r(Note.values[i % Note.values.length], ChordType.major),
      );
      final (container, _) = _makeContainer(rolls);
      addTearDown(container.dispose);
      final notifier = container.read(diceProvider.notifier);

      for (var i = 0; i < 21; i++) {
        notifier.beginRoll();
        await notifier.settleRoll();
      }

      final state = container.read(diceProvider);
      expect(state.history.length, DiceState.maxHistory);
      // Most recent roll is first — the 21st roll used Note.values[20 % 12] = Note.values[8].
      expect(state.history.first.note, rolls.last.note);
    });

    test(
        '7. watchdog fires settleRoll after kRollAnimationDuration + kRollWatchdogGrace',
        () {
      fakeAsync((async) {
        final (container, audio) =
            _makeContainer([_r(Note.c, ChordType.major)]);
        addTearDown(container.dispose);
        final notifier = container.read(diceProvider.notifier);

        notifier.beginRoll();
        expect(container.read(diceProvider).rollState, RollState.rolling);

        async.elapse(
          kRollAnimationDuration +
              kRollWatchdogGrace +
              const Duration(milliseconds: 50),
        );
        async.flushMicrotasks();

        expect(container.read(diceProvider).rollState, RollState.result);
        expect(audio.calls, contains('playChord'));
      });
    });

    test('8. watchdog is cancelled when settleRoll fires first', () async {
      final (container, audio) = _makeContainer([_r(Note.c, ChordType.major)]);
      addTearDown(container.dispose);
      final notifier = container.read(diceProvider.notifier);

      notifier.beginRoll();
      await notifier.settleRoll();

      // Wait longer than the watchdog would have taken — if the watchdog
      // were still scheduled, settleRoll would fire again and playChord
      // would be called twice.
      await Future<void>.delayed(
        kRollAnimationDuration +
            kRollWatchdogGrace +
            const Duration(milliseconds: 100),
      );

      expect(audio.calls.where((c) => c == 'playChord').length, 1);
    });

    test('9. replayFromHistory is gated during rolling', () async {
      final (container, audio) = _makeContainer([_r(Note.c, ChordType.major)]);
      addTearDown(container.dispose);
      final notifier = container.read(diceProvider.notifier);

      notifier.beginRoll();
      // Call replayFromHistory while state is still `rolling`.
      await notifier.replayFromHistory(_r(Note.a, ChordType.minor));

      expect(audio.calls, isNot(contains('stopAll')));
      expect(audio.calls, isNot(contains('playChord')));
    });

    test('10. replayFromHistory calls stopAll then playChord when not rolling',
        () async {
      final (container, audio) = _makeContainer([_r(Note.c, ChordType.major)]);
      addTearDown(container.dispose);
      final notifier = container.read(diceProvider.notifier);

      notifier.beginRoll();
      await notifier.settleRoll();
      audio.calls.clear();

      await notifier.replayFromHistory(_r(Note.a, ChordType.minor));

      expect(audio.calls, ['stopAll', 'playChord']);
    });

    test('11. dispose mid-roll does not throw', () {
      fakeAsync((async) {
        final (container, _) = _makeContainer([_r(Note.c, ChordType.major)]);
        final notifier = container.read(diceProvider.notifier);

        notifier.beginRoll();
        container.dispose();

        // Watchdog should self-cancel via !ref.mounted guard. No exceptions.
        async.elapse(
          kRollAnimationDuration +
              kRollWatchdogGrace +
              const Duration(seconds: 1),
        );
        async.flushMicrotasks();
        // Implicit expectation: no uncaught exception during elapse.
      });
    });
  });

  group('Persistence', () {
    // Each test uses a fresh ProviderContainer wired to a locally-created
    // SharedPreferencesAsync mock so these tests don't share state with the
    // DiceNotifier group above.
    (ProviderContainer, _RecordingAudioService) makeContainerWithPrefs(
      List<DiceResult> rollResults,
      SharedPreferencesAsync prefs,
    ) {
      final audio = _RecordingAudioService();
      final dice = _FakeDiceService(rollResults);
      final container = ProviderContainer(overrides: [
        diceServiceProvider.overrideWithValue(dice),
        audioServiceProvider.overrideWithValue(audio),
        sharedPreferencesProvider.overrideWithValue(prefs),
      ]);
      return (container, audio);
    }

    test('persists history to SharedPreferencesAsync on settleRoll', () async {
      final prefs = _resetPrefs();
      final (container, _) =
          makeContainerWithPrefs([_r(Note.c, ChordType.major)], prefs);
      addTearDown(container.dispose);
      final notifier = container.read(diceProvider.notifier);

      notifier.beginRoll();
      await notifier.settleRoll();

      final raw = await prefs.getString(_kHistoryKey);
      expect(raw, isNotNull);
      final decoded = List<Map<String, dynamic>>.from(
        jsonDecode(raw!) as List,
      );
      expect(decoded.length, 1);
      expect(decoded.first['note'], Note.c.name);
      expect(decoded.first['chordType'], ChordType.major.name);
    });

    test('loads persisted history on construction', () async {
      final result = _r(Note.g, ChordType.minor);
      final jsonStr = jsonEncode([result.toJson()]);
      final prefs = _resetPrefs(initial: {_kHistoryKey: jsonStr});
      final (container, _) =
          makeContainerWithPrefs([_r(Note.c, ChordType.major)], prefs);
      addTearDown(container.dispose);

      // Hydration is async — pump a microtask to let _loadHistoryAsync complete.
      await _settle(container);

      final state = container.read(diceProvider);
      expect(state.history.length, 1);
      expect(state.history.first.note, Note.g);
      expect(state.history.first.chordType, ChordType.minor);
      expect(state.current, state.history.first);
    });

    test('discards corrupt persisted history gracefully', () async {
      final prefs = _resetPrefs(initial: {_kHistoryKey: 'not valid json'});
      final (container, _) =
          makeContainerWithPrefs([_r(Note.c, ChordType.major)], prefs);
      addTearDown(container.dispose);

      await _settle(container);

      final state = container.read(diceProvider);
      expect(state.history, isEmpty);
      expect(state.current, isNull);
    });

    test('skips individual entries with bad enum name', () async {
      final validResult = _r(Note.e, ChordType.maj7);
      final badEntry = {
        'note': 'zzz_unknown_note',
        'chordType': ChordType.major.name,
        'rolledAt': DateTime(2026, 4, 10).toIso8601String(),
      };
      final jsonStr = jsonEncode([validResult.toJson(), badEntry]);
      final prefs = _resetPrefs(initial: {_kHistoryKey: jsonStr});
      final (container, _) =
          makeContainerWithPrefs([_r(Note.c, ChordType.major)], prefs);
      addTearDown(container.dispose);

      await _settle(container);

      final state = container.read(diceProvider);
      expect(state.history.length, 1);
      expect(state.history.first.note, Note.e);
      expect(state.history.first.chordType, ChordType.maj7);
    });
  });

  group('clearHistory', () {
    setUp(() async {
      _fakePrefs = _resetPrefs();
    });

    test('clearHistory resets state and removes persisted data', () async {
      final (container, audio) = _makeContainer([
        _r(Note.c, ChordType.major),
        _r(Note.d, ChordType.minor),
        _r(Note.e, ChordType.maj7),
      ]);
      addTearDown(container.dispose);
      final notifier = container.read(diceProvider.notifier);

      // Roll a few times to build up history.
      for (var i = 0; i < 3; i++) {
        notifier.beginRoll();
        await notifier.settleRoll();
      }

      expect(container.read(diceProvider).history.length, 3);
      expect(await _fakePrefs.getString(_kHistoryKey), isNotNull);
      audio.calls.clear();

      await notifier.clearHistory();

      final state = container.read(diceProvider);
      expect(state.history, isEmpty);
      expect(state.current, isNull);
      expect(state.rollState, RollState.idle);
      expect(await _fakePrefs.getString(_kHistoryKey), isNull);
      expect(audio.calls, contains('stopAll'));
    });

    test('clearHistory is a no-op during rolling', () async {
      final (container, _) = _makeContainer([
        _r(Note.c, ChordType.major),
        _r(Note.d, ChordType.minor),
      ]);
      addTearDown(container.dispose);
      final notifier = container.read(diceProvider.notifier);

      // Build history then begin a roll without settling.
      notifier.beginRoll();
      await notifier.settleRoll();
      notifier.beginRoll();

      expect(container.read(diceProvider).rollState, RollState.rolling);
      final historyBefore = container.read(diceProvider).history.toList();

      notifier.clearHistory();

      // History must be unchanged — clearHistory is gated on rolling.
      expect(container.read(diceProvider).history, historyBefore);
      expect(container.read(diceProvider).rollState, RollState.rolling);
    });
  });

  group('DiceState equality', () {
    test('12. identical states are equal; differing states are not', () {
      final r1 = _r(Note.c, ChordType.major);
      final r2 = _r(Note.d, ChordType.minor);

      final a = DiceState(
        rollState: RollState.result,
        current: r1,
        history: [r1],
      );
      final b = DiceState(
        rollState: RollState.result,
        current: r1,
        history: [r1],
      );
      final c = DiceState(
        rollState: RollState.result,
        current: r2,
        history: [r1],
      );

      expect(a, equals(b));
      expect(a.hashCode, b.hashCode);
      expect(a, isNot(equals(c)));
    });
  });
}
