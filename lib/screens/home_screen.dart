import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sensors_plus/sensors_plus.dart';
import 'package:share_plus/share_plus.dart';

import '../models/chord.dart';
import '../models/note.dart';
import '../constants.dart';
import '../models/dice_result.dart';
import '../models/notation_preference.dart';
import '../models/shake_sensitivity.dart';
import '../models/shake_settings.dart';
import '../providers/arpeggio_provider.dart';
import '../providers/chord_selection_provider.dart';
import '../providers/dice_provider.dart';
import '../providers/notation_provider.dart';
import '../providers/shake_provider.dart';
import '../utils/note_format.dart';
import '../services/midi_export_service.dart';
import '../services/shake_detector.dart';
import '../widgets/chord_info_card.dart';
import '../widgets/circle_icon_button.dart';
import '../widgets/dice_stage.dart';
import '../widgets/history_strip.dart';
import '../widgets/roll_button.dart';
import 'piano_screen.dart';
import 'settings_screen.dart';

/// Main screen composing all dice, chord, and keyboard widgets.
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  static Future<void> _showExportPicker(
    BuildContext context,
    List<DiceResult> history,
    Rect? sharePositionOrigin,
    NotationPreference preference,
  ) async {
    // selected[i] == true means history[i] is checked (history is newest-first)
    final selected = List<bool>.filled(history.length, false);

    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (sheetCtx) => StatefulBuilder(
        builder: (innerCtx, setState) {
          final allSelected = selected.every((v) => v);
          final anySelected = selected.any((v) => v);
          return SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox(height: 8),
                Text(
                  'Export MIDI',
                  style: Theme.of(innerCtx).textTheme.titleMedium,
                ),
                const SizedBox(height: 4),
                // ── Select All ──
                CheckboxListTile(
                  value: allSelected
                      ? true
                      : anySelected
                          ? null
                          : false,
                  tristate: true,
                  title: const Text('Select All'),
                  onChanged: (_) {
                    setState(() {
                      final fill = !allSelected;
                      for (var i = 0; i < selected.length; i++) {
                        selected[i] = fill;
                      }
                    });
                  },
                ),
                const Divider(height: 1),
                // ── Per-chord list (scrollable if history is long) ──
                ConstrainedBox(
                  constraints:
                      const BoxConstraints(maxHeight: kMidiPickerMaxHeight),
                  child: ListView.builder(
                    shrinkWrap: true,
                    itemCount: history.length,
                    itemBuilder: (_, i) => CheckboxListTile(
                      value: selected[i],
                      title: Text(history[i].chord.nameFor(preference)),
                      onChanged: (v) =>
                          setState(() => selected[i] = v ?? false),
                    ),
                  ),
                ),
                const Divider(height: 1),
                // ── Export button ──
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  child: SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: anySelected
                          ? () => Navigator.pop(innerCtx, true)
                          : null,
                      child: const Text('Export'),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );

    if (confirmed != true) return; // dismissed or no selection
    if (!context.mounted) return;

    // Collect selected chords in chronological order (oldest-first):
    // history is newest-first, so iterate in reverse and keep selected items.
    final chords = [
      for (var i = history.length - 1; i >= 0; i--)
        if (selected[i]) history[i].chord,
    ];

    try {
      final path = await MidiExportService().exportToFile(chords);
      if (!context.mounted) return;
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(path, mimeType: 'audio/midi')],
          subject: 'Chord Dice export',
          sharePositionOrigin: sharePositionOrigin,
        ),
      );
    } on Object catch (e) {
      if (!context.mounted) return;
      debugPrint('MIDI share error: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not share MIDI file')),
      );
    }
  }

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen>
    with WidgetsBindingObserver {
  ShakeDetector? _detector;
  AppLifecycleState _lifecycle = AppLifecycleState.resumed;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _detector = ShakeDetector(
      stream: accelerometerEventStream(),
      thresholdMps2: ref.read(shakeProvider).sensitivity.thresholdMps2,
      shouldIgnoreEvent: () =>
          ref.read(diceProvider).rollState == RollState.rolling,
      onShake: _onShake,
    );
    WidgetsBinding.instance.addPostFrameCallback((_) => _updateSubscription());
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _updateSubscription();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _lifecycle = state;
    _updateSubscription();
  }

  @override
  void dispose() {
    _detector?.stop();
    _detector = null;
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  void _updateSubscription() {
    if (!mounted) return;
    final enabled = ref.read(shakeProvider).enabled;
    final foreground = _lifecycle == AppLifecycleState.resumed;
    final top = ModalRoute.of(context)?.isCurrent == true;
    if (enabled && foreground && top) {
      _detector?.start();
    } else {
      _detector?.stop();
    }
  }

  void _onShake() {
    if (!mounted) return;
    if (ref.read(diceProvider).rollState == RollState.rolling) return;
    HapticFeedback.mediumImpact();
    ref.read(diceProvider.notifier).beginRoll();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<ShakeSettings>(shakeProvider, (prev, next) {
      if (prev?.sensitivity != next.sensitivity) {
        _detector?.updateThreshold(next.sensitivity.thresholdMps2);
      }
      _updateSubscription();
    });

    final notation = ref.watch(notationProvider);
    final noteLabels = [for (final n in Note.values) n.displayFor(notation)];

    final rolling = ref.watch(
      diceProvider.select((s) => s.rollState == RollState.rolling),
    );
    final arpEnabled = ref.watch(
      arpeggioProvider.select((s) => s.enabled),
    );
    final shakeEnabled = ref.watch(
      shakeProvider.select((s) => s.enabled),
    );
    final diceTarget = ref.watch(
      diceProvider.select((s) => s.rollingTarget ?? s.current),
    );
    final currentResult = ref.watch(
      diceProvider.select((s) => s.current),
    );
    final currentChord = currentResult?.chord;
    final history = ref.watch(
      diceProvider.select((s) => s.history),
    );
    final chordLabels = ref.watch(
      chordSelectionProvider.select((s) => s.faceLabels),
    );

    final noteIndex = diceTarget?.note.index ?? 0;
    final chordIndex = ref.watch(
      diceProvider.select((s) => s.chordFaceIndex),
    );

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 8),

            // ── App Title + Settings gear ────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Row(
                children: [
                  // Balances the 48 px gear button so the title stays centered.
                  const SizedBox(width: 48),
                  Expanded(
                    child: Column(
                      children: [
                        Text(
                          'CHORD DICE',
                          style: Theme.of(context)
                              .textTheme
                              .headlineMedium
                              ?.copyWith(
                                fontWeight: FontWeight.w700,
                                height: 1,
                              ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Roll to discover your next chord',
                          style:
                              Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurfaceVariant,
                                    letterSpacing: 0.3,
                                  ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.settings_outlined),
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    tooltip: 'Settings',
                    onPressed: () => Navigator.push<void>(
                      context,
                      MaterialPageRoute<void>(
                        builder: (_) => const SettingsScreen(),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),

            // ── Chord Info Card ───────────────────────────────────────────────
            SizedBox(
              height: kChordInfoCardHeight,
              child: ChordInfoCard(chord: currentChord),
            ),

            // ── Dice Stage ───────────────────────────────────────────────────
            Expanded(
              child: DiceStage(
                noteLabels: noteLabels,
                chordLabels: chordLabels,
                noteIndex: noteIndex,
                chordIndex: chordIndex,
                rolling: rolling,
                onSettled: () => ref.read(diceProvider.notifier).settleRoll(),
              ),
            ),
            const SizedBox(height: 16),

            // ── History Strip ─────────────────────────────────────────────────
            HistoryStrip(
              history: history,
              activeResult: currentResult,
              onTap: (result) =>
                  ref.read(diceProvider.notifier).replayFromHistory(result),
            ),
            const SizedBox(height: 12),

            // ── Button Row (Arp + ROLL + Piano + Export) ─────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircleIconButton(
                    icon: Icons.graphic_eq,
                    onPressed: ref.read(arpeggioProvider.notifier).toggle,
                    variant: arpEnabled ? Variant.filled : Variant.tonal,
                  ),
                  const SizedBox(width: 12),
                  Flexible(
                    child: RollButton(
                      rolling: rolling,
                      onPressed: () =>
                          ref.read(diceProvider.notifier).beginRoll(),
                    ),
                  ),
                  const SizedBox(width: 12),
                  CircleIconButton(
                    icon: Icons.piano,
                    onPressed: currentResult != null
                        ? () => Navigator.push<void>(
                              context,
                              MaterialPageRoute<void>(
                                builder: (_) => const PianoScreen(),
                              ),
                            )
                        : null,
                    variant: Variant.tonal,
                  ),
                  const SizedBox(width: 12),
                  CircleIconButton(
                    icon: Icons.ios_share,
                    onPressed: history.isNotEmpty && !rolling
                        ? () {
                            final box =
                                context.findRenderObject() as RenderBox?;
                            final origin = box != null
                                ? box.localToGlobal(Offset.zero) & box.size
                                : null;
                            HomeScreen._showExportPicker(
                                context, history, origin, notation);
                          }
                        : null,
                    variant: Variant.tonal,
                    tooltip: 'Export MIDI',
                  ),
                ],
              ),
            ),

            // ── Shake Hint (only when shake-to-roll is enabled) ──────────────
            if (shakeEnabled) ...[
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.vibration,
                    size: 16,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Shake to roll',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                          letterSpacing: 0.3,
                        ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}
