# Tasks: house-directory (S-03)

## 1. Data layer

- [x] 1.1 Add `House` model to `api/prisma/schema.prisma` per design D1 (BigInt id, `user_id` FK cascade, `name` VarChar(255), `note` VarChar(1000) nullable, timestamps, `@@index([userId])`, `@@map("house")`)
- [x] 1.2 Create the Prisma migration (`house` table) and regenerate the client; migration applies cleanly on the local MySQL

## 2. API — houses CRUD with owner isolation

- [x] 2.1 Scaffold `api/src/app/houses/` module (controller, service, DTOs) wired into `AppModule`; no `@Public()` — endpoints stay behind the global `SessionGuard`
- [x] 2.2 DTO validation: `name` required, trimmed, non-empty, ≤255; `note` optional, ≤1000 — 400-style errors with machine-readable codes (`HouseError`, locale-free API per the S-02 contract; the SPA maps codes to Ukrainian)
- [x] 2.3 Implement `GET /api/houses` (owner's list, `createdAt DESC`) and `POST /api/houses`; ids serialized via `Number(id)` as in `auth.controller.ts`
- [x] 2.4 Implement `GET/PATCH/DELETE /api/houses/:id` with the single-query owner check (`id AND user_id`, design D2): zero rows → `HOUSE_NOT_FOUND` (404) with an identical body for missing and foreign objects (FR-ACCESS-01, NFR-SEC-03)
- [x] 2.5 API unit tests: service owner-scoping, validation, 404-style equality of missing vs foreign (Prisma mocked)

## 3. Web — houses screen (ADR-0009, /web-conventions)

- [x] 3.1 Scaffold `web/src/app/features/houses/` per design D4 (layout per /web-conventions: `data/` for facade+api+model): lazy `houses.routes.ts` under `authGuard`, `houses-api.ts` (HttpClient), `houses-facade.ts` (signals: houses/loaded/loading/pending/error + CRUD with reload-after-mutation)
- [x] 3.2 Houses page (container): list of house cards, empty state in Ukrainian with a clear create action, load-error state with retry
- [x] 3.3 Create/edit form (presentational, Material dialog): name/address required + note; API validation errors shown as Ukrainian messages; styles use `var(--mat-sys-*)` tokens only (В-04)
- [x] 3.4 Delete with confirm step (Material dialog); refusal/API errors surfaced via snackbar in Ukrainian
- [x] 3.5 Add «Будинки» navigation entry on the home screen and register the `/houses` route in `app.routes.ts`
- [x] 3.6 Web unit tests: houses facade (load/create/update/delete, error state)

## 4. /login redirect for authenticated users

- [x] 4.1 Add `guestGuard` in `web/src/app/core/` (design D5): authenticated user on `/login` → `router.parseUrl('/')`; attach to the auth routes
- [x] 4.2 Web unit tests: `guestGuard` redirects when authenticated, passes when anonymous

## 5. Slice-level verification (DoD order)

- [x] 5.1 All task checkboxes above are `[x]`
- [x] 5.2 `npm run verify` passes (format, lint, typecheck, design:check, fallow audit, openspec validate, tests, build) — runs as the pre-commit hook on every slice commit
- [x] 5.3 Smoke test on the real local MySQL: create/edit/delete a house via the running API, verify owner isolation with two users and the 404-style parity invariant — passed 2026-07-08 (trim, owner row in DB, 3×404 parity, 401 anonymous, delete cleans up)
- [x] 5.4 api-e2e suite: CRUD happy path, 401 without cookie, two-user isolation (GET/PATCH/DELETE of a foreign house → 404 identical to nonexistent) — 24 tests green (17 S-01/S-02 + 7 new)
- [x] 5.5 Playwright e2e (web-e2e): directory happy path (login → create «Шевченка 12» → edit note → delete, empty state) and authenticated `/login` → home redirect — green on chromium/firefox/webkit; S-02 suite re-run green (routing touched)
- [x] 5.6 Adversarial review by `slice-reviewer` (ADR-0010): range frozen at `9b9da69..9d6efde`, verdict **APPROVE** — 1 medium (dialog whitespace-name validation, fixed + e2e), 2 low (apostrophe copy — fixed; update-vs-delete race 404 — accepted, disposition for the retro)
- [x] 5.7 Launch-and-look: passed 2026-07-08 (login → home nav → houses: empty state → create → edit prefill → live update → delete with confirm → /login redirect). Found & fixed: Material Icons font was never linked (first mat-icon use in the project) — added to index.html
- [x] 5.8 Archive the change (`/opsx:archive`), confirm `npx openspec list` is empty, then `npx prettier --write openspec/specs/**/*.md` — specs synced (new `house-directory`, otp-auth login-redirect delta), validate --all --strict green
- [x] 5.9 Update `docs/current-state.md` (phase/done/next/blockers) and `docs/traceability-matrix.md` (FR-HOUSE-01/02, FR-ACCESS-01, NFR-SEC-03 → spec → test → demo check; FR-HOUSE-02 refusal test marked "S-04") — matrix v1.3
- [x] 5.10 Session retrospective via `/slice-retro` → `docs/cycles/S-03.md` — runs immediately after the archive commit (S-02 precedent)
