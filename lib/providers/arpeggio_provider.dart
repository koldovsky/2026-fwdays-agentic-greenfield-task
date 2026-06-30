import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../models/arpeggio_pattern.dart';
import '../models/arpeggio_settings.dart';
import 'theme_provider.dart';

part 'arpeggio_provider.g.dart';

// ─── Prefs Keys ───────────────────────────────────────────────────────────────

const _kArpEnabled = 'arp_enabled';
const _kArpPattern = 'arp_pattern';

// ─── ArpeggioNotifier ─────────────────────────────────────────────────────────

/// Manages [ArpeggioSettings] state and persists every change to
/// [SharedPreferencesAsync].
///
/// [build] returns the default state synchronously and schedules an async
/// [_load] via [Future.microtask] to hydrate from persisted prefs.
@Riverpod(keepAlive: true)
class ArpeggioNotifier extends _$ArpeggioNotifier {
  @override
  ArpeggioSettings build() {
    Future.microtask(_load);
    return const ArpeggioSettings();
  }

  Future<void> _load() async {
    final prefs = ref.read(sharedPreferencesProvider);
    final enabledRaw = await prefs.getBool(_kArpEnabled);
    final patternName = await prefs.getString(_kArpPattern);
    if (!ref.mounted) return;
    final enabled = enabledRaw ?? false;
    final pattern = ArpeggioPattern.values.firstWhere(
      (p) => p.name == patternName,
      orElse: () => ArpeggioPattern.up,
    );
    state = ArpeggioSettings(enabled: enabled, pattern: pattern);
  }

  /// Flips the enabled flag and persists it.
  Future<void> toggle() async {
    state = state.copyWith(enabled: !state.enabled);
    await ref
        .read(sharedPreferencesProvider)
        .setBool(_kArpEnabled, state.enabled);
  }

  /// Sets the enabled flag and persists it.
  Future<void> setEnabled(bool v) async {
    state = state.copyWith(enabled: v);
    await ref
        .read(sharedPreferencesProvider)
        .setBool(_kArpEnabled, state.enabled);
  }

  /// Updates the arpeggio pattern and persists it.
  Future<void> setPattern(ArpeggioPattern p) async {
    state = state.copyWith(pattern: p);
    await ref
        .read(sharedPreferencesProvider)
        .setString(_kArpPattern, state.pattern.name);
  }
}
