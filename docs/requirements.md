# PRD — Invoice Maker 2026

Last updated: 2026-07-10

This document is the **course traceability index** for numbered requirement IDs.
Every requirement has a stable ID and **exactly one owning capability**.

## Where to read what

| Concern | Location |
| --- | --- |
| **Order + dependencies (read first)** | [docs/capability.md](capability.md) |
| **Expanded per-capability scope** | [docs/capabilities/](capabilities/) |
| **Course traceability index** | [docs/requirements.md](requirements.md) |
| **Authoritative behavior** | `openspec/specs/<capability>/spec.md` |
| **Gate checks** | `openspec/capability-map.yaml` (`npm run capability:check`) |

Refer to [product-brief.md](product-brief.md) for narrative context.
Refer to [current-state.md](current-state.md) for agent session handoff.
Refer to [research.md](research.md) for original discovery notes (Ukrainian).
Refer to [ARCHITECTURE.md](ARCHITECTURE.md) and [ADR-0002](adr/0002-browser-first-mvp.md) for MVP architecture.
NACE codes per [191_2025.pdf](191_2025.pdf) (NACE 2.1-UA, State Statistics Service order No. 191).

## ID conventions

| Prefix | Meaning | Example |
| --- | --- | --- |
| `FR-*` | Functional Requirement | `FR-SHELL-01` |
| `NFR-*` | Non-Functional Requirement | `NFR-PERF-01` |
| `TC-*` | Technical Constraint | `TC-STACK-01` |
| `BC-*` | Business / UX Constraint | `BC-NACE-01` |

Status values: `proposed` · `accepted` · `shipped` · `dropped`.

---

## Capability map (quick reference)

See **[capability.md](capability.md)** for dependencies and order.
Expanded scope per capability: **[capabilities/](capabilities/)**.

| Capability | Slice | Owner |
| --- | --- | --- |
| `shell` | S0 | ui |
| `nace-catalog` | S1 | domain |
| `invoice-calc` | S1 | domain |
| `supplier-profile` | S2 | ui |
| `client-directory` | S2 | ui |
| `banking` | S2 | domain |
| `document-render` | S3 | domain |
| `form-input` | S4 | ui |
| `export-share` | S4 / S6 | ui |
| `invoice-registry` | S5 | ui |
| `invoice-edit` | S6 | ui |

---

## All functional requirements (by ID)

| ID | Capability | Status | Verification |
| --- | --- | --- | --- |
| FR-SHELL-01 | shell | shipped | verify: recording |
| FR-SHELL-02 | shell | shipped | verify: recording |
| FR-SHELL-03 | shell | shipped | verify: local-verifiable |
| FR-INPUT-01 | form-input | shipped | verify: recording |
| FR-INPUT-02 | form-input | shipped | verify: local-verifiable |
| FR-INPUT-04 | form-input | shipped | verify: local-verifiable |
| FR-NACE-01 | nace-catalog | shipped | verify: local-verifiable |
| FR-NACE-02 | nace-catalog | shipped | verify: local-verifiable |
| FR-NACE-03 | nace-catalog | shipped | verify: local-verifiable |
| FR-NACE-04 | nace-catalog | shipped | verify: local-verifiable |
| FR-NACE-05 | nace-catalog | shipped | verify: local-verifiable |
| FR-CALC-01 | invoice-calc | shipped | verify: local-verifiable |
| FR-CALC-02 | invoice-calc | shipped | verify: local-verifiable |
| FR-CALC-03 | invoice-calc | shipped | verify: local-verifiable |
| FR-CALC-04 | invoice-calc | shipped | verify: local-verifiable |
| FR-CALC-05 | invoice-calc | shipped | verify: local-verifiable |
| FR-CALC-06 | invoice-calc | shipped | verify: local-verifiable |
| FR-BANK-01 | banking | proposed | verify: local-verifiable |
| FR-BANK-02 | supplier-profile | shipped | verify: local-verifiable |
| FR-BANK-03 | banking | proposed | verify: local-verifiable |
| FR-TPL-01 | document-render | shipped | verify: local-verifiable |
| FR-TPL-02 | document-render | shipped | verify: local-verifiable |
| FR-TPL-03 | document-render | shipped | verify: local-verifiable |
| FR-TPL-04 | document-render | shipped | verify: local-verifiable |
| FR-TPL-05 | document-render | shipped | verify: local-verifiable |
| FR-EXPORT-01 | export-share | shipped | verify: recording |
| FR-EXPORT-02 | export-share | shipped | verify: recording |
| FR-EXPORT-03 | export-share | shipped | verify: recording |
| FR-EXPORT-04 | export-share | proposed | verify: recording |
| FR-EXPORT-05 | export-share | proposed | verify: recording |
| FR-EDIT-01 | invoice-edit | proposed | verify: local-verifiable |
| FR-EDIT-02 | invoice-edit | proposed | verify: local-verifiable |
| FR-REG-01 | invoice-registry | proposed | verify: local-verifiable |
| FR-REG-02 | invoice-registry | proposed | verify: local-verifiable |
| FR-REG-03 | invoice-registry | proposed | verify: local-verifiable |
| FR-CLIENT-01 | client-directory | shipped | verify: local-verifiable |
| FR-CLIENT-02 | client-directory | shipped | verify: local-verifiable |
| FR-CLIENT-03 | client-directory | shipped | verify: local-verifiable |
| FR-CLIENT-04 | client-directory | proposed | verify: recording |

### Dropped

| ID | Capability | Status | Reason |
| --- | --- | --- | --- |
| FR-NACE-06 | nace-catalog | dropped | No invoice requisite; template has no NACE placeholder (Wayfinder 03) |
| FR-CHAT-01..04 | invoice-chat | dropped | Chat/LLM input — Future, not MVP |
| FR-INPUT-03 | form-input | dropped | Replaced by structured form (FR-INPUT-01) |

---

## Non-functional requirements

| ID | Primary capability | Status | Verification |
| --- | --- | --- | --- |
| NFR-PERF-01 | shell | accepted | verify: deploy-gated |
| NFR-PERF-02 | document-render | shipped | verify: deploy-gated |
| NFR-A11Y-01 | form-input | shipped | verify: a11y |
| NFR-I18N-01 | shell | accepted | verify: local-verifiable |
| NFR-SEC-01 | supplier-profile | accepted | verify: local-verifiable |
| NFR-DX-01 | shell | accepted | verify: local-verifiable |
| NFR-OBS-01 | form-input | shipped | verify: local-verifiable |

## Technical constraints

| ID | Primary capability | Status |
| --- | --- | --- |
| TC-STACK-01 | shell | accepted |
| TC-STACK-02 | shell | accepted |
| TC-STACK-03 | document-render | accepted |
| TC-STACK-04 | nace-catalog | shipped |
| TC-STACK-05 | form-input | proposed |
| TC-STACK-06 | nace-catalog, invoice-calc, document-render | shipped |
| TC-DEPLOY-01 | shell | proposed |
| TC-DATA-01 | invoice-registry (+ directories) | accepted |
| TC-PDF-01 | export-share | proposed |

## Business / UX constraints

| ID | Primary capability | Status |
| --- | --- | --- |
| BC-NACE-01 | nace-catalog | accepted |
| BC-I18N-01 | document-render | accepted |
| BC-LEGAL-01 | document-render | accepted |
| BC-LEGAL-02 | shell | proposed |
| BC-UX-01 | form-input | shipped |
| BC-BRAND-01 | document-render | accepted |
| BC-DEMO-01 | export-share | accepted |
| BC-LANG-01 | — (docs policy) | accepted |

---

## Out of scope (MVP)

- User accounts, organizations, multi-tenant RLS, Supabase, Drizzle (see ADR-0002)
- Payment recording as a ledger entity (`paid` is a manual user label only)
- Email delivery to client or hosted public invoice URLs
- Chat / LLM natural-language input (`FR-CHAT-*`, `FR-INPUT-03`)
- Full NACE 2.1-UA taxonomy (651 classes) — MVP seeds creative-services subset only
- E-invoicing / tax authority integration
- Mobile native app
- AI model training or custom LLM hosting

---

## OpenSpec workflow

1. Read [capability.md](capability.md)
2. `npm run capability:check -- --capability <id>`
3. `/opsx:propose add-<id>` → `/opsx:apply`
4. `status: shipped` in `openspec/capability-map.yaml`
5. `/opsx:sync` → `/opsx:archive`
