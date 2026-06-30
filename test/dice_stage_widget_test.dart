import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:chord_dice/constants.dart';
import 'package:chord_dice/widgets/dice_stage.dart';

void main() {
  testWidgets('DiceStage fires onSettled once after animation completes',
      (tester) async {
    var settleCalls = 0;

    final noteLabels = List.generate(12, (i) => 'N$i');
    final chordLabels = List.generate(20, (i) => 'C$i');

    // Initial pump with rolling=false to establish the baseline state.
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: DiceStage(
          noteLabels: noteLabels,
          chordLabels: chordLabels,
          noteIndex: 3,
          chordIndex: 7,
          rolling: false,
          onSettled: () => settleCalls++,
        ),
      ),
    ));

    // Pump one frame for the LayoutBuilder to observe a stage size.
    await tester.pump();

    // Flip to rolling=true with different target indices — this
    // triggers didUpdateWidget → _startRoll.
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: DiceStage(
          noteLabels: noteLabels,
          chordLabels: chordLabels,
          noteIndex: 5,
          chordIndex: 11,
          rolling: true,
          onSettled: () => settleCalls++,
        ),
      ),
    ));

    // Let the first build fire the pending roll and advance past the
    // animation duration.
    await tester.pump();
    await tester
        .pump(kRollAnimationDuration + const Duration(milliseconds: 50));

    expect(settleCalls, 1);
  });

  testWidgets('DiceStage does not fire onSettled when rolling stays false',
      (tester) async {
    var settleCalls = 0;

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: DiceStage(
          noteLabels: List.generate(12, (i) => 'N$i'),
          chordLabels: List.generate(20, (i) => 'C$i'),
          noteIndex: 0,
          chordIndex: 0,
          rolling: false,
          onSettled: () => settleCalls++,
        ),
      ),
    ));

    await tester.pump();
    await tester
        .pump(kRollAnimationDuration + const Duration(milliseconds: 50));

    expect(settleCalls, 0);
  });
}
