# `jarsplit` — current state

Tracks the last action taken in this repo, so the next agent or human knows
what happened and what to do next. Update this after completing a unit of work.

## Last action

**2026-07-02T07:20:00+00:00** — Archived the `add-output-reporting`
OpenSpec change: synced its delta spec into a new main spec at
`openspec/specs/output-reporting/spec.md` (6 requirements — stdout
table, `₴` amount formatting, `Разом` total, stderr rendering of every
warning kind, skip reconciliation total, deterministic order — added
verbatim, validated with `openspec validate output-reporting --strict`),
then moved the change folder to
`openspec/changes/archive/2026-07-02-add-output-reporting/`. The
`output-reporting` capability (`internal/outputreport`) covers
FR-OUTPUT-01/02, FR-TOTAL-01/02, and FR-WARN-01, and is implemented and
tested (see prior action: `WriteTable`/`WriteWarnings`, 12 tests,
`jarmatching.Warning.Amount` amendment). `openspec list` now shows no
active changes.

## Next step

Start `add-cli-orchestration` (Phase 5, the last capability in
[openspec-capability-plan.md](openspec-capability-plan.md)): wires
argv → `plan-parsing` → `mono-client` → `jar-matching` → `link-generation`
→ `output-reporting` → exit code, owning FR-FAIL-01/FR-EXIT-01 and
producing the actual `jarsplit` binary. Independently, V-1 (confirm a
real `?a=N` link prefills `N ₴`) is still open — `FR-LINK-01` stays
`accepted`, not `shipped`, until someone runs a real `MONO_TOKEN` through
the pipeline by hand.
