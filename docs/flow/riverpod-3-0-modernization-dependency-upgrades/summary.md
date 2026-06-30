# Feature Summary: Riverpod 3.0 Modernization + Dependency Upgrades
_Archived: 2026-06-30_
_Status: DONE_

## Goal
Bring Chord Dice to the latest stable Flutter / Dart / Riverpod ecosystem and migrate all `StateNotifierProvider`s to the modern `@riverpod` codegen Notifier API. Adopt the fully-typed async `SharedPreferences` API across the app, fix the architectural smells flagged in the prior Riverpod review (held `_ref` field, missing `ref.onDispose` for FluidSynth, fire-and-forget prefs writes), and refresh docs/Serena memories to match. No new app features, no UI changes, no dice geometry/motion/polyhedra, audio synthesis, or music-theory model changes.

## What Was Built

### Dependency & tooling (Phase 1)
- `pubspec.yaml` bumped: `flutter_riverpod ^3.0.0`, `shared_preferences ^2.5.x`, `share_plus ^13.0.0` (exceeds the brief's `^12.x` target), plus latest patch/minor on `flutter_animate`, `flutter_midi_pro`, `path_provider`, `vector_math`, `cupertino_icons`, `fake_async`, `flutter_lints`.
- New dev_deps: `riverpod_annotation`, `riverpod_generator`, `build_runner`, `riverpod_lint`. `custom_lint` was deliberately omitted — see Deviations.
- `lib/screens/home_screen.dart:325` share call migrated to `SharePlus.instance.share(ShareParams(...))` to match share_plus 13's new API.
- Temporary legacy bridge: three provider files imported `flutter_riverpod/legacy.dart` with `// ignore_for_file: deprecated_member_use` + `TODO(phase-2)` markers until Phase 2 migrated them.

### Riverpod 3 codegen migration + architectural fixes (Phase 2)
All five providers converted to `@Riverpod(keepAlive: true)` codegen Notifiers with generated `*.g.dart` files committed alongside source:
- `lib/providers/theme_provider.dart` + `theme_provider.g.dart` — `ThemeNotifier` now extends `_$ThemeNotifier`; `build()` returns defaults synchronously then schedules `Future.microtask(_load)`; setters (`setMode`, `setPalette`) return `Future<void>` and await prefs writes.
- `lib/providers/arpeggio_provider.dart` + `.g.dart` — same pattern as theme. `toggle`/`setEnabled`/`setPattern` return `Future<void>`.
- `lib/providers/dice_provider.dart` + `.g.dart` — `DiceNotifier` extends `_$DiceNotifier`. **Held `_ref` field deleted.** `_persistHistory` and `clearHistory` awaits prefs writes (no more `unawaited`). Post-`await` checks use `ref.mounted` (10+ sites). Two `ref.read(arpeggioProvider)` call sites (`settleRoll:218`, `replayFromHistory:243`) carry the `// snapshot at fire-time, not a subscription` comment. Watchdog cleanup registered via `ref.onDispose`.
- `lib/services/audio_service.dart` + `.g.dart` — `audioServiceProvider` is a `@Riverpod(keepAlive: true)` factory; existing `ref.onDispose(service.dispose)` preserved at line 223 for FluidSynth release.
- `lib/services/dice_service.dart` + `.g.dart` — `diceServiceProvider` is a `@Riverpod(keepAlive: true)` factory.
- `sharedPreferencesProvider` retyped to `Provider<SharedPreferencesAsync>` (kept manual, co-located in `theme_provider.dart`, so `main()` can override with a pre-constructed instance).
- `lib/main.dart` — constructs `SharedPreferencesAsync()` synchronously and overrides via `sharedPreferencesProvider.overrideWithValue(prefs)`; `SharedPreferences.getInstance()` removed.
- `analysis_options.yaml` — added `plugins: riverpod_lint: ^3.1.3` block (activates rules via `analysis_server_plugin`).
- Tests updated: `test/dice_provider_test.dart` and `test/theme_provider_test.dart` rewired for async hydration using an in-memory `SharedPreferencesAsync` + microtask-pump helper. Assertions unchanged.

### Documentation & memory refresh (Phase 3)
- `CLAUDE.md` — state-management section rewritten around `@riverpod` codegen Notifiers; `dart run build_runner build --delete-conflicting-outputs` added to the dev loop; `riverpod_lint` activation noted; reference to the new design spec added.
- Serena memories updated (stored in MCP memory server, not committed to git): `project_overview`, `code_style`, `architecture_invariants`, `suggested_commands`, `task_completion` — all reflect Riverpod 3 codegen, `ref.mounted` idiom, generated `.g.dart` commit policy, and `SharedPreferencesAsync`.

## Phases Completed
| Phase | Name | Key Outcome |
|-------|------|-------------|
| 1 | Dependency upgrades & codegen tooling | `pubspec.yaml` on Flutter/Dart/Riverpod 3 ecosystem; share_plus 10→13 call-site fix; `flutter analyze` zero; 160 tests green. |
| 2 | Riverpod 3 codegen migration + architectural fixes | All 5 providers on `@Riverpod(keepAlive: true)`; async prefs end-to-end; `_ref` gone; `ref.onDispose` preserved for FluidSynth; generated files committed atomically; `riverpod_lint` active. |
| 3 | Documentation & memory refresh | CLAUDE.md rewritten; Serena memories updated. |

## Edge Cases Handled
- **Cold-start theme flash** — accepted trade-off: at most one frame (~16ms) of default theme before user-saved theme swaps in. Achieved via sync default in `build()` + `Future.microtask(_load)` + `if (ref.mounted) state = loaded;` guard. Alternative (FutureProvider splash gate) was explicitly rejected.
- **Cold-start dice history** — same sync-default + async-load pattern. `_loadHistoryAsync` only writes `state = ...` when `ref.mounted && state.history.isEmpty`, so a concurrent roll cannot be clobbered by hydration.
- **Prefs read failure on hydration** — swallowed via try/catch + `debugPrint`; defaults preserved. Mirrors prior behavior.
- **Corrupt history JSON / bad enum names** — existing per-entry try/catch preserved verbatim.
- **Idempotent `settleRoll`** — preserved. Watchdog + callback paths both safe. Test 7 (watchdog fires via `fake_async`) and test 11 (dispose mid-roll) both still green.
- **`mounted` → `ref.mounted`** — applied at all 10+ post-await sites across the three persistent notifiers. No semantic drift.
- **`AudioService.dispose` via `ref.onDispose`** — confirmed already present at `lib/services/audio_service.dart:223`; no source change needed to `AudioService`.
- **`audioServiceProvider` auto-dispose mid-roll** — prevented via `@Riverpod(keepAlive: true)`.
- **Codegen workflow** — `dart run build_runner build --delete-conflicting-outputs` produces 0 outputs on re-run (stable). Generated files are not gitignored.
- **`share_plus` API drift 10→13** — `SharePlus.instance.share(ShareParams(files:, subject:, sharePositionOrigin:))` call-site migration at `home_screen.dart:325`.
- **Test hydration race** — `_settle(container)` helper pumps two `Future.delayed(Duration.zero)` turns after container read to flush microtask + I/O futures before asserting.

## Deviations From Original Plan
- **`custom_lint` not added as a dev dependency.** The brief and plan called for adding `custom_lint` as a dev dep and enabling it in `analysis_options.yaml`. The implementer discovered that `riverpod_lint` 3.x dropped the `custom_lint` host requirement and uses `analysis_server_plugin` directly — adding `custom_lint` would cause an analyzer version conflict. The brief's intent (enforce `riverpod_lint` rules during `flutter analyze`) is fully achieved via the `plugins: riverpod_lint:` block in `analysis_options.yaml`. Decision documented in the design spec, CLAUDE.md, and Serena memories. Consequence: the `dart run custom_lint` command mentioned in the plan for `CLAUDE.md`, `.flow-spec/project.md`, and the `suggested_commands` / `task_completion` memories was not added.
- **`share_plus` bumped to `^13.0.0`**, not `^12.x`. Strictly more current; satisfies intent. Call site already on the new `SharePlus.instance.share(ShareParams(...))` API introduced in 11+.
- (Phase 1 review) **`riverpod_lint` plugin activation initially missed** in the first Phase 1 attempt — the dependency was added but the `plugins: riverpod_lint:` block was not. Corrected before Phase 2 as part of the Phase 1 re-review (final Phase 1 was clean on re-review).

## Out of Scope (Not Implemented)
- No new app features — dice, audio synthesis path, music theory, theming visuals, UI widgets all unchanged.
- `lib/models/` untouched — `Note`, `ChordType`, `Chord`, `DiceResult`, `AccentPalette`, `ThemeSettings`, `ArpeggioPattern`, `ArpeggioSettings` byte-for-byte identical.
- `lib/widgets/` rendering unchanged — `polyhedron.dart`, `dice_motion.dart`, `dice_3d.dart`, `dice_stage.dart`, `vertical_piano_keyboard.dart`, `chord_info_card.dart`, `roll_button.dart`, `history_strip.dart`.
- `lib/services/` business logic unchanged — only provider wrappers changed.
- `lib/constants.dart` unchanged.
- `lib/theme.dart` + `accent_palette.dart` unchanged (ColorScheme.fromSeed pipeline preserved).
- No CI / pre-commit hook setup.
- No `share_plus` removal (retained for MIDI export).
- No new lint rules beyond `riverpod_lint` plugin enablement.

## Review Findings
Three review rounds were conducted (one per phase):

- **Phase 1 review (`review-1-report.md`) — PASSED (re-reviewed).** First pass surfaced 1 must-fix (missing `plugins: riverpod_lint:` block in `analysis_options.yaml`) and 2 should-fix cosmetics (double-import comment clarity, `ignore_for_file` placement). All addressed before the final Phase 1. Re-review confirmed clean.
- **Phase 2 review (`review-2-report.md`) — PASSED.** 0 must-fix, 0 should-fix. 2 low-priority suggestions (relocate `sharedPreferencesProvider` to its own file; intermediate `ref.mounted` guard between sequential theme-prefs awaits). Both deferred as non-blocking.
- **Phase 3 review (`review-3-report.md`) — HAS_ISSUES, all should-fix.** 0 must-fix. 4 should-fix: (1) `CLAUDE.md:109` stale `mounted` wording vs. `ref.mounted`, (2) `CLAUDE.md:120` stale blurb for the 2026-06-30 theme spec (still says "SharedPreferences-backed"), (3) `CLAUDE.md` missing `dart run custom_lint` command or acknowledgement, (4) `.flow-spec/project.md` same `dart run custom_lint` omission. The final check ultimately accepted the `custom_lint` omission as a deliberate documented technical decision (riverpod_lint 3.x drops custom_lint host) and marked the final status DONE.

## Final Check Outcome
`check-result.md` Status: **DONE**. All verification buckets clean:
- Acceptance criteria: `flutter pub get` clean, build_runner 0 outputs on re-run, `dart format` no-op (48 files, 0 changed), `flutter analyze` zero (13.2s, riverpod_lint active), `flutter test` 160/160 green, CLAUDE.md updated, Serena memories updated, design spec committed.
- User-confirmed decisions: Q1=c (sync default + async hydration + `ref.mounted`), Q2=a' (share_plus ^13.0.0), Q3=a (`ref.mounted` everywhere), Q4=c (three phase commits), Q5=a (atomic per-phase commits).
- Architectural fixes: `_ref` gone (0 matches), snapshot comments present at `dice_provider.dart:218, 243`, `ref.onDispose(service.dispose)` preserved at `audio_service.dart:223`, `_persistHistory`/`clearHistory` awaits confirmed at lines 152/215/268.
- Invariants not regressed: callback-driven roll lifecycle, watchdog + idempotent settle all green; timing constants unchanged; lazy audio init preserved; `_noteToMidi` and `Chord.chordNotesWithOctave` single sources preserved; `ColorScheme.fromSeed` unchanged; `ChordType` const tables untouched; music-theory tests (22) green.
- Out-of-scope adherence: zero diff in `lib/widgets/`, `lib/models/`, `lib/constants.dart`, `lib/theme.dart`, audio synthesis path, no new features, no UI changes.
- Generated files: all 5 `*.g.dart` files tracked by git.

No issues, no regressions.

## Files Changed
Source / config:
- `pubspec.yaml` — Flutter/Dart/Riverpod 3 + dev deps (annotation, generator, build_runner, riverpod_lint), async shared_preferences, share_plus ^13.0.0.
- `pubspec.lock` — regenerated.
- `analysis_options.yaml` — added `plugins: riverpod_lint: ^3.1.3` block.
- `lib/main.dart` — replaced `SharedPreferences.getInstance()` with `SharedPreferencesAsync()`.
- `lib/providers/theme_provider.dart` — converted to `@Riverpod(keepAlive: true) class ThemeNotifier`; holds the manual `sharedPreferencesProvider<SharedPreferencesAsync>`.
- `lib/providers/theme_provider.g.dart` — generated.
- `lib/providers/arpeggio_provider.dart` — converted to `@Riverpod(keepAlive: true) class ArpeggioNotifier`.
- `lib/providers/arpeggio_provider.g.dart` — generated.
- `lib/providers/dice_provider.dart` — converted to `@Riverpod(keepAlive: true) class DiceNotifier`; `_ref` field removed; prefs writes awaited; `ref.mounted` everywhere post-await; snapshot comments at two `ref.read(arpeggioProvider)` sites; watchdog `ref.onDispose`.
- `lib/providers/dice_provider.g.dart` — generated.
- `lib/services/audio_service.dart` — `audioServiceProvider` is a `@Riverpod(keepAlive: true)` factory; `ref.onDispose(service.dispose)` preserved for FluidSynth release.
- `lib/services/audio_service.g.dart` — generated.
- `lib/services/dice_service.dart` — `diceServiceProvider` is a `@Riverpod(keepAlive: true)` factory.
- `lib/services/dice_service.g.dart` — generated.
- `lib/screens/home_screen.dart` — share call migrated to `SharePlus.instance.share(ShareParams(...))` at ~line 325.

Tests:
- `test/dice_provider_test.dart` — rewired for `SharedPreferencesAsync` + microtask-pump hydration; 16+ tests updated.
- `test/theme_provider_test.dart` — rewired for async hydration; 14 tests updated.
- Other tests (`chord_test`, `dice_service_test`, `arpeggio_pattern_test`, `dice_motion_test`, `polyhedron_test`, `dice_stage_widget_test`, `accent_palette_test`) — no source changes, all green.

Docs:
- `CLAUDE.md` — state-management section rewritten; codegen command added; `riverpod_lint` note; reference to the new design spec.

(Serena memories `project_overview`, `code_style`, `architecture_invariants`, `suggested_commands`, `task_completion` were updated via Serena MCP — these live outside the git repo, by design.)

## Notes
- **No `phase-*-result.md` files were present in `.flow-spec/` at archive time.** The implementer workflow produced reviews (one per phase) and a final check report but did not write explicit phase-result artifacts. The "What Was Built" and "Phases Completed" sections above were reconstructed from `feature-plan.md`, the three `review-*-report.md` files, and `check-result.md`. If future archives want richer per-phase detail, ensure `/flow:implement` writes a `phase-N-result.md` per phase.
- **`custom_lint` command gap is documented, not a bug.** The design spec explains why `custom_lint` was dropped (riverpod_lint 3.x uses `analysis_server_plugin` directly; `custom_lint` causes an analyzer version conflict). CLAUDE.md and the design spec both now document the mechanism. If a future contributor expects `dart run custom_lint`, they should read the design spec first.
- **Follow-up candidates (explicitly non-blocking):**
  - Relocate `sharedPreferencesProvider` from `theme_provider.dart` to its own file to decouple two otherwise-unrelated providers.
  - Consider adding an intermediate `ref.mounted` guard between the two sequential prefs reads in `ThemeNotifier._load` (belt-and-suspenders).
  - The `share_plus` bump's call-site migration narrative could be fleshed out in the design spec's Dependency changes section.
  - The `ref.onDispose(service.dispose)` contract for `audioServiceProvider` is captured implicitly in memories but not elevated as a named invariant in the design spec.
- **Cold-start trade-off is user-visible but accepted.** On first frame after a cold start, users with non-default themes may see ~16ms of default theme before swap. Material 3 `ColorScheme.fromSeed` means this is a brief color shift, not a layout shift — within product tolerance.
