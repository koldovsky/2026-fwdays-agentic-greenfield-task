import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/chord.dart';
import '../models/chord_category.dart';
import '../models/chord_selection.dart';
import '../models/chord_type.dart';
import '../models/note.dart';
import '../providers/arpeggio_provider.dart';
import '../providers/chord_selection_provider.dart';
import '../services/audio_service.dart';
import 'piano_screen.dart';

/// The Chords screen — renders all 52 [ChordType] values grouped by
/// [ChordCategory], with:
///
///   • a leading [Checkbox] that toggles whether the chord is in the user's
///     active D20 roll set (3 – 20 chords), silently no-op at the
///     [ChordSelection.minCount] / [ChordSelection.maxCount] boundaries,
///   • an AppBar counter pill showing the active count,
///   • a trailing play button that previews the chord rooted on [Note.c].
class ChordReferenceScreen extends ConsumerWidget {
  const ChordReferenceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cs = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final selection = ref.watch(chordSelectionProvider);

    // Flat list of entries so ListView.builder can render category headers and
    // chord rows without nesting Columns of ListViews. Each entry is either a
    // [ChordCategory] (renders a section header) or a [ChordType] (renders a
    // selectable row).
    final entries = <Object>[];
    for (final category in ChordCategory.values) {
      final chords = ChordType.values
          .where((c) => c.category == category)
          .toList(growable: false);
      if (chords.isEmpty) continue;
      entries.add(category);
      entries.addAll(chords);
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Chords'),
        actions: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: _SelectionCounterPill(count: selection.active.length),
          ),
        ],
      ),
      body: ListView.builder(
        itemCount: entries.length,
        itemBuilder: (context, index) {
          final entry = entries[index];
          if (entry is ChordCategory) {
            return Padding(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
              child: Text(
                entry.displayName.toUpperCase(),
                style: textTheme.labelLarge?.copyWith(
                  color: cs.primary,
                  letterSpacing: 1.2,
                ),
              ),
            );
          }
          final chordType = entry as ChordType;
          return _ChordRow(
            chordType: chordType,
            selection: selection,
          );
        },
      ),
    );
  }
}

/// Pill in the AppBar showing "N / 20" active chords. Background tint depends
/// on whether the user has filled the die (primary) or is partial
/// (secondaryContainer).
class _SelectionCounterPill extends StatelessWidget {
  const _SelectionCounterPill({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final full = count >= ChordSelection.maxCount;
    final background = full ? cs.primary : cs.secondaryContainer;
    final foreground = full ? cs.onPrimary : cs.onSecondaryContainer;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        '$count / ${ChordSelection.maxCount}',
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: foreground,
              fontWeight: FontWeight.w600,
            ),
      ),
    );
  }
}

/// A single chord row: checkbox + display name + intervals + symbol badge +
/// play preview button.
class _ChordRow extends ConsumerWidget {
  const _ChordRow({
    required this.chordType,
    required this.selection,
  });

  final ChordType chordType;
  final ChordSelection selection;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cs = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final isActive = selection.isActive(chordType);
    // Locked when toggling this row would violate min/max invariants.
    final locked =
        (isActive && selection.active.length <= ChordSelection.minCount) ||
            (!isActive && selection.active.length >= ChordSelection.maxCount);

    final symbolWidget = Text(
      chordType.symbol.isEmpty ? '\u2014' : chordType.symbol,
      style: textTheme.titleMedium?.copyWith(color: cs.primary),
    );

    return Opacity(
      opacity: locked ? 0.5 : 1.0,
      child: ListTile(
        onTap: () {
          ref.read(chordSelectionProvider.notifier).toggle(chordType);
        },
        leading: Checkbox(
          value: isActive,
          onChanged: (_) {
            ref.read(chordSelectionProvider.notifier).toggle(chordType);
          },
        ),
        title: Text(chordType.displayName),
        subtitle: Text('Intervals: ${chordType.intervals.join(', ')}'),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            symbolWidget,
            const SizedBox(width: 8),
            IconButton(
              tooltip: 'Preview on C',
              icon: const Icon(Icons.play_arrow_rounded),
              onPressed: () {
                final preview = Chord(root: Note.c, type: chordType);
                // Match the roll-lifecycle playback mode: if the user has
                // arpeggio mode on in Settings, preview as an arpeggio using
                // the same pattern; otherwise play as a block chord. Fire and
                // forget — AudioService handles its own lifecycle.
                final arp = ref.read(arpeggioProvider);
                final audio = ref.read(audioServiceProvider);
                if (arp.enabled) {
                  audio.playArpeggio(preview, arp.pattern);
                } else {
                  audio.playChord(preview);
                }
              },
            ),
            IconButton(
              tooltip: 'Preview on keyboard',
              icon: const Icon(Icons.piano_outlined),
              onPressed: () {
                final preview = Chord(root: Note.c, type: chordType);
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => PianoScreen(
                      previewChord: preview,
                      showHistory: false,
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
