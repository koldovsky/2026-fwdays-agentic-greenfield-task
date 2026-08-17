## Why

Wizard steps 3–4 are still stubs: users cannot pick or create customer/contractor contacts. Without contacts, later template-fill and PDF steps have no `client-*` / `done-by-*` data, and FR-08–FR-10 / TC-11–TC-13 / TC-26 remain unmet.

## What Changes

- Replace step 3 (замовник) and step 4 (виконавець) stubs with real contact select-or-create UI (FR-08, FR-09)
- Persist contacts under `{data-root}/contacts/{РНОКПП}.json` with fields `full-name`, `inn`, `phone`, `acc`, `bank`, `mfo-bank`, `addr` (FR-10, NFR-05, BC-05)
- Write a full contact snapshot onto the session (`client` / `done-by`) so later PDF stays stable if the catalog entry changes (DESIGN.md)
- Block save without РНОКПП; surface persistence errors to the user (TC-26, NFR-10)
- Keep wizard chrome unchanged; only steps 3–4 bodies become real UI; steps 5–7 remain stubs

## Capabilities

### New Capabilities
- `contacts`: Steps 3–4 — customer/contractor select-or-create, catalog by РНОКПП, session snapshots

### Modified Capabilities
- `wizard-shell`: Steps 3–4 content are no longer stubs; shell still hosts steps 5–7 as stubs until their capabilities land

## Impact

- UI: shared contact step component wired into `WizardShell` for steps 3 and 4 (search/select + create/edit form)
- New module: contacts catalog read/write under data root; session PATCH for `client` / `done-by` snapshots
- APIs: `GET/PUT /api/contacts/[inn]` (and likely list/search); session fields already modeled in DESIGN.md
- Depends on: `wizard-shell` (and existing `document-session` persistence)
- Unlocks: `template-fill` (needs contact snapshots); `services-catalog` can proceed in parallel
- Non-goals: auth, ЕДО, legal guarantees (BC-02, BC-03, BC-08); template preview/PDF; services step; tax-ID checksum beyond non-empty РНОКПП for MVP unless already specified
