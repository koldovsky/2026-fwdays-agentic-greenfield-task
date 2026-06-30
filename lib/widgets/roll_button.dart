import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';

/// Primary CTA button that rolls both dice.
///
/// - Delivers [HapticFeedback.heavyImpact] on tap.
/// - Disabled and shows a loading indicator while [rolling] is true.
/// - Uses flutter_animate for a subtle entrance + scale pulse when enabled.
class RollButton extends StatelessWidget {
  const RollButton({
    super.key,
    required this.onPressed,
    required this.rolling,
  });

  final VoidCallback onPressed;
  final bool rolling;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return FilledButton(
      onPressed: rolling
          ? null
          : () {
              HapticFeedback.heavyImpact();
              onPressed();
            },
      style: FilledButton.styleFrom(
        minimumSize: const Size(200, 56),
      ),
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 200),
        child: rolling
            ? SizedBox(
                key: const ValueKey('loading'),
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  color: cs.onPrimary,
                ),
              )
            : const Text(
                'ROLL',
                key: ValueKey('label'),
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 3,
                ),
              ),
      ),
    ).animate(target: rolling ? 0 : 1).scaleXY(
          begin: 0.95,
          end: 1.0,
          duration: 200.ms,
          curve: Curves.easeOut,
        );
  }
}
