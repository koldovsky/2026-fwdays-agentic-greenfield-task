import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart'
    show SharedPreferencesAsync;
import 'package:shared_preferences_platform_interface/in_memory_shared_preferences_async.dart';
import 'package:shared_preferences_platform_interface/shared_preferences_async_platform_interface.dart';

import 'package:chord_dice/models/arpeggio_pattern.dart';
import 'package:chord_dice/models/chord.dart';
import 'package:chord_dice/models/chord_type.dart';
import 'package:chord_dice/models/note.dart';
import 'package:chord_dice/providers/arpeggio_provider.dart';
import 'package:chord_dice/providers/chord_selection_provider.dart';
import 'package:chord_dice/providers/theme_provider.dart';
import 'package:chord_dice/screens/chord_reference_screen.dart';
import 'package:chord_dice/screens/piano_screen.dart';
import 'package:chord_dice/services/audio_service.dart';

class _RecordingAudioService implements AudioService {
  final List<Chord> playedChords = [];
  final List<(Chord, ArpeggioPattern)> playedArpeggios = [];

  @override
  Future<void> init() async {}

  @override
  Future<void> playChord(Chord chord) async {
    playedChords.add(chord);
  }

  @override
  Future<void> playArpeggio(Chord chord, ArpeggioPattern pattern) async {
    playedArpeggios.add((chord, pattern));
  }

  @override
  Future<void> playSingleNote(String note, int octave) async {}

  @override
  Future<void> stopAll() async {}

  @override
  void dispose() {}
}

SharedPreferencesAsync _resetPrefs() {
  SharedPreferencesAsyncPlatform.instance =
      InMemorySharedPreferencesAsync.withData(const {});
  return SharedPreferencesAsync();
}

Future<void> _pumpScreen(
  WidgetTester tester, {
  required _RecordingAudioService audio,
  required SharedPreferencesAsync prefs,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
        audioServiceProvider.overrideWithValue(audio),
      ],
      child: const MaterialApp(home: ChordReferenceScreen()),
    ),
  );
  // Let microtask-scheduled prefs hydration complete.
  await tester.pump();
  await tester.pump();
}

void main() {
  testWidgets('counter pill reflects default count of 20 / 20', (tester) async {
    final audio = _RecordingAudioService();
    final prefs = _resetPrefs();
    await _pumpScreen(tester, audio: audio, prefs: prefs);
    expect(find.text('20 / 20'), findsOneWidget);
  });

  testWidgets('renders all 10 category section headers', (tester) async {
    final audio = _RecordingAudioService();
    final prefs = _resetPrefs();
    await _pumpScreen(tester, audio: audio, prefs: prefs);

    // Scroll through to let each lazily-built section header appear. We search
    // for a representative subset — the first (TRIADS) is always visible, and
    // HYBRID / MISC requires scrolling.
    expect(find.text('TRIADS'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('HYBRID / MISC'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('HYBRID / MISC'), findsOneWidget);
  });

  testWidgets(
      'play button triggers AudioService.playChord with C root when arpeggio disabled',
      (tester) async {
    final audio = _RecordingAudioService();
    final prefs = _resetPrefs();
    await _pumpScreen(tester, audio: audio, prefs: prefs);

    // Tap the play button on the first row (Major — first in the catalog).
    final firstPlayButton = find.byIcon(Icons.play_arrow_rounded).first;
    await tester.tap(firstPlayButton);
    await tester.pump();

    expect(audio.playedChords.length, 1);
    expect(audio.playedChords.first.root, Note.c);
    expect(audio.playedChords.first.type, ChordType.major);
    expect(audio.playedArpeggios, isEmpty);
  });

  testWidgets(
      'play button routes through playArpeggio when arpeggio mode is enabled',
      (tester) async {
    final audio = _RecordingAudioService();
    final prefs = _resetPrefs();

    final container = ProviderContainer(overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      audioServiceProvider.overrideWithValue(audio),
    ]);
    addTearDown(container.dispose);

    // Turn arpeggio on + pick a non-default pattern so we can assert it is
    // threaded through to the audio call.
    await container.read(arpeggioProvider.notifier).setEnabled(true);
    await container
        .read(arpeggioProvider.notifier)
        .setPattern(ArpeggioPattern.downUp);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(home: ChordReferenceScreen()),
      ),
    );
    await tester.pump();
    await tester.pump();

    final firstPlayButton = find.byIcon(Icons.play_arrow_rounded).first;
    await tester.tap(firstPlayButton);
    await tester.pump();

    expect(audio.playedChords, isEmpty);
    expect(audio.playedArpeggios.length, 1);
    final (playedChord, pattern) = audio.playedArpeggios.first;
    expect(playedChord.root, Note.c);
    expect(playedChord.type, ChordType.major);
    expect(pattern, ArpeggioPattern.downUp);
  });

  testWidgets('tapping checkbox toggles selection in provider', (tester) async {
    final audio = _RecordingAudioService();
    final prefs = _resetPrefs();

    final container = ProviderContainer(overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      audioServiceProvider.overrideWithValue(audio),
    ]);
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(home: ChordReferenceScreen()),
      ),
    );
    await tester.pump();
    await tester.pump();

    final initialCount = container.read(chordSelectionProvider).active.length;
    expect(initialCount, 20);

    // Tap the first checkbox (Major row). The default selection has Major
    // active, so this should remove it (20 → 19).
    final firstCheckbox = find.byType(Checkbox).first;
    await tester.tap(firstCheckbox);
    await tester.pump();

    final afterCount = container.read(chordSelectionProvider).active.length;
    expect(afterCount, 19);
    expect(
      container.read(chordSelectionProvider).isActive(ChordType.major),
      false,
    );
  });

  // ─── T6–T9: 🎹 piano preview button ───

  testWidgets('T6: piano_outlined button renders on chord rows',
      (tester) async {
    final audio = _RecordingAudioService();
    final prefs = _resetPrefs();
    await _pumpScreen(tester, audio: audio, prefs: prefs);

    // At least one piano button is visible in the initial viewport.
    expect(find.byIcon(Icons.piano_outlined), findsWidgets);

    // Scroll to the end; piano buttons still appear there.
    await tester.scrollUntilVisible(
      find.text('HYBRID / MISC'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.byIcon(Icons.piano_outlined), findsWidgets);
  });

  testWidgets(
      'T7: tapping piano button pushes PianoScreen with correct preview config',
      (tester) async {
    final audio = _RecordingAudioService();
    final prefs = _resetPrefs();
    await _pumpScreen(tester, audio: audio, prefs: prefs);

    // Tap the first piano button (Major row — first chord in the catalog).
    await tester.tap(find.byIcon(Icons.piano_outlined).first);
    await tester.pumpAndSettle();

    // PianoScreen was pushed.
    expect(find.byType(PianoScreen), findsOneWidget);
    final screen = tester.widget<PianoScreen>(find.byType(PianoScreen));
    expect(screen.previewChord?.root, Note.c);
    expect(screen.previewChord?.type, ChordType.major);
    expect(screen.showHistory, false);

    // AppBar title uses the preview chord name (default sharps notation).
    expect(find.text('C Major'), findsOneWidget);
  });

  testWidgets('T8: tapping piano button does not trigger audio',
      (tester) async {
    final audio = _RecordingAudioService();
    final prefs = _resetPrefs();
    await _pumpScreen(tester, audio: audio, prefs: prefs);

    await tester.tap(find.byIcon(Icons.piano_outlined).first);
    await tester.pumpAndSettle();

    expect(audio.playedChords, isEmpty);
    expect(audio.playedArpeggios, isEmpty);
  });

  testWidgets('T9: piano button navigates even when row is locked at min-count',
      (tester) async {
    final audio = _RecordingAudioService();
    final prefs = _resetPrefs();

    final container = ProviderContainer(overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      audioServiceProvider.overrideWithValue(audio),
    ]);
    addTearDown(container.dispose);

    // Reduce selection from 20 down to 3, keeping major / minor / dom7.
    for (final ct in const [
      ChordType.maj7,
      ChordType.min7,
      ChordType.sus2,
      ChordType.sus4,
      ChordType.dim,
      ChordType.aug,
      ChordType.min9,
      ChordType.maj9,
      ChordType.add9,
      ChordType.sixth,
      ChordType.min6,
      ChordType.dom9,
      ChordType.halfDim,
      ChordType.dim7,
      ChordType.min11,
      ChordType.minMaj7,
      ChordType.power5,
    ]) {
      container.read(chordSelectionProvider.notifier).toggle(ct);
    }

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(home: ChordReferenceScreen()),
      ),
    );
    await tester.pump();
    await tester.pump();

    // Selection is at min boundary.
    expect(container.read(chordSelectionProvider).active.length, 3);

    // The Major row is active at min-count → locked (Opacity 0.5).
    final lockedRow = find.ancestor(
      of: find.text('Major'),
      matching: find.byWidgetPredicate(
        (w) => w is Opacity && w.opacity == 0.5,
      ),
    );
    expect(lockedRow, findsOneWidget);

    // Piano button is present on the locked row and still navigates.
    final pianoBtn = find.descendant(
      of: lockedRow,
      matching: find.byIcon(Icons.piano_outlined),
    );
    expect(pianoBtn, findsOneWidget);
    await tester.tap(pianoBtn);
    await tester.pumpAndSettle();

    expect(find.byType(PianoScreen), findsOneWidget);
  });

  testWidgets('at maxCount boundary, tapping an inactive chord no-ops',
      (tester) async {
    final audio = _RecordingAudioService();
    final prefs = _resetPrefs();

    final container = ProviderContainer(overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      audioServiceProvider.overrideWithValue(audio),
    ]);
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(home: ChordReferenceScreen()),
      ),
    );
    await tester.pump();
    await tester.pump();

    // Default: 20 active. Find an inactive chord's row (maj13 is not in
    // kDefaultChordSelection) and try to toggle it on.
    await tester.scrollUntilVisible(
      find.text('Major 13'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    // Find the Major 13 row and tap its checkbox.
    final maj13Row = find.ancestor(
      of: find.text('Major 13'),
      matching: find.byType(ListTile),
    );
    final maj13Checkbox = find.descendant(
      of: maj13Row,
      matching: find.byType(Checkbox),
    );
    await tester.tap(maj13Checkbox);
    await tester.pump();

    // Still 20 — the toggle was a silent no-op at the boundary.
    expect(
      container.read(chordSelectionProvider).active.length,
      20,
    );
    expect(
      container.read(chordSelectionProvider).isActive(ChordType.maj13),
      false,
    );
  });
}
