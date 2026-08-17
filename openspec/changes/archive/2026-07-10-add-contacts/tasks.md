## 1. Contacts store

- [x] 1.1 Add `lib/contacts`: reuse `ContactRef` fields; `getContactsDir()`; `listContacts`, `getContact`, `putContact` under `{data-root}/contacts/{inn}.json`
- [x] 1.2 Validate non-empty trimmed `inn` (no path-unsafe chars) and all FR-10 fields on put; overwrite same file for same `inn` (NFR-05)
- [x] 1.3 Unit tests: create writes file with all fields (TC-11); update same `inn` overwrites; empty `inn` rejected (TC-26); list returns saved contacts

## 2. Contacts API

- [x] 2.1 Add `GET /api/contacts` (optional `?q=` filter) and `GET/PUT /api/contacts/[inn]` calling the store
- [x] 2.2 Map validation / not-found / persistence errors to clear 4xx/5xx; never claim success on failed write (NFR-10)

## 3. Steps 3–4 UI

- [x] 3.1 Create shared `ContactsStep` client component (`role: "client" | "done-by"`): catalog pick + form for all FR-10 fields; Ukrainian labels; pre-fill from session snapshot when present
- [x] 3.2 On «Далі»: validate fields → `PUT` contact → `PATCH` session snapshot + advance `current-step`; block on empty `inn` or any failed save
- [x] 3.3 Wire into `WizardShell`: render contacts UI on steps 3 and 4; keep stubs for steps 5–7

## 4. Verification & handoff

- [x] 4.1 Verify TC-11–TC-13, TC-26, plus reload/Back restores snapshots without new `guid`
- [x] 4.2 Update `docs/current-state.md` with contacts status and next capability (`services-catalog`)
