import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/chord.dart';
import '../providers/dice_provider.dart';
import '../providers/notation_provider.dart';
import '../services/audio_service.dart';
import '../widgets/vertical_history_strip.dart';
import '../widgets/vertical_piano_keyboard.dart';

/// Full-screen piano keyboard page.
///
/// Displays the chord name in the [AppBar] and renders a vertical 3-octave
/// [VerticalPianoKeyboard] (80% width). In the default rolled mode, reads the
/// current chord from [diceProvider] and shows a [VerticalHistoryStrip]
/// alongside the keyboard. When [previewChord] is non-null it drives the title
/// and keyboard highlights instead of the provider's settled result; pair with
/// `showHistory: false` to omit the history strip and let the keyboard fill the
/// full width.
///
/// Navigate here via [Navigator.push] from [HomeScreen].
class PianoScreen extends ConsumerWidget {
  const PianoScreen({
    super.key,
    this.previewChord,
    this.showHistory = true,
  });

  /// When non-null, drives the AppBar title and keyboard highlights instead of
  /// [diceProvider]'s settled result.
  final Chord? previewChord;

  /// Whether to render the [VerticalHistoryStrip] alongside the keyboard.
  /// Defaults to `true`. Pass `false` to show the keyboard only.
  final bool showHistory;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final diceState = ref.watch(diceProvider);
    final audio = ref.read(audioServiceProvider);
    final pref = ref.watch(notationProvider);

    final displayed = previewChord ?? diceState.current?.chord;

    return Scaffold(
      appBar: AppBar(
        title: Text(displayed?.nameFor(pref) ?? 'Piano'),
      ),
      body: SafeArea(
        child: showHistory
            ? Row(
                children: [
                  Expanded(
                    flex: 4, // 80%
                    child: VerticalPianoKeyboard(
                      highlightedNotes:
                          displayed?.chordNotesWithOctave ?? const [],
                      onKeyTap: audio.playSingleNote,
                    ),
                  ),
                  Expanded(
                    flex: 1, // 20%
                    // RotatedBox(quarterTurns: 1) rotates the strip 90° CW so
                    // that the internally-horizontal ListView appears as a
                    // vertical column. Pointer events are transformed by
                    // RotatedBox, so vertical swipes from the user arrive at
                    // the child as horizontal drags — no extra gesture wiring
                    // needed.
                    child: RotatedBox(
                      quarterTurns: 1,
                      child: VerticalHistoryStrip(
                        history: diceState.history,
                        activeResult: diceState.current,
                        onTap: (result) => ref
                            .read(diceProvider.notifier)
                            .replayFromHistory(result),
                      ),
                    ),
                  ),
                ],
              )
            : VerticalPianoKeyboard(
                highlightedNotes: displayed?.chordNotesWithOctave ?? const [],
                onKeyTap: audio.playSingleNote,
              ),
      ),
    );
  }
}
