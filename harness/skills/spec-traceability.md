---
name: spec-traceability
description: Manage docs/SPEC.md requirements with stable IDs and keep them mapped to code and Vitest tests for the Transon Visual Editor. Use when adding, editing, or deprecating a requirement (FR/NFR/AC/UC/AD/OQ), implementing a requirement, or checking that every implemented requirement has a test.
disable-model-invocation: true
---

# Spec Traceability

Keeps `docs/SPEC.md` and the codebase in sync without breaking the stable requirement-ID contract
(`SPEC.md` §21.1, §21.2, §21.13). The granular matrix lives in `docs/traceability.md`.

## ID scheme

| Prefix | Meaning | Home |
|--------|---------|------|
| `FR-`  | Functional requirement | `SPEC.md` §7 |
| `NFR-` | Non-functional requirement | `SPEC.md` §8 |
| `AC-`  | Acceptance criterion | `SPEC.md` §20 |
| `UC-`  | Use case | `SPEC.md` §6 |
| `AD-`  | Architecture decision | `ARCHITECTURE.md` §3 |
| `OQ-`  | Open question | `ROADMAP.md` |

## Adding or changing a requirement

1. Confirm it is in scope (`SPEC.md` §4). If it expands scope, propose the change and stop for approval.
2. Find the highest existing number for the prefix and assign the **next free number**. Never
   renumber or reuse.
3. To retire a requirement, mark it `(deprecated)` in place with a reason — do not delete it.
4. Add it in the correct section, matching the surrounding style.
5. If it changes behavior, update the matching tests and `docs/traceability.md` in the same change.
   An `AD-xxx` that changes behavior must also be reflected in `SPEC.md` (§21.2).

## Implementing a requirement

1. Reference the ID in the commit/PR.
2. Reference the ID in the Vitest test name/comment, e.g.
   `it('imports the attr name variant', ...) // FR-054`.
3. Update the row in `docs/traceability.md` (status + test reference).

## Coverage check

Run the deterministic checkers, then resolve every gap reported:

```bash
python harness/scripts/check_traceability.py
python harness/scripts/check_engine_parity.py
```

`check_traceability.py` flags IDs cited in code/tests or in `traceability.md` that aren't defined in
the contract docs, deprecated IDs cited by tests, and FR/AC marked done with no referencing test.
`check_engine_parity.py` flags rule/operator/function drift between `SPEC.md` §14 and the engine.

## Output

A short table — `ID | summary | implemented? | tested? | gap` — with concrete follow-ups. Do not edit
`docs/SPEC.md` unless the task asks for a spec change.
