---
description: Architectural audit of the chord-dice codebase against named invariants
argument-hint: "[scope — e.g. lib/providers/, HEAD~5..HEAD, or empty for all of lib/]"
---

You are performing an architectural audit of this Flutter + Riverpod codebase. Goal: find **architectural drift, invariant violations, and latent bugs** — not style nits. Use Serena MCP (`get_symbols_overview`, `find_symbol`, `find_referencing_symbols`, `search_for_pattern`) for navigation. Read `CLAUDE.md` and relevant specs in `docs/superpowers/specs/` before judging any subsystem.

**Scope**: $ARGUMENTS (if empty, audit the full `lib/` tree).

## Review lenses — rank findings by which invariant they break

1. **Roll lifecycle integrity** — Is `settleRoll()` still idempotent? Can `rollingTarget` ever leak into `current` out-of-order? Are `kRollAnimationDuration` / `kRollWatchdogGrace` read from `constants.dart` everywhere, or hardcoded anywhere? Does any widget call `AudioService` directly instead of going through `DiceNotifier`?

2. **Chord math centralization** — Is `Chord.chordNotesWithOctave` still the single source of truth? Find any reimplemented interval math (`% 12`, `(octave + 1) * 12 + semitone`, hand-rolled semitone tables). Is `ChordType` metadata still in the single `_ChordMeta` record map, or has it split back into parallel tables?

3. **Notation canonicality** — Do `Chord.name`, `chordNotesWithOctave`, `noteToMidi`, or tests branch on `NotationPreference`? They must be sharp-only; conversion happens only at render via `formatNote` / `ChordDisplayX`.

4. **Geometry / motion / rendering split** — Does `dice_3d.dart` hold animation state? Does `polyhedron.dart` know about tumble math? Does `dice_motion.dart` paint? Each file should do exactly one thing.

5. **Riverpod codegen contract** — Every notifier should be `@Riverpod(keepAlive: true) class`. No hand-written providers, no `StateNotifierProvider`. After any `await` in a notifier method, is `ref.mounted` re-checked before mutating state? Same for `mounted` in `State` subclasses.

6. **Theme purity** — Any hardcoded colors in widgets? Every color should flow from `Theme.of(context).colorScheme`. Icons/text over `secondary` surfaces must use `onSecondary`. `google_fonts` must not reappear.

7. **Selection invariants** — Can `chordSelectionProvider` ever exit the 3–20 range? Does `faceLabels` still cyclically fill 20 slots? Does `rollD20` sample over the active list (not faces)? Does `ref.listen` in `DiceNotifier.build()` re-resolve `chordFaceIndex` when selection changes?

8. **Lifecycle gating** — Is `ShakeDetector` still gated on (enabled ∧ resumed ∧ isCurrent)? Any weakening of this is a battery regression.

9. **Persistence defenses** — `SharedPreferencesAsync` decoders must tolerate corrupt JSON, unknown enum names, duplicates, and out-of-range values without crashing. Check `chord_selection_provider`, history, theme, shake, arpeggio, notation.

10. **Spec/code divergence** — For each spec in `docs/superpowers/specs/`, does the current code still match? List any drift.

11. **Test coverage gaps** — Flag any new public API in `lib/models/` or `lib/services/` without a matching test. The music-theory suite (`test/chord_test.dart`) must stay comprehensive — any new `ChordType` without coverage is a finding.

## Output format

For each finding:

```
[SEVERITY: critical|high|medium|low] [LENS: 1–11]
file_path:line_number
Problem: <one sentence>
Evidence: <symbol name or short quote>
Why it matters: <which invariant/spec it breaks>
Suggested fix: <one sentence, no code>
```

End with a **Top 3** list the user should fix first.

## Ground rules

- Ignore style, formatting, and taste — focus on things that would confuse a future maintainer or break a shipped feature.
- Do not propose refactors that aren't tied to a named invariant violation.
- If a finding contradicts a design spec, cite the spec file.
- Run `flutter analyze` at the end and include any issues it surfaces as findings under the appropriate lens.
