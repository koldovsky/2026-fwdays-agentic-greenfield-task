# RFC: Template-Driven Editor — APPLIED (superseded by the contract docs)

- **Status:** Applied / Closed (2026-06-27). This RFC has been fully absorbed into the contract
  docs; it is retained only as a provenance tombstone and is **no longer normative**. Do not edit it
  to change behavior — change the contract docs below.
- **Type:** Architecture pivot (transon-blockly editor; depends on engine work in the `transon` repo).
- **Engine baseline:** Transon v0.1.0.

## What it proposed (one line)

Stop hand-writing the Blockly mapping layer; derive the entire editor surface — palette, toolbox,
encoder, decoder — as **Transon-template projections of the engine's editor-metadata** (metadata is
the single source; projections are data executed by the host engine).

## Where it now lives (normative homes)

| RFC topic | Applied in |
|---|---|
| One source, many projections; compiler model (compiler-only) | `SPEC.md` §7.16 (FR-114, FR-115, FR-120, FR-121), AC-034; `ARCHITECTURE.md` AD-026 |
| Distinct-marker staging (`@`/`$`), quoting, no `eval` | `SPEC.md` FR-116; `ARCHITECTURE.md` AD-027; `metadata-contract.md` §6 |
| Codec = fixed skeleton + projected per-rule arms | `SPEC.md` FR-117; `ARCHITECTURE.md` AD-028 |
| `switch` **and** `cond` lazy dispatch | `SPEC.md` FR-118; `ARCHITECTURE.md` AD-029; `metadata-contract.md` §6.1 |
| Build-time codegen + runtime exec via host (two-pass) | `SPEC.md` FR-119; `ARCHITECTURE.md` AD-030; ARCH §5.2 |
| Finite rule-agnostic behavior runtime | `SPEC.md` §13 + NFR-046; `ARCHITECTURE.md` AD-031 |
| Projection-ready metadata: pre-derived variants, resolved enums, split payload | `SPEC.md` §10, NFR-047; `metadata-contract.md` §2.5–§2.8, §2.1 |
| Round-trip by construction | `SPEC.md` §15.1, FR-115, AC-035 |
| Self-hosting (projection templates are templates) | `SPEC.md` UC-016, FR-121, AC-036 |
| Required engine work (rules, export, `include` marker inheritance) | `metadata-contract.md` §6 |
| Milestone resequencing (M0–M5) + ratified OQ-010…OQ-017 | `ROADMAP.md` |
| Verification (parity, codec-regeneration, round-trip-by-construction) | `traceability.md` |

## Open questions — all ratified (2026-06-27)

OQ-010 compiler-only · OQ-011 build-time codegen + runtime exec · OQ-012 add both `switch` and
`cond` · OQ-013 no `quote`/`raw` · OQ-014 `include` default-marker inheritance · OQ-015 split
structural/examples payload · OQ-016 same `EngineProvider`, two-pass generate-then-run · OQ-017
toolbox projected from metadata. See `ROADMAP.md` §"Open questions" for the canonical table.

> The engine-side changes (the `switch`/`cond` rules, the projection-ready `get_editor_metadata()`
> export, and `include` default-marker inheritance) are tracked in the `transon` repository; this
> editor repo consumes the contract recorded in `metadata-contract.md` §6.
