import 'shake_sensitivity.dart';

// ─── ShakeSettings ────────────────────────────────────────────────────────────

/// Immutable snapshot of the user's shake-to-roll preferences.
///
/// Default: enabled with [ShakeSensitivity.medium].
class ShakeSettings {
  const ShakeSettings({
    this.enabled = true,
    this.sensitivity = ShakeSensitivity.medium,
  });

  /// Whether shake-to-roll is active.
  final bool enabled;

  /// The sensitivity level used when evaluating shake magnitude.
  final ShakeSensitivity sensitivity;

  /// Returns a copy with the given fields replaced.
  ShakeSettings copyWith({bool? enabled, ShakeSensitivity? sensitivity}) =>
      ShakeSettings(
        enabled: enabled ?? this.enabled,
        sensitivity: sensitivity ?? this.sensitivity,
      );

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ShakeSettings &&
          other.enabled == enabled &&
          other.sensitivity == sensitivity;

  @override
  int get hashCode => Object.hash(enabled, sensitivity);
}
