## Context

`document-session`, `wizard-shell`, `document-type`, and `document-numbering` are shipped. Session JSON already supports optional `client` and `done-by` (`ContactRef` with kebab-case fields). Steps 3–4 are still stubs. This change implements contact catalog persistence and select-or-create UI so later template/PDF steps have stable party snapshots.

Constraints: data under configurable data root (NFR-12); kebab-case JSON keys (NFR-13); Ukrainian UI; no auth; reuse wizard chrome and session PATCH patterns from prior steps; `ContactRef` type already exists in `lib/document-session/types.ts`.

## Goals / Non-Goals

**Goals:**
- Step 3 UI: select or create замовник; persist catalog file and session `client` snapshot (FR-08, FR-10)
- Step 4 UI: same for виконавець → session `done-by` (FR-09)
- Catalog path `{data-root}/contacts/{inn}.json`; same РНОКПП overwrites one file (NFR-05, BC-05)
- Require non-empty РНОКПП (`inn`) before save; block «Далі» when invalid (TC-26)
- Surface catalog/session save failures; do not advance on failure (NFR-10)
- Update wizard-shell so steps 3–4 are real content; steps 5–7 remain stubs

**Non-Goals:**
- Template fill / PDF / services catalog
- Changing wizard step count by document type
- Auth, ЕДО, legal guarantees (BC-02, BC-03, BC-08)
- Full Ukrainian tax-ID checksum algorithm (MVP: non-empty `inn` suitable as a file key)
- Deleting contacts from the catalog
- Syncing old session snapshots when a catalog contact is later edited

## Decisions

### 1. Shared step component, role prop
One client component `ContactsStep` with `role: "client" | "done-by"` used for steps 3 and 4. Same form fields and catalog APIs; only the session field written and Ukrainian labels differ.

**Why:** FR-08 and FR-09 share one schema; avoids duplicated UI. Alternative: two near-identical components — rejected as needless drift.

### 2. Catalog APIs per DESIGN.md
| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/api/contacts` | List contacts (array); optional `?q=` filters by `inn` / `full-name` substring for pick UI |
| `GET` | `/api/contacts/[inn]` | Single contact or 404 |
| `PUT` | `/api/contacts/[inn]` | Create or overwrite `{data-root}/contacts/{inn}.json`; body must include all FR-10 fields; URL `inn` MUST match body `inn` |

**Why:** Matches DESIGN §9; list enables “обрати існуючого” (TC-12) without scanning the FS from the client.

### 3. Save on «Далі»: catalog then session snapshot
On step 3/4 «Далі»:
1. Validate required fields (all FR-10 fields present; `inn` non-empty after trim)
2. `PUT /api/contacts/{inn}` with the form payload
3. `PATCH /api/docs/{guid}` with `{ client | done-by: ContactRef, "current-step": next }` (or PATCH snapshot then advance — same wait-for-success pattern as other steps)

Selecting an existing contact fills the form from catalog; confirm still PUTs (idempotent overwrite) and refreshes the session snapshot from the form values.

**Why:** Catalog is the reusable source; session holds a snapshot so later PDF does not drift (DESIGN §3.1). Alternative: snapshot-only without catalog write — rejected (FR-08 requires `./contacts/{РНОКПП}.json`).

### 4. Contact file shape (kebab-case)
```json
{
  "full-name": "…",
  "inn": "1234567890",
  "phone": "…",
  "acc": "…",
  "bank": "…",
  "mfo-bank": "…",
  "addr": "…"
}
```
Path: `path.join(getDataRoot(), "contacts", `${inn}.json`)`. Add `getContactsDir()` beside existing data-root helpers.

**Why:** FR-10 / NFR-13 / TC-11. Filename is the trimmed `inn` string; reject path separators / empty inn server-side.

### 5. РНОКПП validation (MVP)
Treat `inn` as required non-empty trimmed string without path-unsafe characters (`/`, `\`, `..`). Do not implement full ДРФО checksum in this change. Empty or whitespace-only `inn` → 400 on PUT and blocked «Далі» (TC-26).

**Why:** Requirements only mandate “without РНОКПП cannot save”; checksum can land later without API shape changes.

### 6. Required fields before Next
All seven FR-10 fields SHALL be non-empty (trimmed) to advance. DESIGN step table: “Усі обов’язкові поля, валідний РНОКПП”.

**Why:** Templates need complete party blocks; partial contacts would produce blank anchors later.

### 7. Module layout
`lib/contacts/`: types (re-export or alias `ContactRef`), store (`listContacts`, `getContact`, `putContact`), errors, unit tests. Route handlers call the store; UI does not touch FS.

**Why:** Mirrors `lib/document-numbering` and keeps data-root logic server-side.

### 8. Pre-fill from session
When re-entering step 3/4 (Назад / reload), prefer session snapshot for the role if present; otherwise empty form. Catalog list remains available to switch contact.

**Why:** NFR-04 / TC-21 — reload restores step and data without re-creating files.

## Risks / Trade-offs

- [Catalog edit after document saved] → Mitigation: session snapshot is authoritative for that document; catalog update does not rewrite old sessions
- [Same person as client and done-by] → Mitigation: allowed; two snapshots, one catalog file if same `inn`
- [Rename inn (change РНОКПП)] → Mitigation: PUT writes the new key; old file left as-is (no auto-delete in MVP); document as intentional
- [Large contact list] → Mitigation: simple in-memory filter on list; volume is small for local MVP
- [Partial failure: catalog OK, session PATCH fails] → Mitigation: show error, stay on step; catalog write is idempotent on retry (NFR-10)

## Migration Plan

- No migration of existing sessions; `client` / `done-by` remain optional until steps 3–4 confirm
- New `contacts/` directory created on first PUT
- Rollback: revert UI to stubs; unused contact files are harmless

## Open Questions

- None blocking. Optional live search debounce vs load-all-on-mount can follow list size; default load-all for MVP.
