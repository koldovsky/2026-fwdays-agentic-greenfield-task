# Feature Summary: Chord Reference Sub-Page in Settings
_Archived: 2026-06-30_
_Status: DONE_

## Goal
Add a read-only "Chord Reference" sub-page accessible from the Settings screen that lists all 20 `ChordType` enum values. Each row shows the chord's full display name, its compact symbol, and its interval structure as a comma-separated list of semitone integers. The page gives musicians a quick in-app reference for what each of the 20 D20 die faces actually sounds like harmonically — without leaving the app.

## What Was Built

**`lib/screens/chord_reference_screen.dart`** (new)
- `StatelessWidget`, no Riverpod, no state
- `Scaffold` with `AppBar(title: Text('Chord Reference'))`
- `ListView.builder` over all 20 `ChordType.values` in enum declaration order
- Each row: `ListTile` with `displayName` title, `"Intervals: ..."` subtitle (raw semitones via `intervals.join(', ')`), and symbol trailing text in `textTheme.titleMedium` + `colorScheme.primary` color; empty symbol (Major) renders `"—"` (em dash `\u2014`)

**`lib/screens/settings_screen.dart`** (modified)
- Added `import 'chord_reference_screen.dart'`
- Appended a `"REFERENCE"` section header after the HISTORY section, matching the exact style of all existing section headers (`labelSmall`, `fontWeight.w600`, `onSurfaceVariant`, `letterSpacing: 1.2`)
- Added `ListTile` with `Icons.library_music_outlined`, title "Chord Reference", `Icons.chevron_right` trailing, `contentPadding: EdgeInsets.zero`, and `onTap` that calls `Navigator.push` with `MaterialPageRoute<void>` to `ChordReferenceScreen`

## Phases Completed
| Phase | Name | Key Outcome |
|-------|------|-------------|
| 1 | Create ChordReferenceScreen | New screen file created; 20-row list renders correctly with all edge cases handled |
| 2 | Wire into SettingsScreen | REFERENCE section added after HISTORY; navigation to new screen works |

## Edge Cases Handled
| Edge Case | Resolution |
|-----------|------------|
| `ChordType.major` has empty symbol `''` | Trailing renders `"—"` via `symbol.isEmpty ? '—' : symbol` |
| Extended intervals (`min9`, `maj9`, `add9`, `dom9`, `min11`) contain values 14, 17 | Displayed as raw integers via `intervals.join(', ')` — no translation |
| Long interval list (`min11` has 6 values) may wrap on narrow screens | `ListTile` handles subtitle wrapping natively; no truncation applied |
| Theme changes (dark/light, accent palette) | `Theme.of(context)` called at build time — updates automatically |
| No data mutations | Screen has no buttons, swipe-to-delete, or edit controls |

## Deviations From Original Plan
None. Both phases implemented exactly as specified in the plan.

## Out of Scope (Not Implemented)
- Playback of a chord from the reference screen
- Filtering or searching by chord name or interval content
- Interval name display (e.g. "M3", "P5") — raw semitones only
- Adding, editing, or removing chord types
- Favorites or bookmarks
- Non-enum-order sorting
- Deep-linking or tab integration

## Review Findings
- **Must fix:** 0
- **Should fix:** 0
- **Suggestions (minor):** 1 — `Theme.of(context)` called twice in `chord_reference_screen.dart` (line 15 for `cs`, line 28 for `textTheme`); could extract both at the top. No functional impact; O(1) and framework-cached.

## Final Check Outcome
All 27 items verified (5 expected behaviors, 5 edge cases, 7 out-of-scope confirmations, 4 conventions, 1 regression check). No issues. No regressions — existing APPEARANCE, ACCENT COLOR, ARPEGGIO, and HISTORY sections are untouched.

## Files Changed
| File | Change |
|------|--------|
| `lib/screens/chord_reference_screen.dart` | Created — new read-only chord reference screen |
| `lib/screens/settings_screen.dart` | Modified — added REFERENCE section header + navigation ListTile |

## Notes
- All 160 tests pass; `flutter analyze` zero-issue; `dart format` reported 0 changes needed.
- The minor `Theme.of(context)` double-lookup in `chord_reference_screen.dart` was noted by the reviewer but not fixed — it is style-only with no functional impact.
