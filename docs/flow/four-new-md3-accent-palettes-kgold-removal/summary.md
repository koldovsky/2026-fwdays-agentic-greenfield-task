# Feature Summary: Four New MD3 Accent Palettes + kGold Removal
_Archived: 2026-06-30_
_Status: DONE_

## Goal

Add four new `AccentPalette` enum values to Chord Dice, grounded in Material Design 3 tonal-palette principles, that are visually and hue-wise distinct from the existing four palettes. Each new palette contributes a `d20Color` seed (→ MD3 primary) and a `d12Color` accent (→ `ColorScheme.secondary`). Simultaneously remove the palette-independent `kGold` constant so every gold/highlight accent in the app is theme-reactive. The settings UI was also updated to handle 8 swatches gracefully at any screen width.

## What Was Built

### `lib/models/accent_palette.dart`
- Added 4 enum values: `indigoMint`, `plumPeach`, `emeraldGold`, `crimsonSlate`
- Extended `_d12Colors` (secondary): Mint `#80CBC4`, Peach `#FFAB91`, Gold `#FFCA28`, Slate `#90A4AE`
- Extended `_d20Colors` (primary seed): Indigo `#5C6BC0`, Plum `#BA68C8`, Emerald `#43A047`, Crimson `#AD1457`
- Bang operators preserved in `AccentPaletteX` for structural enforcement

### `lib/providers/theme_provider.dart`
- `_load` deserialize switch extended with 4 new cases (all 8 palette names now explicit)
- `setPalette` serialize switch extended with 4 new cases (remains compiler-exhaustive)
- Existing `'defaultBlue'` backward-compat alias and `_ => lavenderCyan` fallback untouched

### `lib/screens/settings_screen.dart`
- Palette picker `Row(mainAxisAlignment: .spaceEvenly)` → `Wrap(spacing: 12, runSpacing: 12, alignment: WrapAlignment.spaceEvenly)` so 8 swatches flow without clipping at any screen width
- Selected-swatch border: `kGold` → `cs.secondary`
- Selected-swatch check icon: `kGold` → `cs.onSecondary` (MD3-blessed contrast color)
- `theme.dart` import removed

### `lib/widgets/chord_info_card.dart`
- Note-pill background tint: `kGold.withValues(alpha: 0.12)` → `cs.secondary.withValues(alpha: 0.12)`
- Note-pill border: `kGold.withValues(alpha: 0.45)` → `cs.secondary.withValues(alpha: 0.45)`
- Note-pill icon: `color: kGold` → `color: cs.secondary`
- Added `final cs = Theme.of(context).colorScheme;` local to `_NotePill.build` for consistency
- `theme.dart` import removed

### `lib/theme.dart`
- `const kGold = Color(0xFFFFD700);` constant removed entirely

### `test/accent_palette_test.dart`
- Palette count assertion updated: `expect(AccentPalette.values.length, 4)` → `expect(AccentPalette.values.length, 8)`

### `CLAUDE.md`
- "Four palettes ship" → "Eight palettes ship: lavenderCyan (default), blue, tealAmber, roseSage, indigoMint, plumPeach, emeraldGold, crimsonSlate"
- `kGold` mentions removed from theme settings section and Conventions & gotchas section

## Phases Completed

| Phase | Name | Key Outcome |
|-------|------|-------------|
| 1 | Add 4 AccentPalette enum values | Enum extended to 8; both color maps extended; serialize/deserialize switches updated; test updated |
| 2 | Settings UI: palette picker Wrap | `Row` → `Wrap` with `spacing: 12, runSpacing: 12`; 8 swatches render cleanly at iPhone SE width |
| 3 | Remove kGold, use colorScheme.secondary | `kGold` fully removed; 5 callers migrated; `CLAUDE.md` updated |

## Edge Cases Handled

- **`_load` silent fallback**: the deserialize switch has a `_ => lavenderCyan` default that won't fail to compile on a missing case. Mitigated by manual count-verification step in Phase 1 (all 8 confirmed present).
- **Settings swatch check icon contrast**: check icon overlaps the d12 (secondary) half of the selected swatch, so using `cs.secondary` for the icon would produce zero contrast. Resolved by using `cs.onSecondary` (MD3-computed contrast pair) instead.
- **`emeraldGold.d12Color` vs old `kGold`**: Gold `#FFCA28` visually close to `kGold` `#FFD700`. Resolved automatically by Phase 3 removing `kGold` entirely — there is no longer any competing fixed gold constant.
- **8 swatches in a Row**: would overflow at iPhone SE width. Resolved by Phase 2 `Wrap` migration.

## Deviations From Original Plan

1. **`crimsonSlate` d20 seed changed post-check**: Plan specified `#E53935` (HCT hue ~25°, orange-red). After visual QA the seed was changed first to `#D50000`, then to `#AD1457` (Material Pink 800, HCT hue ~340°, deep crimson-magenta). Root cause: MD3 `fromSeed` maps red seeds to tone 40 in light mode, producing brownish/terracotta primaries. `#AD1457` produces a vivid crimson instead. This is the only deviation from the brief's proposed hex values.
2. **`vertical_piano_keyboard.dart` not touched**: The brief listed it as needing a `kGold` update. Pre-plan grep confirmed it was already migrated to `colorScheme.primary`/`secondary` in an earlier feature. No edit required.
3. **Phase result files not written**: The checker and review agents ran via the `flow-team` pipeline rather than standalone `/flow:check` invocations, so `phase-*-result.md` files were not written to `.flow-spec/`. Findings were captured in review reports and the inline team-lead relay.

## Out of Scope (Not Implemented)

- No changes to `buildTheme`'s `ColorScheme.fromSeed` strategy
- No MD3 tertiary-color overrides
- No new dependencies (`flex_color_scheme` / `flex_seed_scheme` not added)
- No renaming of existing palettes (stored keys kept stable)
- No new test files beyond updating the existing count assertion

## Review Findings

| Review | Phase | Must Fix | Should Fix | Suggestions |
|--------|-------|----------|------------|-------------|
| review-1-report.md | Phase 1 | 0 | 1 (Row overflow — deferred to Phase 2, as intended) | 2 (kGold in settings — deferred to Phase 3; _load fallback note) |
| review-3-report.md | Phase 3 | 0 | 0 | 1 (inline Theme.of calls → local cs — applied as cleanup) |

Phase 2 had no review report written (brief change, reviewer confirmed pass in message).

## Final Check Outcome

All 7 acceptance criteria verified: enum count, color map entries, serialize/deserialize exhaustiveness, `flutter analyze` clean, `flutter test` 160/160, CLAUDE.md updated, zero `kGold` references in `lib/`, settings picker is `Wrap`. No regressions.

## Files Changed

| File | Change |
|------|--------|
| `lib/models/accent_palette.dart` | Added 4 enum values + 8 color map entries (4 per map) |
| `lib/providers/theme_provider.dart` | Extended both serialize/deserialize switches to cover all 8 palettes |
| `lib/screens/settings_screen.dart` | Row → Wrap; 2 kGold → cs.secondary / cs.onSecondary; theme.dart import removed |
| `lib/widgets/chord_info_card.dart` | 3 kGold → cs.secondary; added local cs; theme.dart import removed |
| `lib/theme.dart` | Removed `const kGold` definition |
| `test/accent_palette_test.dart` | Updated palette count assertion from 4 to 8 |
| `CLAUDE.md` | Updated palette count + removed kGold references |

## Notes

- **MD3 red limitation**: pure red seeds (hues near 25° in HCT) produce brownish/terracotta primaries at tone 40 in light mode. This is inherent to the HCT algorithm. The `crimsonSlate` palette worked around this by shifting to `#AD1457` (Material Pink 800, deep crimson-magenta). Any future "red" palette should use a magenta-adjacent seed rather than a pure red hex.
- **onSecondary for check icon**: the decision to use `cs.onSecondary` rather than `cs.secondary` for the selected-swatch checkmark is worth preserving — it's the MD3-correct pattern and ensures legibility across all 8 palettes without any hardcoded color.
- **Hue coverage**: all 6 segments of the hue wheel now have at least one primary seed. No two primaries share a 30° HCT hue bucket across all 8 palettes.
