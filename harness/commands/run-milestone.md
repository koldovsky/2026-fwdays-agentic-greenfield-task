# Run a roadmap milestone

Implement the milestone I name (for example `M2`) from `docs/ROADMAP.md`, end to end, in a single
focused pass.

## Authority & guardrails

- The contract is `docs/SPEC.md`. Work only the **FR/NFR/AC IDs cited for this milestone** in
  `docs/ROADMAP.md`; do not pull in scope from other milestones.
- Follow `AGENTS.md`: JSON canonical (AD-003), engine-free (AD-008), strict
  semantic round-trip (AD-004), variants over modes (AD-015), metadata-driven (AD-012), stay in
  scope (§4), keep UI metadata out of the template (§21.12).
- **If a required detail is missing or ambiguous in the SPEC, STOP and propose a spec change first**
  (assign the next free ID; never renumber; never invent behavior inline). Use the
  `spec-traceability` skill for the requirement edit.
- **M0 lives in the `../transon` repo** (the `get_editor_metadata()` export). If the named milestone
  needs metadata the engine does not yet export, STOP and surface the engine dependency.

## Procedure

1. Read the named milestone in `docs/ROADMAP.md` and its cited SPEC/ARCHITECTURE sections/IDs.
2. Create a branch `mX-short-name` and a todo list — one item per FR/AC in the slice.
3. For each requirement: write the test **first**, citing the ID in the name/comment (e.g.
   `// FR-035`), then implement the minimal code. Keep the semantic core in `@transon/editor-core`
   (no Blockly/React/engine dependency).
4. Run the package tests with Vitest until green (`pnpm -r test`, or the touched package).
5. Keep the gates green: `python harness/scripts/check_engine_parity.py` and the execution-based round-trip
   corpus (§15.8, AD-011). If the slice touches the codec, variant matcher, surface check, marker
   escape, or round-trip, run the `round-trip-review` skill.
6. Update `docs/traceability.md` (status + test reference per ID) and the milestone tracker row in
   `docs/ROADMAP.md` — in the same change. Run `python harness/scripts/check_traceability.py`.
7. Satisfy the milestone's **Definition of Done** in `docs/ROADMAP.md` before finishing.

## Notes

- **M0 runs first** — later milestones build on the engine metadata export + Node adapter it
  delivers. At M0, select current stable tool versions and record the exact pins (AD-021).
- For design-heavy slices (M1 IR/codec/matcher, M2 blocks, bidirectional editing §7.15) switch to
  plan mode to lock the approach before writing code.
- One branch / PR per milestone; reference the covered requirement IDs in the PR.
