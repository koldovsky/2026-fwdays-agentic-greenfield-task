import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../models/shake_sensitivity.dart';
import '../models/shake_settings.dart';
import 'theme_provider.dart';

part 'shake_provider.g.dart';

// ─── Prefs Keys ───────────────────────────────────────────────────────────────

const _kShakeEnabled = 'shake_enabled';
const _kShakeSensitivity = 'shake_sensitivity';

// ─── ShakeNotifier ────────────────────────────────────────────────────────────

@Riverpod(keepAlive: true)
class ShakeNotifier extends _$ShakeNotifier {
  @override
  ShakeSettings build() {
    Future.microtask(_load);
    return const ShakeSettings();
  }

  Future<void> _load() async {
    final prefs = ref.read(sharedPreferencesProvider);
    final enabledRaw = await prefs.getBool(_kShakeEnabled);
    final sensName = await prefs.getString(_kShakeSensitivity);
    if (!ref.mounted) return;
    final enabled = enabledRaw ?? true;
    final sensitivity = ShakeSensitivity.values.firstWhere(
      (s) => s.name == sensName,
      orElse: () => ShakeSensitivity.medium,
    );
    state = ShakeSettings(enabled: enabled, sensitivity: sensitivity);
  }

  Future<void> setEnabled(bool v) async {
    state = state.copyWith(enabled: v);
    await ref
        .read(sharedPreferencesProvider)
        .setBool(_kShakeEnabled, state.enabled);
  }

  Future<void> setSensitivity(ShakeSensitivity s) async {
    state = state.copyWith(sensitivity: s);
    await ref
        .read(sharedPreferencesProvider)
        .setString(_kShakeSensitivity, state.sensitivity.name);
  }
}
