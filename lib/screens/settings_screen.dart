import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/accent_palette.dart';
import '../models/notation_preference.dart';
import '../widgets/settings_card.dart';
import 'chord_reference_screen.dart';
import '../models/arpeggio_pattern.dart';
import '../models/shake_sensitivity.dart';
import '../providers/arpeggio_provider.dart';
import '../providers/dice_provider.dart';
import '../providers/notation_provider.dart';
import '../providers/shake_provider.dart';
import '../providers/theme_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(themeProvider);
    final notifier = ref.read(themeProvider.notifier);
    final notation = ref.watch(notationProvider);
    final notationNotifier = ref.read(notationProvider.notifier);
    final arpSettings = ref.watch(arpeggioProvider);
    final arpNotifier = ref.read(arpeggioProvider.notifier);
    final shakeSettings = ref.watch(shakeProvider);
    final shakeNotifier = ref.read(shakeProvider.notifier);
    final diceState = ref.watch(diceProvider);
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
        children: [
          // ─── Display ────────────────────────────────────────────────────────
          SettingsCard(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SettingsSectionHeader('DISPLAY'),
                  const SizedBox(height: 12),
                  SegmentedButton<ThemeMode>(
                    segments: const [
                      ButtonSegment(
                        value: ThemeMode.dark,
                        icon: Icon(Icons.dark_mode_outlined),
                        label: FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text('Dark'),
                        ),
                      ),
                      ButtonSegment(
                        value: ThemeMode.system,
                        icon: Icon(Icons.brightness_auto_outlined),
                        label: FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text('System'),
                        ),
                      ),
                      ButtonSegment(
                        value: ThemeMode.light,
                        icon: Icon(Icons.light_mode_outlined),
                        label: FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text('Light'),
                        ),
                      ),
                    ],
                    selected: {settings.mode},
                    onSelectionChanged: (modes) =>
                        notifier.setMode(modes.first),
                  ),
                  const SizedBox(height: 20),
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    alignment: WrapAlignment.spaceEvenly,
                    children: AccentPalette.values.map((palette) {
                      final isSelected = settings.palette == palette;
                      return GestureDetector(
                        onTap: () => notifier.setPalette(palette),
                        child: Stack(
                          children: [
                            Container(
                              width: 64,
                              height: 40,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: isSelected
                                      ? cs.secondary
                                      : Colors.transparent,
                                  width: 2.5,
                                ),
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(7.5),
                                child: Row(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.stretch,
                                  children: [
                                    Expanded(
                                      child:
                                          ColoredBox(color: palette.d12Color),
                                    ),
                                    Expanded(
                                      child:
                                          ColoredBox(color: palette.d20Color),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            if (isSelected)
                              Positioned.fill(
                                child: Center(
                                  child: Icon(
                                    Icons.check_rounded,
                                    color: cs.onSecondary,
                                    size: 20,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // ─── Chords ─────────────────────────────────────────────────────────
          SettingsCard(
            sectionTitle: 'CHORDS',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                  child: SegmentedButton<NotationPreference>(
                    segments: NotationPreference.values
                        .map(
                          (p) => ButtonSegment(
                            value: p,
                            label: FittedBox(
                              fit: BoxFit.scaleDown,
                              child: Text('${p.glyph} ${p.displayName}'),
                            ),
                          ),
                        )
                        .toList(),
                    selected: {notation},
                    onSelectionChanged: (set) =>
                        notationNotifier.setPreference(set.first),
                  ),
                ),
                ListTile(
                  leading: const Icon(Icons.library_music_outlined),
                  title: const Text('Chord Reference'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute<void>(
                      builder: (_) => const ChordReferenceScreen(),
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // ─── Interaction ─────────────────────────────────────────────────────
          SettingsCard(
            sectionTitle: 'INTERACTION',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SwitchListTile(
                  secondary: const Icon(Icons.vibration),
                  title: const Text('Shake to roll'),
                  subtitle: Text(
                    'Shake the phone to roll the dice',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: cs.onSurfaceVariant,
                        ),
                  ),
                  value: shakeSettings.enabled,
                  onChanged: (v) => shakeNotifier.setEnabled(v),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: AnimatedOpacity(
                    opacity: shakeSettings.enabled ? 1.0 : 0.38,
                    duration: const Duration(milliseconds: 200),
                    child: AbsorbPointer(
                      absorbing: !shakeSettings.enabled,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.tune, size: 18),
                              const SizedBox(width: 8),
                              Text(
                                'Shake sensitivity',
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Higher setting = easier to trigger',
                            style:
                                Theme.of(context).textTheme.bodySmall?.copyWith(
                                      color: cs.onSurfaceVariant,
                                    ),
                          ),
                          const SizedBox(height: 8),
                          SegmentedButton<ShakeSensitivity>(
                            segments: ShakeSensitivity.values
                                .map(
                                  (s) => ButtonSegment(
                                    value: s,
                                    icon: Icon(s.icon),
                                    label: FittedBox(
                                      fit: BoxFit.scaleDown,
                                      child: Text(s.displayName),
                                    ),
                                  ),
                                )
                                .toList(),
                            selected: {shakeSettings.sensitivity},
                            onSelectionChanged: (set) =>
                                shakeNotifier.setSensitivity(set.first),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // ─── Playback ───────────────────────────────────────────────────────
          SettingsCard(
            sectionTitle: 'PLAYBACK',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SwitchListTile(
                  title: const Text('Arpeggio mode'),
                  subtitle: Text(
                    'Play chords as sequential note patterns',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: cs.onSurfaceVariant,
                        ),
                  ),
                  value: arpSettings.enabled,
                  onChanged: (v) => arpNotifier.setEnabled(v),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: AnimatedOpacity(
                    opacity: arpSettings.enabled ? 1.0 : 0.38,
                    duration: const Duration(milliseconds: 200),
                    child: AbsorbPointer(
                      absorbing: !arpSettings.enabled,
                      child: Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: ArpeggioPattern.values.map((pattern) {
                          final isSelected = arpSettings.pattern == pattern;
                          return ChoiceChip(
                            label: Text(pattern.displayName),
                            selected: isSelected,
                            selectedColor: cs.primaryContainer,
                            onSelected: (_) => arpNotifier.setPattern(pattern),
                          );
                        }).toList(),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // ─── Data ───────────────────────────────────────────────────────────
          SettingsCard(
            sectionTitle: 'DATA',
            child: ListTile(
              leading: Icon(
                Icons.delete_outline,
                color: diceState.history.isEmpty ? null : cs.error,
              ),
              title: Text(
                'Clear History',
                style: TextStyle(
                  color: diceState.history.isEmpty ? null : cs.error,
                ),
              ),
              enabled: diceState.history.isNotEmpty,
              onTap: () async {
                final confirmed = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Clear all history?'),
                    content: const Text(
                      'This will remove all roll history.',
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.of(ctx).pop(false),
                        child: const Text('Cancel'),
                      ),
                      TextButton(
                        onPressed: () => Navigator.of(ctx).pop(true),
                        child: Text(
                          'Clear',
                          style: TextStyle(color: cs.error),
                        ),
                      ),
                    ],
                  ),
                );
                if (!context.mounted) return;
                if (confirmed == true) {
                  ref.read(diceProvider.notifier).clearHistory();
                }
              },
            ),
          ),
        ],
      ),
    );
  }
}
