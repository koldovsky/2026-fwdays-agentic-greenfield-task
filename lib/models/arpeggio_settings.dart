import 'arpeggio_pattern.dart';

// ─── ArpeggioSettings ─────────────────────────────────────────────────────────

/// Immutable snapshot of the user's arpeggio preferences.
///
/// Default: disabled + [ArpeggioPattern.up].
class ArpeggioSettings {
  const ArpeggioSettings({
    this.enabled = false,
    this.pattern = ArpeggioPattern.up,
  });

  /// Whether arpeggio mode is active.
  final bool enabled;

  /// The traversal pattern used when arpeggio mode is on.
  final ArpeggioPattern pattern;

  /// Returns a copy with the given fields replaced.
  ArpeggioSettings copyWith({bool? enabled, ArpeggioPattern? pattern}) =>
      ArpeggioSettings(
        enabled: enabled ?? this.enabled,
        pattern: pattern ?? this.pattern,
      );

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ArpeggioSettings &&
          other.enabled == enabled &&
          other.pattern == pattern;

  @override
  int get hashCode => Object.hash(enabled, pattern);
}
