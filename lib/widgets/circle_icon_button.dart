import 'package:flutter/material.dart';

/// Determines the Material 3 button style for [CircleIconButton].
///
/// [filled] maps to a [FilledButton] (primary-container background).
/// [tonal] maps to a [FilledButton.tonal] (secondary-container background).
enum Variant { filled, tonal }

/// A 56×56 circular icon button supporting [Variant.filled] and [Variant.tonal].
///
/// Pass `onPressed: null` to show the disabled state. If [tooltip] is provided,
/// it wraps the button so the tooltip fires even when disabled.
class CircleIconButton extends StatelessWidget {
  const CircleIconButton({
    super.key,
    required this.icon,
    required this.onPressed,
    required this.variant,
    this.tooltip,
    this.size = 56,
  });

  final IconData icon;
  final VoidCallback? onPressed;
  final Variant variant;
  final String? tooltip;
  final double size;

  @override
  Widget build(BuildContext context) {
    final style = FilledButton.styleFrom(
      shape: const CircleBorder(),
      padding: EdgeInsets.zero,
    );
    final child = Icon(icon);

    final button = switch (variant) {
      Variant.filled => FilledButton(
          style: style,
          onPressed: onPressed,
          child: child,
        ),
      Variant.tonal => FilledButton.tonal(
          style: style,
          onPressed: onPressed,
          child: child,
        ),
    };

    final sized = SizedBox(width: size, height: size, child: button);

    if (tooltip != null) {
      return Tooltip(message: tooltip!, child: sized);
    }
    return sized;
  }
}
