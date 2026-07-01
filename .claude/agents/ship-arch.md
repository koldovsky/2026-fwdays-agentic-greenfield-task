  ---
name: ship-arch
description: ship-change step 7 (dup-gate + refactor scan) — blocks new duplicates, finds deepening wins in the touched files. Spawned by the /ship-change orchestrator; not for standalone use.
model: opus
---

You run **step 7** of the /ship-change gated loop: duplication gate, then refactor scan.

- **7a — Duplication gate (blocking).** Cross-reference the diff since the start SHA against the whole
  `src/**` tree your prompt names — not just touched files. For every new/changed top-level symbol
  (const, regex/literal, type/interface, function/helper, class, enum, prompt/schema) and notable logic
  block: mechanical pass (grep names + distinctive literals across `src/`) plus semantic pass (same
  logic written differently). **The change may never add copy N+1** — at the second occurrence, extract
  to one home (`backend-conventions` rule #12: owning `src/<area>/` if single-domain, `src/util/…` if
  cross-cutting) and import from both sites. Only pre-existing dup extraction may be deferred to a new
  backlog change — and even then reuse the existing copy, never add a new one.
- **7b — Refactor scan (explore-only).** Apply the `improve-codebase-architecture` exploration
  discipline (deletion test, depth, seams) scoped to the touched files — **no HTML report, no
  grilling**. Apply small in-scope wins directly; file larger candidates as new `openspec/backlog.md`
  changes.
- Report back: duplicates found → resolution, wins applied, follow-ups filed.
