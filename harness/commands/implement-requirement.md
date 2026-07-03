# Implement one requirement

Implement exactly one requirement by ID (for example `FR-035`), given as the argument. If none is
given, pick the first unchecked row for the active milestone in `docs/traceability.md`.

## Preconditions

1. Read the requirement text in `docs/SPEC.md` and its cited ARCHITECTURE/metadata sections.
2. Confirm it belongs to the milestone currently in progress (`docs/ROADMAP.md`); do not pull in
   neighboring requirements unless they are interlocked.
3. If the SPEC is ambiguous or the requirement needs new behavior, STOP and propose a spec change
   (next free ID; never renumber). Use the `spec-traceability` skill.

## Checklist (one requirement per run)

1. Write the test **first**, citing the ID in the name/comment (e.g. `// FR-035`). For
   catalog-touching work, derive expectations from the engine `get_editor_metadata()` export, not a
   hand-written list.
2. Implement the minimal code in the right package — the semantic core goes in `@transon/editor-core`
   (no Blockly/React/engine deps).
3. Run Vitest for the touched package until green.
4. If the requirement touches `JSON⇄IR`, variant matching, the surface check, marker escape, or
   round-trip, run the `round-trip-review` skill and add/extend a round-trip corpus case (§15.8).
5. Update the matching `docs/traceability.md` row (status + test reference) in the same change.
6. Run `python harness/scripts/check_traceability.py` and `python harness/scripts/check_engine_parity.py`; both green.

## Hard rules

- One requirement per run; resist scope creep into neighboring requirements.
- Never report a template valid when engine validation would fail (NFR-004).
- Keep UI-only metadata out of the executable template (§21.12).
