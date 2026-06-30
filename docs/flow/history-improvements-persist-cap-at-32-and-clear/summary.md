# Feature Summary: History Improvements — Persist, Cap at 32, and Clear
_Archived: 2026-06-30_
_Status: DONE_

## Goal
Three related improvements to chord roll history: increase the hard cap from 20 to 32, persist history across app restarts via SharedPreferences, and add a "Clear History" action in Settings. Together these give users a longer practice trail that survives app closes, with a way to start fresh.

## What Was Built

### Serialization
- `lib/models/dice_result.dart` — added `toJson()` / `fromJson()` using name-based enum serialization (`note.name` / `chordType.name`). Reorder-stable, rename-fragile. `fromJson` throws `ArgumentError` on unknown enum names.
- `test/dice_result_test.dart` (new) — 6 tests: full round-trip, all 12 Note values, all 20 ChordType values, key/type assertions, and ArgumentError throws for unknown names.

### Persistence
- `lib/providers/dice_provider.dart` — `DiceNotifier` loads history from SharedPreferences on construction (sets `current = history.first` to restore last chord on relaunch). `settleRoll()` calls `_persistHistory()` via `unawaited(_prefs.setString(...))`. `_loadHistory()` has outer try-catch (corrupt JSON) and inner try-catch (bad enum names) for graceful degradation.
- `test/dice_provider_test.dart` — 4 new persistence tests: persist on settle, load on construction, corrupt JSON discard, bad enum name skip. Added `setUp` to reset SharedPreferences between tests to prevent write-through contamination.

### Clear History + Settings UI
- `lib/providers/dice_provider.dart` — added `clearCurrent` flag to `DiceState.copyWith` (mirrors `clearRollingTarget`). Added async `clearHistory()` method: `await _audio.stopAll()` + mounted guard + state reset to idle + `unawaited(_prefs.remove(_kHistory))`. Gated on not-rolling.
- `lib/screens/settings_screen.dart` — "HISTORY" section with "Clear History" `ListTile`, destructive `cs.error` styling, disabled when history empty. Confirmation `AlertDialog` with `if (!context.mounted) return` guard after async dialog.
- `test/dice_provider_test.dart` — 2 new tests: clearHistory resets state + removes prefs key + calls stopAll; no-op during rolling.

### Cap Bump
- `DiceState.maxHistory` changed from 20 to 32. Cap test updated to 37 rolls.

## Phases Completed
| Phase | Name | Key Outcome |
|-------|------|-------------|
| 1     | Serialization + Cap Bump | `toJson`/`fromJson` with name-based enums, maxHistory 20→32, 6 new tests |
| 2     | Persistence | SharedPreferences load/save, corrupt data handling, 4 new tests |
| 3     | Clear History + Settings UI | `clearHistory()` with audio stop, Settings tile with confirmation, 2 new tests |

## Edge Cases Handled
| Edge Case | Resolution |
|-----------|-----------|
| Corrupt JSON in SharedPreferences | Outer try-catch in `_loadHistory()` returns empty list, no crash |
| Unknown enum name in persisted data | Inner try-catch skips individual entries, keeps valid ones |
| Empty history on first launch | No key in prefs, `const DiceState()` initialized normally |
| 32-item serialization performance | Negligible — no special handling needed |
| Clearing history mid-roll | Gated on `rollState != RollState.rolling`, no-op if rolling |
| Audio playing when clearing | `await _audio.stopAll()` before state reset, with mounted re-check |
| History strip auto-scroll at 32 | No code change needed — strips are length-driven |

## Deviations From Original Plan
- **Phase 1:** Serialization switched from enum index-based to enum name-based after review identified that index serialization was fragile to enum reordering. `Note.values[i]` → `Note.values.byName(s)`. Error type changed from `RangeError` to `ArgumentError`.
- **Phase 2:** Added `setUp` to pre-existing DiceNotifier test group to reset SharedPreferences between tests. Plan didn't anticipate that `_persistHistory()` writes would contaminate subsequent tests.
- **Phase 3:** `clearHistory()` made async with `await _audio.stopAll()` + mounted guard after review identified audio leak. Plan had it as synchronous `void`.

## Out of Scope (Not Implemented)
- Making the history limit user-configurable
- Exporting/importing history to a file
- Moving `maxHistory` to `lib/constants.dart` — it is a domain constant of `DiceState`, not a timing/layout constant
- Persisting `current` or `rollState` separately from history

## Review Findings
| Phase | Initial Status | Must Fix | Should Fix | Final Status |
|-------|---------------|----------|------------|-------------|
| 1     | HAS_ISSUES    | 0        | 2 (enum index fragility, bare ProviderContainer) | PASSED |
| 2     | HAS_ISSUES    | 0        | 2 (unawaited future, raw string key in test) | PASSED |
| 3     | HAS_ISSUES    | 1 (audio leak in clearHistory) | 2 (test stopAll assertion, context.mounted guard) | PASSED |

All review issues were resolved before proceeding to the next phase.

## Final Check Outcome
Status: DONE. All 160 tests pass. `flutter analyze` zero issues. No regressions found. All items from the brief verified complete.

## Files Changed
| File | Change |
|------|--------|
| `lib/models/dice_result.dart` | Added `toJson()` / `fromJson()` with name-based enum serialization |
| `lib/providers/dice_provider.dart` | maxHistory 20→32, SharedPreferences persistence, `clearHistory()` with audio stop, `clearCurrent` in copyWith |
| `lib/screens/settings_screen.dart` | "HISTORY" section with Clear History tile + confirmation dialog |
| `test/dice_result_test.dart` | New file — 6 serialization tests |
| `test/dice_provider_test.dart` | Cap test updated, 4 persistence tests, 2 clearHistory tests, setUp resets |

## Notes
- `phase-1-result.md` was not present in `.flow-spec/` at archive time — Phase 1 results were captured in the review report instead.
- The name-based serialization trade-off (reorder-stable, rename-fragile) means renaming a `Note` or `ChordType` enum value will corrupt persisted history that used the old name. This is documented in the `toJson` docstring.
