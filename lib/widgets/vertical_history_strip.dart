import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../models/dice_result.dart';
import 'history_chip.dart';

/// A chord-history strip for [PianoScreen].
///
/// Each chip shows the compact chord symbol (e.g. "Am7").
/// Tapping replays that chord's audio and re-displays its info card.
///
/// Newest entries appear at index 0.
///
/// **Rendering note:** internally this is a *horizontal* [ListView] designed
/// to be wrapped in `RotatedBox(quarterTurns: 1)` by its parent.  The 90° CW
/// rotation makes the strip appear vertical on screen and — because
/// `RotatedBox` transforms pointer events — a vertical swipe from the user
/// correctly arrives at the child [ListView] as a horizontal drag, so
/// scrolling feels natural without any extra gesture wiring.
///
/// [activeResult] is matched by identity (using [DiceResult.==], which
/// includes [DiceResult.rolledAt]) to highlight the currently-active chip
/// with a `primaryContainer` fill and `primary` border.
///
/// When a new roll settles and prepends a chip at index 0, the strip
/// auto-scrolls back to position 0 (leftmost = newest) — but only if the
/// user had scrolled away (i.e. `offset > 0`). Tap-replay does not trigger
/// a scroll because it does not change [history.length] or [history.first].
class VerticalHistoryStrip extends StatefulWidget {
  const VerticalHistoryStrip({
    super.key,
    required this.history,
    required this.onTap,
    required this.activeResult,
  });

  final List<DiceResult> history;
  final void Function(DiceResult result) onTap;

  /// The result currently displayed (i.e. [DiceState.current]).
  ///
  /// The chip whose [DiceResult] equals this value is rendered with the
  /// accent highlight. `null` means no chip is highlighted (e.g. before the
  /// first roll).
  final DiceResult? activeResult;

  @override
  State<VerticalHistoryStrip> createState() => _VerticalHistoryStripState();
}

class _VerticalHistoryStripState extends State<VerticalHistoryStrip> {
  final ScrollController _scrollController = ScrollController();

  @override
  void didUpdateWidget(VerticalHistoryStrip oldWidget) {
    super.didUpdateWidget(oldWidget);
    // A new roll prepends a chip at index 0. Below max capacity this grows the
    // list; at max capacity (20 entries) length stays constant but the first
    // entry changes. Tap-replay changes only activeResult — neither length nor
    // history.first changes — so it correctly does not trigger a scroll.
    final newRollBelowCap = widget.history.length > oldWidget.history.length;
    final newRollAtCap = widget.history.length == oldWidget.history.length &&
        widget.history.isNotEmpty &&
        oldWidget.history.isNotEmpty &&
        widget.history.first != oldWidget.history.first;
    if ((newRollBelowCap || newRollAtCap) &&
        _scrollController.hasClients &&
        _scrollController.offset > 0) {
      _scrollController.animateTo(
        0,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      controller: _scrollController,
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 18),
      itemCount: widget.history.length,
      separatorBuilder: (_, __) => const SizedBox(width: 6),
      itemBuilder: (context, index) {
        final result = widget.history[index];
        return HistoryChip(
          result: result,
          isActive: result == widget.activeResult,
          animationDelay: (index * 40).ms,
          slideAxis: Axis.vertical,
          onTap: () => widget.onTap(result),
        );
      },
    );
  }
}
