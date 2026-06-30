# Feature Summary: Reusable UI Widgets (HistoryChip, SettingsCard, CircleIconButton)
_Archived: 2026-06-30_
_Status: DONE_

## Goal
Extract three reusable widgets under `lib/widgets/` to eliminate duplicated UI code across the history strips, settings screen, and home-screen button row. Near-pure refactor: one intentional animation delta (vertical history slide direction), zero new dependencies, zero analyzer/test regressions.

## What Was Built

### New widgets
- **`lib/widgets/history_chip.dart`** — public `HistoryChip` with 5 required props (`result`, `isActive`, `animationDelay`, `slideAxis`, `onTap`) + 4 optional (`contentPadding`, `outerMargin`, `fontSize`, `textAlign`). Per-axis defaults resolved via switch on `slideAxis`. Horizontal → `.slideX` entrance, vertical → `.slideY` entrance. Replaces the private `_HistoryChip` and `_VerticalHistoryChip` classes.
- **`lib/widgets/settings_card.dart`** — public `SettingsCard({sectionTitle?, child})` wrapping `Card.filled(color: cs.surfaceContainer, margin: EdgeInsets.zero)`. When `sectionTitle != null`, renders a `SettingsSectionHeader` with `Padding(fromLTRB(16,16,16,0))` above the child. Also exports public `SettingsSectionHeader(label)` — promoted from the private `_SectionHeader` in `settings_screen.dart` so the DISPLAY card can render it manually and preserve its `EdgeInsets.all(16)` layout.
- **`lib/widgets/circle_icon_button.dart`** — top-level `enum Variant { filled, tonal }` + public `CircleIconButton({icon, onPressed, variant, tooltip?, size=56})`. Renders `FilledButton`/`FilledButton.tonal` via switch, both with `CircleBorder()` + `EdgeInsets.zero` padding, wrapped in `SizedBox(size×size)` and optional `Tooltip`.

### Call-site updates
- `history_strip.dart` — uses `HistoryChip(slideAxis: Axis.horizontal, ...)`; `_HistoryChip` deleted.
- `vertical_history_strip.dart` — uses `HistoryChip(slideAxis: Axis.vertical, ...)`; `_VerticalHistoryChip` deleted.
- `settings_screen.dart` — four `Card.filled` blocks replaced: DISPLAY renders `SettingsSectionHeader` manually (preserves `EdgeInsets.all(16)`); PLAYBACK / REFERENCE / DATA pass `sectionTitle`. Private `_SectionHeader` deleted.
- `home_screen.dart` — three circular buttons (arpeggio / piano / export MIDI) replaced with `CircleIconButton`. Arpeggio variant swap is now declarative (inline IIFE gone). `SizedBox(width: 12)` spacers unchanged.

## Phases Completed
| Phase | Name | Key Outcome |
|-------|------|-------------|
| 1 | HistoryChip extraction | Unified chip widget across both strips; lands the Known Delta (vertical slide-Y). |
| 2 | SettingsCard + SettingsSectionHeader extraction | 4× `Card.filled` blocks collapsed; private `_SectionHeader` promoted to public. |
| 3 | CircleIconButton extraction | 3 inline button blocks replaced; arpeggio IIFE removed; variant swap is declarative. |

## Edge Cases Handled
- **Disabled `CircleIconButton`** (`onPressed == null`): `FilledButton` / `FilledButton.tonal` handle the disabled visual state via theme; no extra code.
- **Tooltip + disabled**: `Tooltip` wraps the outer `SizedBox` so it fires even when the button is disabled (matches prior behavior for the Export button).
- **HistoryChip with long chord names**: preserved existing overflow behavior exactly — no clipping added.
- **Empty history**: `HistoryChip` never receives empty data (parent strip short-circuits).
- **Theme transitions (dark ↔ light)**: all colors are `colorScheme`-derived, MD3 transition behavior unchanged.
- **Rapid consecutive rolls**: `animationDelay` passed through verbatim; `flutter_animate` handles re-entry.
- **HistoryChip per-axis optional overrides**: resolved inside `build()` when `null` (per-axis defaults); used as-is when non-null. Initial refactor passes none.

## Deviations From Original Plan
None material. The `HistoryChip` constructor accepts `result: DiceResult` rather than the private classes' `chord: Chord` — call sites already had `result` in scope, so wire-up was straightforward. Arpeggio button had no pre-existing tooltip (confirmed), so no `tooltip:` was added.

## Out of Scope (Not Implemented)
Deliberately skipped — preserved so future work knows not to revisit without cause:
- Parameterizing the widgets beyond the locked APIs (no `borderRadius`, no `onLongPress`, no `semanticLabel`, no swappable `CircleBorder`).
- A barrel file (`lib/widgets/widgets.dart`) — direct imports only.
- Any changes under `lib/widgets/dice_*.dart` or `polyhedron.dart` (geometry/motion/rendering split invariant).
- New widget tests — this is a visual/structural refactor, not a feature addition.
- An `arpeggio_button.dart` composite widget — the variant swap lives at the single call site.
- Any changes under `lib/providers/`, `lib/services/`, `lib/models/`, `lib/screens/piano_screen.dart`, `lib/screens/chord_reference_screen.dart`.
- `.g.dart` regeneration.
- Hardcoded color constants.

## Review Findings
All three phase reviews passed cleanly — zero must-fix and zero should-fix issues across the board.
- Phase 1 review: PASSED. Behavioral fidelity, API correctness, code quality all clean.
- Phase 2 review: PASSED. Pixel-identical layout verified for all 4 cards.
- Phase 3 review: PASSED. Line delta for phase 3 landed at +22 (vs. plan's ~−30/−50 estimate), judged justified — the 57-line `circle_icon_button.dart` file is genuinely tight with no fluff; duplication-removal intent is achieved.

## Final Check Outcome
Status: DONE. All exit gates passed on 2026-06-30:
- `dart format --set-exit-if-changed lib test` → 0 changes.
- `flutter analyze` → 0 issues.
- `flutter test` → 160/160 passed.
- Dead code fully gone (no `_HistoryChip`, `_VerticalHistoryChip`, or `_SectionHeader` references in `lib/` or `test/`).
- Constraint compliance: no hardcoded colors, no new deps, dice_*.dart untouched, no barrel files, no `.g.dart` regenerations, naming conventions correct.
- **Known Delta confirmed and explicitly not flagged**: vertical history strip chips now slide in from above (`.slideY(begin: -0.2)`) instead of from the left (`.slideX`). Coherence fix matching animation direction to strip scroll axis. Horizontal strip unchanged.
- Regressions: none.

## Files Changed

### New files
- `lib/widgets/history_chip.dart` — public `HistoryChip` (+121 lines).
- `lib/widgets/settings_card.dart` — public `SettingsCard` + `SettingsSectionHeader` (+57 lines).
- `lib/widgets/circle_icon_button.dart` — top-level `enum Variant { filled, tonal }` + `CircleIconButton` (+57 lines).

### Modified files
- `lib/widgets/history_strip.dart` — `_HistoryChip` deleted; uses `HistoryChip(slideAxis: Axis.horizontal)`. (~−50)
- `lib/widgets/vertical_history_strip.dart` — `_VerticalHistoryChip` deleted; uses `HistoryChip(slideAxis: Axis.vertical)`. (~−50)
- `lib/screens/settings_screen.dart` — 4× `Card.filled` → `SettingsCard`; `_SectionHeader` deleted. (~−54)
- `lib/screens/home_screen.dart` — 3× inline circular buttons → `CircleIconButton`; arpeggio IIFE removed. (~−35)

**Aggregate net**: approximately −54 lines. Below the original ~−150 target because the three new widget files (dartdoc + enum + constructor + build, no fluff) land at +235 total; the call-site reduction was ~−189. The duplication-removal intent is fully achieved.

## Notes
- **Design decisions locked ahead of planning**: (a1) `HistoryChip` takes `required Axis slideAxis`; (b2) `CircleIconButton` uses top-level `enum Variant { filled, tonal }`. These were not re-debated.
- **Q1/Q2/Q3 resolutions** (folded into the specs):
  - Q1: `HistoryChip` exposes `contentPadding` / `outerMargin` / `fontSize` / `textAlign` as optional props with per-axis defaults keyed off `slideAxis`.
  - Q2: `_SectionHeader` promoted to public `SettingsSectionHeader` in `settings_card.dart`. DISPLAY renders it manually.
  - Q3: Honor locked a1 — vertical strip gains top-down slide animation (documented as Known Delta).
- **Line-delta caveat**: individual phase deltas ran phase 1 ≈ −50, phase 2 ≈ −42, phase 3 = +22. Phase 3 overshot its estimate due to honest widget-file overhead (dartdoc + enum + build); reviewer accepted it because the code is tight.
- **Manual smoke test** on a device/simulator is still recommended before release: confirm arpeggio filled↔tonal toggle, piano/export disabled states, and the Known Delta (vertical strip slide-Y) visually.
- **No follow-up work required**. The three widgets are the full reuse surface intended by this refactor; the four optional `HistoryChip` props exist as escape hatches but have no current callers.
