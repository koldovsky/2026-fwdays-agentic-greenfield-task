import 'package:flutter/material.dart';

/// A tonal filled card used for each settings section.
///
/// When [sectionTitle] is non-null, renders a [SettingsSectionHeader] with
/// `EdgeInsets.fromLTRB(16, 16, 16, 0)` above [child]. When null, [child] is
/// placed directly inside the card — allowing callers to render the header
/// manually (e.g. DISPLAY, which needs `EdgeInsets.all(16)` around everything).
class SettingsCard extends StatelessWidget {
  const SettingsCard({super.key, this.sectionTitle, required this.child});

  final String? sectionTitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final Widget content = sectionTitle != null
        ? Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                child: SettingsSectionHeader(sectionTitle!),
              ),
              child,
            ],
          )
        : child;

    return Card.filled(
      color: Theme.of(context).colorScheme.surfaceContainer,
      margin: EdgeInsets.zero,
      child: content,
    );
  }
}

/// Section header label used inside [SettingsCard] and exported so the DISPLAY
/// card can render it manually within its own `EdgeInsets.all(16)` padding block.
class SettingsSectionHeader extends StatelessWidget {
  const SettingsSectionHeader(this.label, {super.key});

  final String label;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Text(
      label,
      style: Theme.of(context).textTheme.labelSmall?.copyWith(
            fontWeight: FontWeight.w600,
            color: cs.onSurfaceVariant,
            letterSpacing: 1.2,
          ),
    );
  }
}
