## 1. DB and config (design D2/D3)

- [x] 1.1 Prisma schema: `Attachment` model (ticket FK cascade, `fileName`, unique `storedName`, `mimeType`, `size`, `createdAt`, `@@index([ticketId])`) + `ATTACHMENT` value in `TicketEventField`; generate the migration (design D2/D5)
- [x] 1.2 `attachments-config.ts` per the `auth-config.ts` idiom: `ATTACHMENTS_DIR` env — required fail-fast in production, dev default `.data/attachments` (git-ignore it), directory created at bootstrap (design D3, NFR-STOR-01)

## 2. API — attachments module (design D1/D3–D6)

- [x] 2.1 Upload `POST /tickets/:id/attachments`: multer memory storage with 10 MB limit, ticket ownership check (404-parity), validation — declared MIME ∈ JPEG/PNG/WebP **and** magic bytes match, count < 10; errors `ATTACHMENT_TYPE_INVALID` / `ATTACHMENT_TOO_LARGE` / `ATTACHMENT_LIMIT_REACHED` / `ATTACHMENT_FILE_REQUIRED` in the `{ code, message }` contract (design D4, FR-ATTACH-01, Р-13)
- [x] 2.2 Persistence: write file as `randomUUID().<ext>` in `ATTACHMENTS_DIR`, then DB row + `ATTACHMENT` feed event (`newValue = fileName`) in one transaction, unlink on failure (design D3/D5, FR-FEED-02)
- [x] 2.3 `GET /tickets/:id/attachments` metadata list (`{ id, fileName, mimeType, size, createdAt }` — stored name never leaves the API) and `GET /tickets/:id/attachments/:attachmentId` streamed binary: `Content-Type` from DB, RFC 5987 inline filename, `Cache-Control: private, max-age=3600`; missing row / foreign ticket / missing disk file → same `ATTACHMENT_NOT_FOUND` 404, disk mismatch logged (design D1/D6, FR-ATTACH-03)
- [x] 2.4 `DELETE /tickets/:id/attachments/:attachmentId`: remove DB row + `ATTACHMENT` feed event (`oldValue = fileName`) in one transaction, then unlink the file; 404-parity (design D1/D5, FR-ATTACH-02)
- [x] 2.5 API unit tests: magic-bytes truth table (JPEG/PNG/WebP/spoofed/PDF/HEIC), size and count limits, upload/delete feed events, 404-parity (foreign ticket, foreign attachment, missing disk file), config fail-fast (prod without `ATTACHMENTS_DIR`)

## 3. Web — card attachments section (read /web-conventions first; design D7)

- [x] 3.1 Facade/API layer: `Attachment` model, `list/upload/delete` in the tickets API service, facade state (attachments, loading/error, upload progress flag); Ukrainian copy for the new error codes
- [x] 3.2 Presentational attachments component in the ticket card: thumbnail grid (`<img loading="lazy">` on the binary URL), upload button with `accept="image/jpeg,image/png,image/webp" multiple` + client-side pre-checks, sequential upload, delete with confirm dialog (reuse houses confirm-dialog) — mobile-first
- [x] 3.3 Full-size view: Material dialog rendering the binary URL from the tapped thumbnail
- [x] 3.4 Feed rendering: Ukrainian sentences for `ATTACHMENT` events («Додано фото …» / «Видалено фото …»)
- [x] 3.5 Web unit tests: facade list/upload/delete flows and error mapping, attachments component (grid, rejected-upload message, confirm-delete), feed event rendering

## 4. E2E and closing the slice

- [x] 4.1 api-e2e: upload happy path + feed event, PDF/HEIC/oversize/11th rejections, metadata list, binary round-trip, delete + feed event, foreign-user 404-parity on all four endpoints
- [x] 4.2 Playwright (web-e2e) from the S-07 acceptance scenarios: add a photo → thumbnail + full size + feed event; rejected file shows an understandable error; delete removes the thumbnail after confirm
- [x] 4.3 All checkboxes above `[x]`, then `npm run verify` passes
- [x] 4.4 Smoke test on real MySQL + disk: upload/view/delete against the running API, check DB↔disk invariants, restart the API and confirm files still serve (NFR-STOR-01)
- [x] 4.5 Adversarial review by `slice-reviewer` (ADR-0010): freeze range at an explicit end SHA, no commits until the verdict; fix critical/high + re-verify, log medium/low dispositions
- [x] 4.6 Launch-and-look: walk the S-07 happy path by eye (mobile viewport), note the fact in current-state
- [x] 4.7 Prod wiring: mount the Railway Volume, set `ATTACHMENTS_DIR` via `railway variables --set`, deploy and re-check a photo survives a redeploy (design Migration Plan)
- [x] 4.8 Archive: `npx openspec validate ticket-attachments --strict` → `/opsx:archive` → `npx openspec list` empty → `npx prettier --write openspec/specs/**/*.md`
- [x] 4.9 Update `docs/current-state.md` and `docs/traceability-matrix.md` (FR-ATTACH-01…03, NFR-STOR-01 → spec → tests → demo check)
- [x] 4.10 Session retro via `/slice-retro` → `docs/cycles/S-07.md`
