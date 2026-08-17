## Context

`document-session`, `wizard-shell`, `document-type`, `document-numbering`, and `contacts` are shipped. Session JSON already has `services: ServiceLine[]` (defaults to `[]`). Step 5 is still a stub. This change implements the services catalog file and step-5 UI so later template/PDF steps have stable line-item snapshots.

Constraints: data under configurable data root (NFR-12); kebab-case JSON keys (NFR-13); Ukrainian UI; no auth; reuse wizard chrome and session PATCH patterns from prior steps; `ServiceLine` type already exists in `lib/document-session/types.ts`.

## Goals / Non-Goals

**Goals:**
- Step 5 UI: select from catalog and/or create service lines; support multiple rows («додати ще») (FR-11, FR-12)
- Persist catalog at `{data-root}/jobs/services.json` as a JSON array
- Line fields: `sign-name`, `service-name`, `amount`, `price` (FR-12, NFR-13)
- On confirm, write/update catalog entries and store full line snapshots on session `services`
- Require ≥ 1 valid line (non-empty names; positive `amount` and non-negative `price`) before «Далі» (DESIGN §5)
- Surface catalog/session save failures; do not advance on failure (NFR-10)
- Update wizard-shell so step 5 is real content; steps 6–7 remain stubs

**Non-Goals:**
- Template fill / PDF / `price-total` computation (belongs to `template-fill`, TC-24)
- Changing wizard step count by document type
- Auth, ЕДО, legal guarantees (BC-02, BC-03, BC-08)
- Deleting catalog entries from the UI (overwrite/upsert only for MVP)
- Syncing old session `services` when the catalog is later edited
- Units of measure, VAT lines, or multi-currency

## Decisions

### 1. Single catalog file, array shape
Path: `path.join(getDataRoot(), "jobs", "services.json")`. Contents: JSON array of catalog entries:

```json
[
  {
    "sign-name": "…",
    "service-name": "…",
    "amount": 1,
    "price": 1000
  }
]
```

`amount` / `price` on catalog entries are optional hints (last-used values). Document lines always carry all four fields.

**Why:** Matches FR-11 path and DESIGN §3.3. One file is simpler than per-service files (unlike contacts keyed by РНОКПП). Alternative: one file per service — rejected; PRD fixes `./jobs/services.json`.

### 2. Catalog APIs per DESIGN.md
| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/api/jobs/services` | Return catalog array (empty array if file missing) |
| `PUT` | `/api/jobs/services` | Replace catalog file with validated array body |

**Why:** Matches DESIGN §9. Full-array PUT keeps MVP simple; list size is small for local use. Optional `?q=` filter can be client-side on the loaded array.

### 3. Catalog identity: upsert by `sign-name`
When merging document lines into the catalog, treat trimmed `sign-name` as the unique key within the array. Same `sign-name` overwrites that entry (update `service-name` and last `amount`/`price`). Different `sign-name` values append.

**Why:** Gives a stable “select existing” key without inventing IDs. Alternative: match `sign-name` + `service-name` — rejected as awkward for renaming the long name while keeping the short label. Alternative: always append — rejected (duplicates clutter pick UI).

### 4. Save on «Далі»: catalog merge then session snapshot
On step 5 «Далі»:
1. Validate ≥ 1 line; each line has non-empty trimmed `sign-name` and `service-name`; `amount` is a finite number > 0; `price` is a finite number ≥ 0
2. `GET` current catalog (or keep in-memory from step load), upsert each confirmed line by `sign-name`, then `PUT /api/jobs/services` with the merged array
3. `PATCH /api/docs/{guid}` with `{ services: ServiceLine[], "current-step": 6 }`

Selecting a catalog entry copies its fields into a new/edited document row (user may change amount/price for this document only). Confirm still upserts catalog with the form values (last-used hints).

**Why:** Catalog is reusable; session holds document snapshots so later PDF does not drift (DESIGN §3.1 pattern, same as contacts). Alternative: session-only without catalog write — rejected (FR-11 requires `./jobs/services.json`).

### 5. Document lines vs catalog
- Session `services[]`: ordered list of lines for **this** document (may include the same `sign-name` only once per document for MVP clarity, or allow duplicates if user adds two rows — **allow multiple rows even with same sign-name** so TC-14 “2 services” is unconstrained; catalog upsert still last-wins by `sign-name`)
- UI: start from session `services` if non-empty on re-entry; otherwise one empty row or empty list with «додати ще»
- «додати ще» appends a blank row; user can remove a row if more than one remains (optional but useful; if omitted, user can clear fields — prefer explicit remove when >1 row)

**Why:** TC-14 requires two services in the document; DESIGN requires «додати ще».

### 6. Module layout
`lib/services-catalog/` (or `lib/jobs/`): types (reuse/alias `ServiceLine`), store (`readServicesCatalog`, `writeServicesCatalog`, `upsertServicesIntoCatalog`), errors, unit tests. Route handlers call the store; UI does not touch FS. Add `getJobsDir()` / `getServicesCatalogPath()` beside existing data-root helpers.

**Why:** Mirrors `lib/contacts` and keeps data-root logic server-side.

### 7. Pre-fill from session
When re-entering step 5 (Назад / reload), prefer session `services` if length > 0; catalog remains available to add more lines. Empty `services` → start with one blank row ready to fill or pick.

**Why:** NFR-04 / TC-21 — reload restores step and data without a new `guid`.

### 8. Numeric parsing
Accept user input as numbers; coerce from trimmed decimal strings in the UI before PATCH. Reject NaN / non-finite. Store JSON numbers (not strings) for `amount` and `price` to match `ServiceLine` and later `price-total` math.

**Why:** Type already uses `number`; template-fill will sum `amount × price`.

## Risks / Trade-offs

- [Catalog edit after document saved] → Mitigation: session `services` snapshot is authoritative for that document
- [Upsert by `sign-name` collapses distinct long names] → Mitigation: document as intentional; user can use distinct short names
- [Partial failure: catalog OK, session PATCH fails] → Mitigation: show error, stay on step; catalog PUT is idempotent on retry (NFR-10)
- [Missing catalog file] → Mitigation: treat as `[]` on GET; create `jobs/` on first PUT
- [Concurrent writers] → Mitigation: acceptable for single-user local MVP; last PUT wins

## Migration Plan

- No migration of existing sessions; `services` remains `[]` until step 5 confirms
- New `jobs/services.json` created on first successful PUT
- Rollback: revert UI to stub; unused catalog file is harmless

## Open Questions

- None blocking. Client-side filter vs server `?q=` can follow list size; default load-all for MVP.
