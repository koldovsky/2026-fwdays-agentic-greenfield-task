import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/chord.dart';
import '../models/dice_result.dart';
import '../providers/notation_provider.dart';

/// A single chip in a history strip (horizontal or vertical).
///
/// Renders the compact chord symbol (e.g. "Am7") with active/inactive
/// color states and an entrance animation whose slide direction is
/// determined by [slideAxis].
class HistoryChip extends ConsumerWidget {
  const HistoryChip({
    super.key,
    required this.result,
    required this.isActive,
    required this.animationDelay,
    required this.slideAxis,
    required this.onTap,
    this.contentPadding,
    this.outerMargin,
    this.fontSize,
    this.textAlign,
  });

  /// The roll snapshot to display.
  final DiceResult result;

  /// Whether this chip represents the currently-active result.
  ///
  /// When `true`, the chip is rendered with a `primaryContainer` fill,
  /// `primary` border, and `onPrimaryContainer` text to distinguish it from
  /// the inactive `surface`/`outlineVariant` style.
  final bool isActive;

  /// Entrance animation delay — stagger chips by 40 ms each.
  final Duration animationDelay;

  /// Determines slide direction for the entrance animation and per-axis
  /// default values for padding, margin, font size, and text alignment.
  ///
  /// - [Axis.horizontal]: slide-X entrance, padding (14, 8), no margin,
  ///   fontSize 13, no forced textAlign.
  /// - [Axis.vertical]: slide-Y entrance, padding (12, 8), horizontal
  ///   margin 4, fontSize 22, textAlign center.
  final Axis slideAxis;

  /// Called when the chip is tapped.
  final VoidCallback onTap;

  /// Overrides the per-axis default inner padding.
  final EdgeInsetsGeometry? contentPadding;

  /// Overrides the per-axis default outer margin.
  final EdgeInsetsGeometry? outerMargin;

  /// Overrides the per-axis default font size.
  final double? fontSize;

  /// Overrides the per-axis default text alignment.
  final TextAlign? textAlign;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pref = ref.watch(notationProvider);
    final cs = Theme.of(context).colorScheme;

    final EdgeInsetsGeometry padding;
    final EdgeInsetsGeometry? margin;
    final double resolvedFontSize;
    final TextAlign? resolvedTextAlign;

    switch (slideAxis) {
      case Axis.horizontal:
        padding = contentPadding ??
            const EdgeInsets.symmetric(horizontal: 14, vertical: 8);
        margin = outerMargin;
        resolvedFontSize = fontSize ?? 13;
        resolvedTextAlign = textAlign;
      case Axis.vertical:
        padding = contentPadding ??
            const EdgeInsets.symmetric(horizontal: 12, vertical: 8);
        margin = outerMargin ?? const EdgeInsets.symmetric(horizontal: 4);
        resolvedFontSize = fontSize ?? 22;
        resolvedTextAlign = textAlign ?? TextAlign.center;
    }

    final chip = GestureDetector(
      onTap: onTap,
      child: Container(
        alignment: Alignment.center,
        padding: padding,
        margin: margin,
        decoration: BoxDecoration(
          color: isActive ? cs.primaryContainer : cs.surface,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: isActive ? cs.primary : cs.outlineVariant,
          ),
        ),
        child: FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(
            result.chord.shortNameFor(pref),
            textAlign: resolvedTextAlign,
            style: TextStyle(
              color: isActive ? cs.onPrimaryContainer : cs.onSurface,
              fontSize: resolvedFontSize,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );

    final animated =
        chip.animate(delay: animationDelay).fadeIn(duration: 200.ms);

    return switch (slideAxis) {
      Axis.horizontal =>
        animated.slideX(begin: -0.2, duration: 200.ms, curve: Curves.easeOut),
      Axis.vertical =>
        animated.slideY(begin: -0.2, duration: 200.ms, curve: Curves.easeOut),
    };
  }
}
