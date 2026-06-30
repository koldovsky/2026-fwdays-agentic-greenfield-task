import 'package:flutter/material.dart';

import '../constants.dart';

// ─── ShakeSensitivity ─────────────────────────────────────────────────────────

enum ShakeSensitivity { low, medium, high }

// ─── Consolidated metadata table ──────────────────────────────────────────────
//
// Single source of truth for every [ShakeSensitivity]. The `!` lookup in the
// extension getters enforces at compile time that adding or removing an enum
// value forces a matching table edit — same invariant as [_chordMeta] and
// [_notationMeta].

typedef _SensitivityMeta = ({
  double thresholdMps2,
  String displayName,
  String subtitle,
  IconData icon,
});

const _sensitivityMeta = <ShakeSensitivity, _SensitivityMeta>{
  ShakeSensitivity.low: (
    thresholdMps2: kShakeThresholdLow,
    displayName: 'Low',
    subtitle: 'Requires a firmer shake',
    icon: Icons.signal_cellular_alt_1_bar,
  ),
  ShakeSensitivity.medium: (
    thresholdMps2: kShakeThresholdMedium,
    displayName: 'Medium',
    subtitle: 'Balanced sensitivity',
    icon: Icons.signal_cellular_alt_2_bar,
  ),
  ShakeSensitivity.high: (
    thresholdMps2: kShakeThresholdHigh,
    displayName: 'High',
    subtitle: 'Triggers on a gentle shake',
    icon: Icons.signal_cellular_alt,
  ),
};

// ─── Extension ───────────────────────────────────────────────────────────────

extension ShakeSensitivityX on ShakeSensitivity {
  double get thresholdMps2 => _sensitivityMeta[this]!.thresholdMps2;
  String get displayName => _sensitivityMeta[this]!.displayName;
  String get subtitle => _sensitivityMeta[this]!.subtitle;
  IconData get icon => _sensitivityMeta[this]!.icon;
}
