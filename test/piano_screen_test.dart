import 'dart:convert';

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
import 'package:chord_dice/models/notation_preference.dart';
import 'package:chord_dice/providers/notation_provider.dart';
import 'package:chord_dice/providers/theme_provider.dart';
import 'package:chord_dice/screens/piano_screen.dart';
import 'package:chord_dice/services/audio_service.dart';
import 'package:chord_dice/widgets/vertical_history_strip.dart';
import 'package:chord_dice/widgets/vertical_piano_keyboard.dart';

class _SilentAudioService implements AudioService {
  int playChordCalls = 0;
  int playArpeggioCalls = 0;

  @override
  Future<void> init() async {}

  @override
  Future<void> playChord(Chord chord) async => playChordCalls++;

  @override
  Future<void> playArpeggio(Chord chord, ArpeggioPattern pattern) async =>
      playArpeggioCalls++;

  @override
  Future<void> playSingleNote(String note, int octave) async {}

  @override
  Future<void> stopAll() async {}

  @override
  void dispose() {}
}

SharedPreferencesAsync _resetPrefs({Map<String, Object> initial = const {}}) {
  SharedPreferencesAsyncPlatform.instance =
      InMemorySharedPreferencesAsync.withData(initial);
  return SharedPreferencesAsync();
}

/// Reads [VerticalPianoKeyboard.highlightedNotes] from the widget tree.
Set<(String, int)> _highlightedOf(WidgetTester tester) {
  final piano = tester.widget<VerticalPianoKeyboard>(
    find.byType(VerticalPianoKeyboard),
  );
  return Set.of(piano.highlightedNotes);
}

void main() {
  // T1 — default ctor, no rolled chord: fallback title + history strip present
  testWidgets(
      'T1: default ctor, no chord rolled — AppBar shows Piano, history strip present, no highlights',
      (tester) async {
    final audio = _SilentAudioService();
    final prefs = _resetPrefs();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          audioServiceProvider.overrideWithValue(audio),
        ],
        child: const MaterialApp(home: PianoScreen()),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(find.text('Piano'), findsOneWidget);
    expect(find.byType(VerticalHistoryStrip), findsOneWidget);
    expect(_highlightedOf(tester), isEmpty);
    expect(audio.playChordCalls, 0);
    expect(audio.playArpeggioCalls, 0);
  });

  // T2 — default ctor with C Major in diceState.current (seeded via prefs)
  testWidgets(
      'T2: default ctor with C Major in history — title and highlights reflect rolled chord',
      (tester) async {
    final audio = _SilentAudioService();
    final prefs = _resetPrefs(initial: {
      'dice_history': jsonEncode([
        {
          'note': 'c',
          'chordType': 'major',
          'rolledAt': '2026-06-30T00:00:00.000',
        },
      ]),
    });

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          audioServiceProvider.overrideWithValue(audio),
        ],
        child: const MaterialApp(home: PianoScreen()),
      ),
    );
    // pumpWidget: DiceNotifier.build() runs, Future.microtask(_loadHistoryAsync) scheduled.
    // First pump: microtask fires, _loadHistoryAsync starts, awaits prefs.getString.
    // Second pump: prefs.getString resolves, state updated.
    // Third pump: rebuild with hydrated state.
    await tester.pump();
    await tester.pump();
    await tester.pump();

    expect(find.text('C Major'), findsOneWidget);
    expect(find.byType(VerticalHistoryStrip), findsOneWidget);
    expect(
      _highlightedOf(tester),
      Set.of(const Chord(root: Note.c, type: ChordType.major)
          .chordNotesWithOctave),
    );
    expect(audio.playChordCalls, 0);
    expect(audio.playArpeggioCalls, 0);
    // Drain HistoryChip flutter_animate entrance timers (200 ms fadeIn/slideX).
    await tester.pumpAndSettle();
  });

  // T3 — previewChord non-null, showHistory: false
  testWidgets(
      'T3: previewChord C Major, showHistory: false — chord drives title and highlights, no history strip',
      (tester) async {
    final audio = _SilentAudioService();
    final prefs = _resetPrefs();
    const previewChord = Chord(root: Note.c, type: ChordType.major);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          audioServiceProvider.overrideWithValue(audio),
        ],
        child: const MaterialApp(
          home: PianoScreen(previewChord: previewChord, showHistory: false),
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(find.text('C Major'), findsOneWidget);
    expect(find.byType(VerticalHistoryStrip), findsNothing);
    expect(find.byType(VerticalPianoKeyboard), findsOneWidget);
    expect(_highlightedOf(tester), Set.of(previewChord.chordNotesWithOctave));
    expect(audio.playChordCalls, 0);
    expect(audio.playArpeggioCalls, 0);
  });

  // T4 — notation reactivity: title respells when notationProvider flips to flats
  testWidgets(
      'T4: preview mode — AppBar title re-spells to flat notation after notation flip',
      (tester) async {
    final audio = _SilentAudioService();
    final prefs = _resetPrefs();
    // F# half-diminished: 'F#' in sharps, 'Gb' in flats
    const previewChord = Chord(root: Note.fSharp, type: ChordType.halfDim);

    final container = ProviderContainer(overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      audioServiceProvider.overrideWithValue(audio),
    ]);
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(
          home: PianoScreen(previewChord: previewChord),
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    // Check AppBar title specifically — piano key labels also contain 'F#'.
    expect(
      find.descendant(
        of: find.byType(AppBar),
        matching: find.textContaining('F#'),
      ),
      findsOneWidget,
    );

    await container
        .read(notationProvider.notifier)
        .setPreference(NotationPreference.flats);
    await tester.pump();

    expect(
      find.descendant(
        of: find.byType(AppBar),
        matching: find.textContaining('F#'),
      ),
      findsNothing,
    );
    expect(
      find.descendant(
        of: find.byType(AppBar),
        matching: find.textContaining('Gb'),
      ),
      findsOneWidget,
    );
    expect(audio.playChordCalls, 0);
    expect(audio.playArpeggioCalls, 0);
  });

  // T5 — orthogonality: previewChord + showHistory: true are independent params
  testWidgets(
      'T5: previewChord + showHistory: true — history strip present, keyboard highlights from preview not diceState',
      (tester) async {
    final audio = _SilentAudioService();
    // Seed diceState with A Minor to distinguish from the preview chord.
    final prefs = _resetPrefs(initial: {
      'dice_history': jsonEncode([
        {
          'note': 'a',
          'chordType': 'minor',
          'rolledAt': '2026-06-30T00:00:00.000',
        },
      ]),
    });
    const previewChord = Chord(root: Note.c, type: ChordType.major);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          audioServiceProvider.overrideWithValue(audio),
        ],
        child: const MaterialApp(
          home: PianoScreen(previewChord: previewChord, showHistory: true),
        ),
      ),
    );
    await tester.pump();
    await tester.pump();
    await tester.pump();

    // Title comes from previewChord (C Major), not from diceState.current (A Minor).
    expect(find.text('C Major'), findsOneWidget);
    expect(find.text('A Minor'), findsNothing);

    // History strip is present because showHistory: true.
    expect(find.byType(VerticalHistoryStrip), findsOneWidget);

    // Keyboard highlights are from previewChord (C Major), not A Minor.
    final cMajorNotes = Set.of(previewChord.chordNotesWithOctave);
    final aMinorNotes = Set.of(
      const Chord(root: Note.a, type: ChordType.minor).chordNotesWithOctave,
    );
    expect(_highlightedOf(tester), cMajorNotes);
    expect(_highlightedOf(tester), isNot(aMinorNotes));
    expect(audio.playChordCalls, 0);
    expect(audio.playArpeggioCalls, 0);
    // Drain HistoryChip flutter_animate entrance timers (200 ms fadeIn/slideX).
    await tester.pumpAndSettle();
  });
}
