import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/notation_provider.dart';
import '../utils/note_format.dart';

// ─── Note Layout Constants ─────────────────────────────────────────────────

/// White key notes across 3 octaves (C3–B5), top-to-bottom (C3 at top, B5 at bottom).
/// 21 keys total: 7 per octave × 3 octaves.
const _vWhiteKeys = [
  ('C', 3),
  ('D', 3),
  ('E', 3),
  ('F', 3),
  ('G', 3),
  ('A', 3),
  ('B', 3),
  ('C', 4),
  ('D', 4),
  ('E', 4),
  ('F', 4),
  ('G', 4),
  ('A', 4),
  ('B', 4),
  ('C', 5),
  ('D', 5),
  ('E', 5),
  ('F', 5),
  ('G', 5),
  ('A', 5),
  ('B', 5),
];

/// Black-key offsets within one vertical octave (low-to-high: C, D, E, F, G, A, B).
/// Each entry is `(noteName, slotIndex)` where `slotIndex` is the zero-based
/// index of the *upper* (lower-pitch) white key neighbor within that octave.
const _vBlackKeyOffsets = [
  ('C#', 0), // C# between C(0) and D(1)
  ('D#', 1), // D# between D(1) and E(2)
  ('F#', 3), // F# between F(3) and G(4)
  ('G#', 4), // G# between G(4) and A(5)
  ('A#', 5), // A# between A(5) and B(6)
];

/// Flat list of all 15 black keys: `(noteName, octave, verticalSlot)`.
/// `verticalSlot` is the index of the lower-pitch white-key neighbor in [_vWhiteKeys].
/// Position formula mirrors the horizontal keyboard: top = `(slot + 0.7) * keyHeight`.
final _allVBlackKeys = <(String, int, int)>[
  // Octave 3 — vertical slots 0–6
  for (final (note, offset) in _vBlackKeyOffsets) (note, 3, offset),
  // Octave 4 — vertical slots 7–13
  for (final (note, offset) in _vBlackKeyOffsets) (note, 4, offset + 7),
  // Octave 5 — vertical slots 14–20
  for (final (note, offset) in _vBlackKeyOffsets) (note, 5, offset + 14),
];

/// A 3-octave vertical piano keyboard (C3–B5) with chord-note highlighting.
///
/// Layout:
///   - 21 white keys as full-width horizontal bars, stacked top-to-bottom.
///     C3 is at the top, B5 is at the bottom (bass up, low notes first).
///   - 15 black keys overlaid from the **right** edge via a [Stack], each ~60%
///     of the total width and ~60% of one white key's height.
///
/// Keys in [highlightedNotes] are colored using the theme color scheme:
/// the first entry (index 0, the root note) uses [ColorScheme.primary];
/// all other entries use [ColorScheme.secondary]. Tapping any key fires
/// [onKeyTap] with the note name and octave for audio synthesis.
class VerticalPianoKeyboard extends ConsumerWidget {
  const VerticalPianoKeyboard({
    super.key,
    required this.highlightedNotes,
    required this.onKeyTap,
  });

  /// Chord tones to highlight. Entry at index 0 is the root note (highlighted
  /// with [ColorScheme.primary]); remaining entries use [ColorScheme.secondary].
  /// An empty list means no keys are highlighted.
  final List<(String note, int octave)> highlightedNotes;

  /// Called when a key is tapped with the note name and octave number.
  final void Function(String note, int octave) onKeyTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colorScheme = Theme.of(context).colorScheme;
    final pref = ref.watch(notationProvider);

    // Returns the highlight color for a given (noteName, octave) pair, or null
    // if the key is not in the chord. Index 0 → root → primary; others →
    // secondary. Matching is exact: both note name and octave must agree.
    Color? highlightColor(String noteName, int octave) {
      for (var i = 0; i < highlightedNotes.length; i++) {
        final (name, oct) = highlightedNotes[i];
        if (name == noteName && oct == octave) {
          return i == 0 ? colorScheme.primary : colorScheme.secondary;
        }
      }
      return null;
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final keyHeight = constraints.maxHeight / 21;
        final totalWidth = constraints.maxWidth;
        // The parent controls the width split (80/20 Row flex in PianoScreen).
        // This widget uses 100% of its allocated width; black keys are 60% of
        // that width and stay flush with the right edge.
        final effectiveWidth = totalWidth;

        return Stack(
          children: [
            // ── White Keys ───────────────────────────────────────────────
            for (var i = 0; i < _vWhiteKeys.length; i++)
              Positioned(
                top: i * keyHeight,
                left: 0,
                width: effectiveWidth,
                height: keyHeight,
                child: _WhiteKeyH(
                  noteName: _vWhiteKeys[i].$1,
                  displayLabel: formatNote(_vWhiteKeys[i].$1, pref),
                  octave: _vWhiteKeys[i].$2,
                  height: keyHeight,
                  highlightColor: highlightColor(
                    _vWhiteKeys[i].$1,
                    _vWhiteKeys[i].$2,
                  ),
                  onTap: () => onKeyTap(_vWhiteKeys[i].$1, _vWhiteKeys[i].$2),
                ),
              ),

            // ── Black Keys ───────────────────────────────────────────────
            // Overlay 15 black keys across C3–B5. Each black key is 60% as wide
            // as the effective width and 60% as tall as a white key, positioned
            // so its top edge sits 0.7 * keyHeight past its lower white-key
            // neighbor. `right: 0` keeps them flush with the keyboard's right edge.
            for (final (noteName, octave, slot) in _allVBlackKeys)
              Positioned(
                top: slot * keyHeight + keyHeight * 0.7,
                right: 0,
                width: effectiveWidth * 0.6,
                height: keyHeight * 0.6,
                child: _BlackKeyH(
                  noteName: noteName,
                  displayLabel: formatNote(noteName, pref),
                  octave: octave,
                  highlightColor: highlightColor(noteName, octave),
                  onTap: () => onKeyTap(noteName, octave),
                ),
              ),
          ],
        );
      },
    );
  }
}

// ─── White Key Widget (horizontal bar) ────────────────────────────────────

class _WhiteKeyH extends StatelessWidget {
  const _WhiteKeyH({
    required this.noteName,
    required this.displayLabel,
    required this.octave,
    required this.height,
    required this.highlightColor,
    required this.onTap,
  });

  final String noteName;
  final String displayLabel;
  final int octave;
  final double height;

  /// Highlight color from the theme, or null if this key is unhighlighted.
  final Color? highlightColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: height - 1, // 1px gap between keys
        margin: const EdgeInsets.only(bottom: 1),
        decoration: BoxDecoration(
          color: highlightColor ?? Colors.white,
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(4),
            bottomLeft: Radius.circular(4),
          ),
          boxShadow: highlightColor != null
              ? [
                  BoxShadow(
                    color: highlightColor!.withValues(alpha: 0.6),
                    blurRadius: 12,
                    spreadRadius: 2,
                  )
                ]
              : null,
        ),
        alignment: Alignment.centerLeft,
        padding: const EdgeInsets.only(left: 6),
        child: highlightColor != null
            ? RotatedBox(
                quarterTurns: 1,
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(
                    displayLabel,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.surface,
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              )
            : null,
      ),
    );
  }
}

// ─── Black Key Widget (horizontal bar) ────────────────────────────────────

class _BlackKeyH extends StatelessWidget {
  const _BlackKeyH({
    required this.noteName,
    required this.displayLabel,
    required this.octave,
    required this.highlightColor,
    required this.onTap,
  });

  final String noteName;
  final String displayLabel;
  final int octave;

  /// Highlight color from the theme, or null if this key is unhighlighted.
  final Color? highlightColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        alignment: Alignment.centerLeft,
        padding: const EdgeInsets.only(left: 4),
        decoration: BoxDecoration(
          color: highlightColor ?? const Color(0xFF1A1A1A),
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(3),
            bottomLeft: Radius.circular(3),
          ),
          boxShadow: highlightColor != null
              ? [
                  BoxShadow(
                    color: highlightColor!.withValues(alpha: 0.8),
                    blurRadius: 16,
                    spreadRadius: 3,
                  )
                ]
              : [
                  const BoxShadow(
                    color: Colors.black45,
                    blurRadius: 4,
                    offset: Offset(-2, 0), // leftward depth shadow
                  )
                ],
        ),
        child: RotatedBox(
          quarterTurns: 1,
          child: FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              displayLabel,
              style: TextStyle(
                color: highlightColor != null
                    ? Theme.of(context).colorScheme.surface
                    : Colors.white54,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
