# Workflow: adversarial review-gate (pre-merge)

Tool-neutral workflow definition. The `.claude/workflows/` and `.cursor/workflows/` files are thin
adapters that point here. Run this as a **Day-2 pre-merge pass** on a branch/PR before it lands — it
is the human-or-agent-driven complement to the automatic checkers (the `round-trip-reviewer` subagent,
`.coderabbit.yaml`, and the deterministic gates), adding the one thing single-pass review lacks:
**adversarial verification of every finding before it counts.**

## Why a gate, not just a reviewer

A single reviewer (human or model) produces *plausible* findings — some real, some confidently wrong.
This gate fans the review across independent dimensions and then makes each candidate finding **survive
a refutation attempt** before it blocks merge. Maker ≠ checker still holds: never run the gate on a
slice you implemented yourself.

## Stage 1 — Fan out across dimensions (find)

Review the diff under each dimension *independently* (one focused pass each; a finding from one lens is
blind to the others). For every candidate, record: the file/line, the SPEC/AD ID it violates, and a
one-line claim.

| Dimension | What to hunt for | Authority |
|---|---|---|
| **Round-trip correctness** | import→export changes meaning; a variant matches zero/multiple/partial; ordering or marker-escape regresses; an out-of-surface case silently passes | `harness/skills/round-trip-review.md`; AD-003/004/011, §15.3/15.6/15.7, §11.4 |
| **Runtime safety** | engine runtime leaking into the editor; `file` written to disk in preview; `include`/remote example resolved without the host loader; engine treated as non-authoritative | AD-008/009/010, NFR-004/035, §10.4 |
| **Catalog & metadata parity** | a hand-maintained rule/operator/function list beside the engine export; UI-only Blockly metadata stored in the executable template; per-rule codec/IR/block code reintroduced | AD-012/026, NFR-046, §21.12/21.15 |
| **Spec & traceability** | behavior changed without a SPEC edit first; a renumbered/deprecated ID; a "done" FR/AC with no citing test; a new transformation DSL/path syntax | §21.1/21.2/21.8/21.13, AC-027 |
| **Harness integrity** | a gate that can silently skip/pass; a `.cursor`/`.claude` adapter that copied a body or referenced the other tool; new tooling missing from one tool | `harness/README.md`, `docs/portability.md` |

## Stage 2 — Adversarially verify each finding (refute-or-confirm)

For each Stage-1 candidate, run an **independent** check whose job is to *refute* it. Default to
"refuted" when uncertain — the burden is on the finding to prove it is real:

1. Re-read the cited code/diff and the cited SPEC/AD ID. Does the violation actually hold, or did the
   first pass misread the contract?
2. Where the claim is behavioral (round-trip, marker, surface, variant), **prefer execution**: a
   round-trip corpus case or an engine run beats textual argument (AD-011). If no case exists for the
   touched rule/variant, that *absence* is itself a finding.
3. For trust-critical claims, take more than one refutation angle (correctness vs. security vs.
   does-it-reproduce) rather than the same objection twice.

A finding **survives** only if the refutation fails. Drop the rest — a confidently-wrong finding that
blocks merge is as costly as a missed bug.

## Stage 3 — Verdict

- Run the deterministic gates and treat any red as an automatic 🔴: `check_traceability.py`,
  `check_links.py`, `check_engine_parity.py`, `update_memory.py --check`, `run_evals.py`,
  `check_maturity.py --check`.
- Classify each surviving finding: **🔴 Critical (must fix)** / **🟡 Suggestion** / **🟢 Nice-to-have**,
  each citing its SPEC/AD ID.
- End with a clear merge verdict: **ready to merge**, or the blocking 🔴 list. No 🔴 may be waived
  without a SPEC change (§21.2) or an explicit, recorded decision.

## Composition

This gate *orchestrates*, it does not replace: it applies the `round-trip-review` skill on the relevant
dimensions, escalates the trust-critical slices to the `round-trip-reviewer` subagent (read-only,
opus), reconciles its findings with `.coderabbit.yaml`'s automatic PR review, and folds the
deterministic gate results into the verdict. Drive it for any change touching the codec, variant
matcher, surface check, marker escape, ordering, or a runtime-safety surface — i.e. exactly the
`.coderabbit.yaml` trust-critical paths, verified rather than merely flagged.
