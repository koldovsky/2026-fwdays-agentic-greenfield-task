# MVP capability plan — FR ownership

Last updated: 2026-07-10

This file is the **G3 traceability owner map**: every MVP functional requirement (`FR-*`)
is assigned to exactly one capability slice. Source: `openspec/capability-map.yaml`
and [requirements.md](requirements.md).

## Slice order (shipped → post-MVP)

| Slice | Capabilities | Status |
| --- | --- | --- |
| S0 | `shell` | shipped |
| S1 | `nace-catalog`, `invoice-calc` | shipped |
| S2 | `supplier-profile`, `client-directory`, `banking` | shipped |
| S3 | `document-render` (+ embedded fonts) | shipped |
| S4 | `form-input` | shipped |
| S4b | `export-share` (preview gate) | shipped |
| S5 | `invoice-registry` | post-MVP |
| S6 | `export-share` (pdf gate), `invoice-edit` | post-MVP |

## FR ownership (MVP traceability)

### S0 — `shell`

- FR-SHELL-01
- FR-SHELL-02
- FR-SHELL-03

### S1 — `nace-catalog`

- FR-NACE-01
- FR-NACE-02
- FR-NACE-03
- FR-NACE-04
- FR-NACE-05
- FR-NACE-06 *(dropped — not printed on invoice; cited in spec as SHALL NOT)*

### S1 — `invoice-calc`

- FR-CALC-01
- FR-CALC-02
- FR-CALC-03
- FR-CALC-04
- FR-CALC-05
- FR-CALC-06

### S2 — `supplier-profile`

- FR-BANK-02

### S2 — `client-directory`

Numbered 2026-07-10. The capability shipped with a spec, 10 passing tests and
real code, but owned **no FR ids**, so it sat outside the trace chain entirely
and could have regressed without any gate noticing. Ids derived from its own
spec scenarios; nothing invented.

- FR-CLIENT-01
- FR-CLIENT-02
- FR-CLIENT-03
- FR-CLIENT-04 (`proposed` — the "issued invoice unchanged" scenario cannot be
  verified until `invoice-registry` (S5) exists to hold the snapshots)

### S2 — `banking`

- FR-BANK-01
- FR-BANK-03

### S3 — `document-render`

- FR-TPL-01
- FR-TPL-02
- FR-TPL-03
- FR-TPL-04
- FR-TPL-05

### S4 — `form-input`

- FR-INPUT-01
- FR-INPUT-02
- FR-INPUT-03 *(dropped — no chat/LLM in MVP; cited in spec as SHALL NOT)*
- FR-INPUT-04

### S4b — `export-share` (preview)

- FR-EXPORT-01
- FR-EXPORT-02
- FR-EXPORT-03

### S5 — `invoice-registry`

First slice delivered through the full G4 loop with earned evidence (tests-first
red→green, review-gate, `Slice:` trailer). Storage + domain-logic layer.

- FR-REG-01 → stored statuses draft|sent|paid|cancelled
- FR-REG-02 → derived overdue (display-only, never stored)
- FR-REG-03 → issued snapshot immutability
- TC-DATA-01 → browser persistence (shared with the directories)

### Post-MVP (owned, not shipped in course submission)

- FR-EXPORT-04 → `export-share` (pdf gate)
- FR-EXPORT-05 → `export-share` (pdf gate)
- FR-EDIT-01 → `invoice-edit`
- FR-EDIT-02 → `invoice-edit`

## Acceptance methods

| Capability | Primary verification |
| --- | --- |
| Domain modules | Vitest unit tests (`src/lib/**`) |
| UI capabilities | Vitest + manual M4 walkthrough + Loom demo |
| Gates | `npm run test`, `npm run build`, `openspec validate --all --strict` |
| Process | `check-traceability`, `check-trajectory`, fork adversarial PRs #2, #6–8 |

## Sign-off

MVP course submission scope: **S0–S4b shipped** (supplier/client → form → preview → print/HTML/PDF).
Post-MVP slices documented in [capability.md](capability.md) and OpenSpec specs.
