# RFC-002: Codec output contract + projection guardrails — APPLIED (superseded by the contract docs)

- **Status:** Applied / Closed (2026-06-30). This RFC has been fully absorbed into the contract
  docs; it is retained only as a provenance tombstone and is **no longer normative**. Do not edit it
  to change behavior — change the contract docs below.
- **Type:** Contract addition (consumed by `@transon/editor-core` + `@transon/editor-blockly`).
- **Baseline:** Applied on top of the v2.0 projection contract (SPEC §7.16 FR-114…FR-121,
  AC-034…AC-036; ARCHITECTURE AD-026…AD-031; metadata-contract §2). That baseline was unchanged;
  this RFC only **added** the next free IDs above it.

## What it proposed (one line)

Pin the **concrete output contract** of the generated codec — the encoder emits, and the decoder
consumes, **Blockly workspace JSON directly**, with **no editor-defined intermediate representation
and no hand-written mapping layer** — and make every such invariant **gated** (a deterministic check),
so the projection model is enforced mechanically rather than only stated.

## Where it now lives (normative homes)

| RFC topic | Applied in |
|---|---|
| `JsonPathBlockMap` produced as the codec walks | `SPEC.md` FR-122 (§7.12) |
| Skeleton-owned literal marker-key escape, precedence + `transon_object_literal` naming | `SPEC.md` FR-123 (§7.8), §13.7 |
| Codec output = valid Blockly workspace JSON over a fixed block vocabulary (checked over §15.8) | `SPEC.md` FR-124 (§7.16), §13.7/§13.11 |
| Palette block definitions are valid/loadable Zelos (headless gate) | `SPEC.md` FR-125 (§7.16) |
| Encoder emits / decoder consumes workspace JSON directly; no IR, no mapping layer; disposition derived once | `SPEC.md` FR-126 (§7.16); `ARCHITECTURE.md` AD-032, §5.4/§5.6 |
| Presentation/category/colour/domain enums from metadata or projection-data, not TS literals | `SPEC.md` FR-127 (§7.11), NFR-048 (§8.4); `metadata-contract.md` §2.9 |
| Single committed source for category set/order/colour | `SPEC.md` NFR-048; `metadata-contract.md` §2.9 |
| New rule's presentation from data, not code (synthetic-rule test) | `SPEC.md` AC-037 |
| No hand-written codec↔Blockly mapping layer (decision) | `ARCHITECTURE.md` AD-032 |
| Editor-owned presentation is projection-template data | `metadata-contract.md` §2.9 |
| Engine prerequisites: `type` function; `include` `IncludeContext` loader; v0.1.3+ snapshot pin | `metadata-contract.md` §6.4/§6.5; `ROADMAP.md` M1 |
| Codec dispatch on node type (`switch` on `{call: type}`); `set`/`get` do not cross `include` | `metadata-contract.md` §6.4/§6.5; `ROADMAP.md` M1 notes |
| Strict regeneration gate (compare-only; `UPDATE_ARTIFACTS=1` opt-in) | `ARCHITECTURE.md` AD-030; `ROADMAP.md` M1 notes; `traceability.md` |
| Host recursion ceiling fails cleanly with `include_loader` error | `metadata-contract.md` §6.5; `ROADMAP.md` M1 notes |
| Encapsulation finding: light DOM + scoped prefix; shadow DOM not viable | `ARCHITECTURE.md` AD-018 |
| Definition-of-done deltas for the codec + projection/editor milestones | `ROADMAP.md` M1/M2/M3 DoD additions |
| Gates (workspace-shape validity, repo-scan, headless loads, presentation source-scan) | `traceability.md` engine-parity / anti-drift table |

## IDs introduced

FR-122…FR-127, NFR-048, AC-037 (`SPEC.md`); AD-032 (`ARCHITECTURE.md`). Append-only above the v2.0
baseline (max FR-121, NFR-047, AC-036, AD-031); none renumbered (governance §21.1).

> Altitude (as applied): the encoder output is pinned at **direction + block-type naming +
> field/input rule**; exact Blockly serialization details (extra-state for dynamic counts/keys, input
> index naming) are implementation-level and intentionally not fixed by the contract (`SPEC.md`
> FR-124).
