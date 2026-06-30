import 'package:flutter/material.dart';

// ─── AccentPalette ────────────────────────────────────────────────────────────

/// Available accent color pairs for the two dice.
///
/// [d12Color] tints the D12 note die; [d20Color] tints the D20 chord die.
/// Both are mapped into the app's [ColorScheme]:
/// - [ColorScheme.secondary] = [d12Color]
/// - [ColorScheme.primary]   = [d20Color]
enum AccentPalette {
  lavenderCyan,
  blue,
  tealAmber,
  roseSage,
  indigoMint,
  plumPeach,
  emeraldGold,
  crimsonSlate,
}

// ─── Consolidated metadata table ──────────────────────────────────────────────
//
// Single source of truth for every [AccentPalette]. The `!` lookup in the
// extension getters enforces at compile time that adding or removing an enum
// value forces a matching table edit — same invariant as [_chordMeta] and
// [_notationMeta]. Trailing comments name the color for quick scanning.

typedef _AccentMeta = ({Color d12Color, Color d20Color});

const _accentMeta = <AccentPalette, _AccentMeta>{
  AccentPalette.lavenderCyan: (
    d12Color: Color(0xFFCE93D8), // Lavender
    d20Color: Color(0xFF80DEEA), // Cyan
  ),
  AccentPalette.blue: (
    d12Color: Color(0xFF4FC3F7), // Sky Blue
    d20Color: Color(0xFFFF8A65), // Coral
  ),
  AccentPalette.tealAmber: (
    d12Color: Color(0xFF4DB6AC), // Teal
    d20Color: Color(0xFFFFD54F), // Amber
  ),
  AccentPalette.roseSage: (
    d12Color: Color(0xFFF48FB1), // Rose
    d20Color: Color(0xFFA5D6A7), // Sage
  ),
  AccentPalette.indigoMint: (
    d12Color: Color(0xFF80CBC4), // Mint
    d20Color: Color(0xFF5C6BC0), // Indigo
  ),
  AccentPalette.plumPeach: (
    d12Color: Color(0xFFFFAB91), // Peach
    d20Color: Color(0xFFBA68C8), // Plum
  ),
  AccentPalette.emeraldGold: (
    d12Color: Color(0xFFFFCA28), // Gold
    d20Color: Color(0xFF43A047), // Emerald
  ),
  AccentPalette.crimsonSlate: (
    d12Color: Color(0xFF90A4AE), // Slate
    d20Color: Color(0xFFAD1457), // Crimson
  ),
};

// ─── Extension ────────────────────────────────────────────────────────────────

/// Typed accessors for [AccentPalette] metadata.
extension AccentPaletteX on AccentPalette {
  /// Tints the D12 note die; maps to [ColorScheme.secondary].
  Color get d12Color => _accentMeta[this]!.d12Color;

  /// Tints the D20 chord die; maps to [ColorScheme.primary].
  Color get d20Color => _accentMeta[this]!.d20Color;
}
