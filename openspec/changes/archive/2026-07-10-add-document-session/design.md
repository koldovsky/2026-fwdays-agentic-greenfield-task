## Context

Capability `document-session` is phase 2 of the MVP. The repo already has a Next.js App Router + TypeScript scaffold and archived `locale-helpers`. The home page is still the create-next-app stub. DESIGN.md defines the session model (`DocumentSession`), routes (`/` → create + redirect, `/docs/[guid]`), FS layout under a data-root (`docs/{guid}.json`), and API sketch (`POST/GET/PATCH /api/docs`). This change must ship the persistence + resume contract so `wizard-shell` and later steps can patch the same JSON.

## Goals / Non-Goals

**Goals:**

- Unique `guid` (UUID v4) per new session; file at `{dataRoot}/docs/{guid}.json`
- `/` creates a session and redirects to `/docs/{guid}` (TC-01)
- `/docs/[guid]` restores state: unfinished → `currentStep` (last incomplete); completed → final-review placeholder (TC-02, TC-03)
- Reload does not mint a new `guid` or mutate numbers/fields without an explicit write (NFR-04, TC-21)
- Create / read / patch session via server layer; mutations persist immediately
- Export/download of session JSON (FR-19)
- Clear error for missing/invalid `guid` without writing a broken file (TC-25)
- User-visible error on save failure (NFR-10 for sessions)
- Relative data-root paths (NFR-12); kebab-case JSON keys (NFR-13)

**Non-Goals:**

- Wizard progress UI, Back/Next chrome (`wizard-shell`)
- Step forms: type, numbering, contacts, services, templates, PDF
- Copy-from-guid (FR-04 → `document-type`)
- Auth, multi-user, cloud DB, ЕДО (BC-02, BC-03, BC-08, NFR-11)
- Atomic numbering locks (needed later in `document-numbering`)

## Decisions

### 1. Data-root location

- **Choice:** Configurable root via env `DATA_ROOT` (absolute or relative to `process.cwd()`), defaulting to `./data` so session files live at `./data/docs/{guid}.json`. Ensure `docs/` is created on first write.
- **Rationale:** Keeps generated JSON out of the Next.js `app/` tree and git-friendly to ignore; still relative/portable (NFR-12). PRD’s `./docs/` means “under the app data root,” not necessarily repo root.
- **Alternatives:** Repo-root `./docs/` — rejected (collides with product `docs/` markdown). `process.cwd()/docs` without env — acceptable fallback if env is unset and we document it; prefer `./data` + ignore.

### 2. Session model and initial file

- **Choice:** Persist DESIGN.md `DocumentSession` shape in kebab-case JSON. On create:

```json
{
  "guid": "<uuid-v4>",
  "doc-type": "invoice_act",
  "current-step": 1,
  "completed": false,
  "date": "<ISO date YYYY-MM-DD today>",
  "services": [],
  "updated-at": "<ISO datetime>"
}
```

- **TS types:** Prefer quoted kebab-case keys (or a thin mapper) so on-disk JSON matches NFR-13 without a second schema.
- **Note:** DESIGN.md uses camelCase in the TypeScript sketch (`docType`, `currentStep`); on disk and in API JSON use kebab-case (`doc-type`, `current-step`, `done-by`, `updated-at`). Document the mapping once in `lib/document-session` types.
- **Rationale:** Matches PRD/DESIGN; later steps only PATCH fields; default type unlocks happy-path without waiting on `document-type` UI.
- **Alternatives:** Minimal `{ guid, current-step, completed }` only — rejected; full schema avoids migrations when steps land.

### 3. Resume rules

- **Choice:**
  - If file missing or `guid` not a valid UUID → 404-style page / error response; **do not** create a file (TC-25).
  - If `completed === true` → render final-review placeholder (step 7 semantics); no auto-reset.
  - If `completed === false` → render/resume at `current-step` (TC-02, TC-21). “Last incomplete step” for this change equals stored `current-step`; richer “first empty field” logic can refine later when step validation exists.
- **Rationale:** Session owns the step cursor; wizard-shell will update `current-step` on navigation.
- **Alternatives:** Derive step only from filled fields — deferred until step capabilities exist.

### 4. API surface vs Server Actions

- **Choice:** Route Handlers under `app/api/docs/`:
  - `POST /api/docs` — create, return `{ guid }` (and optionally full session)
  - `GET /api/docs/[guid]` — return session JSON
  - `PATCH /api/docs/[guid]` — merge allowed fields, bump `updated-at`, write file; on FS error return 5xx with message (NFR-10)
  - `GET /api/docs/[guid]/export` (or same GET with `Accept` / `?download=1`) — attachment download of the JSON file (FR-19)
- **Pages:** `/` server-side creates (or calls create helper) then `redirect(/docs/{guid})`. `/docs/[guid]` server component loads session and shows stub UI + export control.
- **Rationale:** Aligns with DESIGN.md §9; easy to test with fetch; shared `lib/document-session` used by both pages and API.
- **Alternatives:** Server Actions only — fine for forms later; keep Route Handlers for explicit REST contract used by future client patches.

### 5. Filesystem module

- **Choice:** `lib/document-session/` (or `lib/document-session.ts`) with:
  - `createSession()`, `readSession(guid)`, `updateSession(guid, patch)`, `sessionPath(guid)`, `getDataRoot()`
  - Sync or async `fs/promises`; write via temp file + rename for basic atomicity of a single session file
  - Validate UUID before any path join (path traversal guard)
- **Rationale:** Pure FS layer testable with Vitest + temp dirs; pages/API stay thin.
- **Alternatives:** Inline FS in route handlers — rejected (harder to reuse and test).

### 6. Stub UI on `/docs/[guid]`

- **Choice:** Minimal page: show `guid`, `current-step`, `completed`, and a “Download JSON” action. Optional tiny controls to PATCH `current-step` / `completed` for manual TC verification until wizard-shell exists.
- **Rationale:** Proves restore/idempotency without building the full wizard.
- **Alternatives:** Blank page with only redirect logic — weaker for TC demos.

### 7. Testing

- **Choice:** Vitest (already in repo) for FS helpers: create → file exists; read round-trip; invalid guid throws/returns not-found without write; patch updates `updated-at`; export bytes match file.
- Manual or lightweight route checks for redirect and 404 page as needed.
- **Rationale:** Locks TC-01/21/25 at the store layer; UI TCs fully land with wizard-shell.

## Risks / Trade-offs

- [Data-root vs PRD path wording `./docs/`] → Document that `docs/` is under `DATA_ROOT` (default `./data`); add `.gitignore` for `data/docs/*.json`.
- [Concurrent PATCH races on same guid] → Last-write-wins for MVP; acceptable for single-user local use (NFR-11).
- [UUID validation too strict / too loose] → Use standard UUID v4 string check; reject `..`, slashes, empty.
- [Stub UI confuses with final product] → Keep copy minimal; replace when wizard-shell lands.
- [Kebab-case in TS is awkward] → Centralize type + parse/serialize helpers once.

## Migration Plan

1. Add data-root helper + gitignore; implement session store + tests.
2. Wire `POST/GET/PATCH` (+ export) and replace `/` + add `/docs/[guid]`.
3. Verify TC-01–TC-03, TC-21, TC-25 manually against running `next dev`.
4. No production migration; local JSON only. Rollback = revert routes/module; leftover files in `data/docs/` are harmless.

## Open Questions

- None blocking. If prefer repo-root `./docs` over `./data/docs`, decide at apply time and update gitignore accordingly — default remains `./data`.
