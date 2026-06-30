import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/chord.dart';
import '../models/notation_preference.dart';
import '../providers/notation_provider.dart';

/// Displays the current chord: symbol on the left, note pills to its right,
/// and the full chord name below both — all in a compact horizontal banner.
///
/// Uses [AnimatedSwitcher] so the card fades + slides in on first roll and
/// cross-fades cleanly on every subsequent roll.
class ChordInfoCard extends ConsumerWidget {
  const ChordInfoCard({super.key, required this.chord});

  final Chord? chord;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pref = ref.watch(notationProvider);
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 400),
      transitionBuilder: (child, animation) => FadeTransition(
        opacity: animation,
        child: SlideTransition(
          position: Tween<Offset>(
            begin: const Offset(0, -0.15),
            end: Offset.zero,
          ).animate(CurvedAnimation(parent: animation, curve: Curves.easeOut)),
          child: child,
        ),
      ),
      child: chord == null
          ? const SizedBox.shrink()
          : _CardContent(
              key: ValueKey((chord, pref)),
              chord: chord!,
              pref: pref,
            ),
    );
  }
}

class _CardContent extends StatelessWidget {
  const _CardContent({super.key, required this.chord, required this.pref});

  final Chord chord;
  final NotationPreference pref;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Symbol + Note Pills row ───────────────────────────────────────
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Chord symbol (e.g. "Cm", "G7", "Bbmaj7")
                Text(
                  chord.shortNameFor(pref),
                  style: Theme.of(context).textTheme.displaySmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        height: 1,
                      ),
                ),
                const SizedBox(width: 14),
                // Vertical rule separator
                Container(
                  width: 1,
                  height: 28,
                  color: Theme.of(context).colorScheme.outlineVariant,
                ),
                const SizedBox(width: 14),
                // Note pills — flex so they wrap naturally if many notes
                Expanded(
                  child: Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: chord
                        .chordNotesFor(pref)
                        .map((note) => _NotePill(note: note))
                        .toList(),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            // ── Full chord name beneath symbol + pills ────────────────────────
            Text(
              chord.nameFor(pref),
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    letterSpacing: 0.8,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NotePill extends StatelessWidget {
  const _NotePill({required this.note});

  final String note;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: cs.secondary.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: cs.secondary.withValues(alpha: 0.45)),
      ),
      child: Text(
        note,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: cs.secondary,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.4,
            ),
      ),
    );
  }
}
