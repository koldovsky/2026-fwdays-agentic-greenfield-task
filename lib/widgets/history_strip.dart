import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../models/dice_result.dart';
import 'history_chip.dart';

/// A horizontally-scrollable row of past chord chips.
///
/// Each chip shows the compact chord symbol (e.g. "Am7").
/// Tapping replays that chord's audio and re-displays its info card.
///
/// Newest entries appear on the left (index 0 = most recent).
///
/// [activeResult] is matched by identity (using [DiceResult.==], which
/// includes [DiceResult.rolledAt]) to highlight the currently-active chip
/// with a `primaryContainer` fill and `primary` border.
///
/// When a new roll settles and prepends a chip at index 0, the strip
/// auto-scrolls back to the start — but only if the user had scrolled away
/// (i.e. `offset > 0`). Tap-replay does not trigger a scroll because it
/// does not change [history.length].
class HistoryStrip extends StatefulWidget {
  const HistoryStrip({
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
  State<HistoryStrip> createState() => _HistoryStripState();
}

class _HistoryStripState extends State<HistoryStrip> {
  final ScrollController _scrollController = ScrollController();

  @override
  void didUpdateWidget(HistoryStrip oldWidget) {
    super.didUpdateWidget(oldWidget);
    // A new roll prepends a chip, increasing history length. Tap-replay
    // changes only activeResult and leaves length unchanged — skip scroll.
    if (widget.history.length > oldWidget.history.length &&
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
    return SizedBox(
      height: 48,
      child: ListView.separated(
        controller: _scrollController,
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        itemCount: widget.history.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final result = widget.history[index];
          return HistoryChip(
            result: result,
            isActive: result == widget.activeResult,
            animationDelay: (index * 40).ms,
            slideAxis: Axis.horizontal,
            onTap: () => widget.onTap(result),
          );
        },
      ),
    );
  }
}
