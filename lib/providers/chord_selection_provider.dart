import 'dart:convert';

import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../models/chord_selection.dart';
import '../models/chord_type.dart';
import 'theme_provider.dart' show sharedPreferencesProvider;

part 'chord_selection_provider.g.dart';

const _kChordSelection = 'chord_selection';

/// Manages the user's active chord-type selection (3 – 20 chords) and
/// persists every change to [SharedPreferencesAsync] as a JSON array of
/// enum-name strings.
///
/// [build] returns [kDefaultChordSelection] synchronously then schedules a
/// [_load] via [Future.microtask] to hydrate persisted selection. At most one
/// frame of default state is shown before the user's saved selection appears.
///
/// ## Defensive decoding
///
/// On load, the saved JSON is filtered to keep only known [ChordType] names
/// (forward-compat with future chord renames) then clamped to
/// `[ChordSelection.minCount, ChordSelection.maxCount]`. If the surviving list
/// is too short, the default selection is restored and re-persisted.
@Riverpod(keepAlive: true)
class ChordSelectionNotifier extends _$ChordSelectionNotifier {
  @override
  ChordSelection build() {
    Future.microtask(_load);
    return const ChordSelection(kDefaultChordSelection);
  }

  Future<void> _load() async {
    if (!ref.mounted) return;
    final prefs = ref.read(sharedPreferencesProvider);
    final raw = await prefs.getString(_kChordSelection);
    if (!ref.mounted) return;
    if (raw == null) return; // no saved state — keep default
    final parsed = _decode(raw);
    if (!ref.mounted) return;
    if (parsed == null) {
      // Corrupt JSON or zero surviving entries → reset to default.
      await prefs.remove(_kChordSelection);
      return;
    }
    state = ChordSelection(parsed);
  }

  /// Decodes a persisted JSON blob into a validated list of chord types.
  /// Returns `null` if the blob is unrecoverable; the caller resets to
  /// default and clears the key.
  static List<ChordType>? _decode(String raw) {
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) return null;
      final byName = {for (final c in ChordType.values) c.name: c};
      final result = <ChordType>[];
      final seen = <ChordType>{};
      for (final entry in decoded) {
        if (entry is! String) continue;
        final type = byName[entry];
        if (type == null) continue; // unknown name (future rename) — skip
        if (!seen.add(type)) continue; // duplicates — preserve first
        result.add(type);
      }
      if (result.length < ChordSelection.minCount) return null;
      if (result.length > ChordSelection.maxCount) {
        return result.take(ChordSelection.maxCount).toList();
      }
      return result;
    } on Object {
      return null;
    }
  }

  Future<void> _persist() async {
    final prefs = ref.read(sharedPreferencesProvider);
    final encoded = jsonEncode(state.active.map((c) => c.name).toList());
    await prefs.setString(_kChordSelection, encoded);
  }

  /// Toggles whether [type] is in the active set.
  /// Silently no-ops if toggling would violate
  /// [ChordSelection.minCount] / [ChordSelection.maxCount].
  Future<void> toggle(ChordType type) async {
    final next = state.copyWithToggled(type);
    if (identical(next, state) || next == state) return;
    state = next;
    await _persist();
  }

  /// Replaces the entire active list. Caller is responsible for honoring
  /// the 3 ≤ len ≤ 20 invariant; violations trigger a silent no-op.
  Future<void> setActive(List<ChordType> active) async {
    if (active.length < ChordSelection.minCount) return;
    if (active.length > ChordSelection.maxCount) return;
    final next = ChordSelection(List.unmodifiable(active));
    if (next == state) return;
    state = next;
    await _persist();
  }

  /// Resets to [kDefaultChordSelection] and clears the persisted key.
  Future<void> resetToDefault() async {
    state = const ChordSelection(kDefaultChordSelection);
    final prefs = ref.read(sharedPreferencesProvider);
    await prefs.remove(_kChordSelection);
  }
}
