import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../models/notation_preference.dart';
import 'theme_provider.dart';

part 'notation_provider.g.dart';

// ─── Prefs Keys ───────────────────────────────────────────────────────────────

const _kNotation = 'notation_preference';

// ─── NotationNotifier ─────────────────────────────────────────────────────────

@Riverpod(keepAlive: true)
class NotationNotifier extends _$NotationNotifier {
  @override
  NotationPreference build() {
    Future.microtask(_load);
    return NotationPreference.sharps;
  }

  Future<void> _load() async {
    final prefs = ref.read(sharedPreferencesProvider);
    final raw = await prefs.getString(_kNotation);
    if (!ref.mounted) return;
    state = NotationPreference.values.firstWhere(
      (p) => p.prefsValue == raw,
      orElse: () => NotationPreference.sharps,
    );
  }

  Future<void> setPreference(NotationPreference p) async {
    state = p;
    await ref
        .read(sharedPreferencesProvider)
        .setString(_kNotation, p.prefsValue);
  }
}
