## 1. Data root and session types

- [x] 1.1 Add `DATA_ROOT` helper (default `./data`) and ensure `{data-root}/docs/` can be created on write
- [x] 1.2 Define `DocumentSession` TypeScript types with kebab-case JSON keys (`guid`, `doc-type`, `current-step`, `completed`, `date`, `services`, `updated-at`, optional fields from DESIGN.md)
- [x] 1.3 Gitignore generated session files under the data-root (e.g. `data/docs/*.json`)

## 2. Session store library

- [x] 2.1 Implement UUID validation and safe path join (reject malformed / traversal `guid`s)
- [x] 2.2 Implement `createSession()` — UUID v4, defaults (`doc-type: invoice_act`, `current-step: 1`, `completed: false`, today `date`, empty `services`), atomic write to `{data-root}/docs/{guid}.json`
- [x] 2.3 Implement `readSession(guid)` — return session or not-found; never create a file on miss
- [x] 2.4 Implement `updateSession(guid, patch)` — merge allowed fields, bump `updated-at`, persist; surface FS errors
- [x] 2.5 Add Vitest coverage for create/read/patch, invalid guid, missing file, and no file created on not-found

## 3. API routes

- [x] 3.1 `POST /api/docs` — create session, return `{ guid }` (and/or full session)
- [x] 3.2 `GET /api/docs/[guid]` — return session JSON or clear 404
- [x] 3.3 `PATCH /api/docs/[guid]` — apply patch, persist; return 5xx with message on save failure (NFR-10)
- [x] 3.4 `GET /api/docs/[guid]/export` — serve session JSON as attachment (FR-19)

## 4. App routes and stub UI

- [x] 4.1 Replace `/` to create a session and `redirect` to `/docs/{guid}` (TC-01)
- [x] 4.2 Add `/docs/[guid]` page: load session; unfinished → show `current-step`; completed → final-review placeholder (TC-02, TC-03)
- [x] 4.3 Invalid/missing `guid` → clear error UI, no new file (TC-25)
- [x] 4.4 Add Download JSON control; optional stub controls to PATCH `current-step` / `completed` for manual TC-21 checks

## 5. Verification

- [x] 5.1 Run unit tests (`npm test`) and confirm store scenarios pass
- [x] 5.2 Manually verify TC-01–TC-03, TC-21, TC-25 against `next dev`
- [x] 5.3 Update `docs/current-state.md` with session paths and next focus (`wizard-shell`)
