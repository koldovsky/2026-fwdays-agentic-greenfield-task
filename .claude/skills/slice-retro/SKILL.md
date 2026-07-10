---
name: slice-retro
description: Post-slice session retrospective — collect metrics and process friction, write docs/cycles/S-NN.md, apply small process improvements. Run as DoD step 9 at the end of a slice session (after archive), or when the user asks for a session/slice retro.
---

# Slice Retrospective

Analyze the just-finished slice session and turn friction into process
improvements. Run at the END of the slice session, while the dialogue is
still in context. The retro artifact is `docs/cycles/S-NN.md` (Ukrainian —
it is project documentation; see `docs/cycles/README.md` for the template).

## Signal sources (walk all four)

1. **Dialogue**: where did the user have to correct or re-explain
   something; how many times was a decision escalated to the user; which
   decisions the agent made on its own that should have been escalated
   (spec deviations per agent-plan §2); misunderstandings and re-work loops.
2. **Git history of the slice**: `git log` for the slice's commits —
   commit count, reverts/fixups, how many times the pre-commit verify gate
   blocked a commit and why.
3. **Tooling**: fallow false positives (needed `.fallowrc.json` edits?),
   hook failures or annoyances, openspec validate errors, flaky tests,
   Nx cache issues.
4. **Documentation and settings vs reality**: which statements in PRD /
   capability plan / CLAUDE.md / skills / openspec rules turned out
   inaccurate, outdated, or missing; where configured process diverged
   from what was actually practiced.

## Metrics (agent-plan §2)

Record in the artifact, marking estimates as estimates:

- **Час**: calendar session time; approximate net human time (reviews,
  answers, corrections).
- **Токени/вартість**: rough estimate from session length and tool usage;
  ask the user for the exact `/cost` figure and record theirs if given —
  never present an estimate as measured.
- **Ітерації**: verify-gate blocks, re-work loops until DoD.
- **Дефекти**: bugs found in THIS slice that belong to previous slices.
- **Дотримання специфікації**: deviations from FR/NFR/ADR; decisions the
  agent took without escalation.

## Improvements

Split findings into two buckets:

- **Apply now (max 3 per retro)** — small, reversible process fixes:
  skill wording, CLAUDE.md clarifications, hook tweaks, `.fallowrc.json` /
  `openspec/config.yaml` rules. Apply, list them in the artifact, and
  commit with the retro (`chore(S-NN): retro ...`).
- **Propose only** — anything normative or structural: PRD, ADRs,
  glossary, journal entries, DoD changes, new tools. NEVER edit these from
  the retro; record the proposal in the artifact and, where the project
  convention requires, draft the В-/Р-/ADR entry for the user to confirm.

## Procedure

1. Identify the slice ID (S-NN) and its commit range.
2. Walk the four signal sources; collect metrics.
3. Write `docs/cycles/S-NN.md` per the template in `docs/cycles/README.md`.
4. Apply the "apply now" fixes (≤3), stage them together with the artifact.
5. Update `docs/current-state.md` if the retro changed next steps.
6. Summarize to the user: metrics, top friction, what was changed, what
   awaits their decision.
