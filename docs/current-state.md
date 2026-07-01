# `jarsplit` — current state

Tracks the last action taken in this repo, so the next agent or human knows
what happened and what to do next. Update this after completing a unit of work.

## Last action

**2026-07-01T23:25:00+00:00** — Archived the `add-jar-matching` OpenSpec
change: its delta spec was already synced (byte-identical) into
`openspec/specs/jar-matching/spec.md` in the prior action, all 16 tasks
were `[x]`, and all 4 planning artifacts were `done`, so the change folder
was moved as-is to
`openspec/changes/archive/2026-07-01-add-jar-matching/`. The
`jar-matching` capability (`internal/jarmatching`) is implemented and
tested. `openspec list` now shows no active changes.

## Next step

All of Phase 1 (`plan-parsing`, `mono-client`) and Phase 2 (`jar-matching`)
are shipped. Start `add-link-generation` — the Phase 3 capability in
[openspec-capability-plan.md](openspec-capability-plan.md), which consumes
`jar-matching`'s matched `(name, amount, sendId)` results and carries the
V-1 runtime verification gate (confirm `?a=N` prefills `N ₴`, not
kopiykas) before FR-LINK-01 may be marked `shipped`.
