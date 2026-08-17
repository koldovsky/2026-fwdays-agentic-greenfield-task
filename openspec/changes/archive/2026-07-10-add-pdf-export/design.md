## Context

`template-fill` is shipped: filled HTML via `lib/template-fill` and `GET /api/docs/[guid]/preview?type=invoice|act`; wizard step 6 shows sandboxed iframes. Step 7 and completed-session final review are still placeholders (“PDF та Редагувати з’являться…”). DESIGN.md §6.3 already specifies server HTML→PDF (Playwright/Puppeteer) and `GET /api/docs/[guid]/pdf?type=invoice|act`.

Constraints: same filled HTML as preview (NFR-07); no inline edit on final view (BC-12); Ukrainian UI; no auth; reuse session PATCH; local FS MVP (not serverless-optimized).

## Goals / Non-Goals

**Goals:**
- Read-only step 7 / final review with PDF download per document in `doc-type` (FR-15, TC-17)
- PDF rendered from the same fill pipeline as preview (NFR-07)
- «Назад» / «Редагувати» return into the wizard with data preserved (TC-18, TC-19, FR-16)
- Mark session `completed` when the user reaches the final step so reload shows final review (TC-03)
- Update `wizard-shell` so step 7 is real (no stubs left)

**Non-Goals:**
- Auth, ЕДО, legal guarantees (BC-02, BC-03, BC-08)
- Inline HTML editing on step 7 (BC-12)
- Changing template layout or renaming `invoce.html` (BC-07)
- Client-side PDF libraries / print-to-PDF only UX
- Pixel-diff CI for PDF vs HTML (manual/visual check for MVP)

## Decisions

### 1. Playwright Chromium for HTML→PDF
Use Playwright (`playwright`) with Chromium: `page.setContent(filledHtml)` → `page.pdf({ format: 'A4', printBackground: true })`.

**Why:** DESIGN §6.3; Chromium print CSS matches A4 templates better than pure JS PDF builders. Alternative: Puppeteer — equivalent; Playwright chosen for clearer API and active maintenance. Alternative: `html-pdf` / wkhtmltopdf — rejected (weaker CSS, extra native deps).

### 2. Reuse `template-fill` fill functions
PDF route MUST call the same `fillInvoiceHtml` / `fillActHtml` (or shared helper used by preview) then render. Do not reimplement anchors.

**Why:** NFR-07 / DESIGN risk “розбіжність preview і PDF”. Alternative: fetch preview URL internally — works but couples HTTP; prefer direct lib call in the route.

### 3. PDF API
`GET /api/docs/[guid]/pdf?type=invoice|act`

- Load session; 404 if missing
- Reject 400 if `type` not allowed by `doc-type` (same rules as preview)
- Response: `application/pdf` with `Content-Disposition: attachment; filename="…"` (e.g. invoice number / act number in the name)
- Fill failures / browser failures → clear 5xx (NFR-10)

**Why:** Matches DESIGN §6.3 / §9 API table.

### 4. Browser lifecycle
Lazy-launch Chromium on first PDF request; reuse one browser instance in-process (module-level promise). Close pages after each render. Document `npx playwright install chromium` for local/CI.

**Why:** Per-request launch is slow; singleton is fine for single-node MVP. Alternative: always launch/close — simpler but slower. Alternative: `@sparticuz/chromium` — deferred (serverless not in scope).

### 5. Completion and Edit / Back
| Action | Session update |
|--------|----------------|
| «Далі» on step 6 | `current-step: 7`, `completed: true` |
| «Назад» on final view | `completed: false`, `current-step: 6` (data unchanged) |
| «Редагувати» | `completed: false`, `current-step: 6` (user can «Назад» further) |

Final review (completed or step 7) shows the same pdf-export UI: read-only previews (reuse preview iframes), PDF download button(s) by `doc-type`, «Редагувати», and «Назад» (TC-18) with the same effect as Edit→step 6 when already completed. Unfinished chrome «Далі» remains disabled on step 7.

**Why:** Satisfies TC-03 (completed → final review), TC-18 (Back → 6), TC-19 (Edit → flow). Alternative: keep `completed: false` until first PDF download — rejected (reload before download would not hit TC-03). Alternative: Edit → step 1 — rejected; step 6 is the last content step and matches “відповідний крок”.

### 6. Step 7 / final-review UI
Client component (e.g. `PdfExportStep`):
- Sandboxed iframe previews via existing preview URLs (same as step 6)
- Per-document «Завантажити PDF» linking to `/api/docs/{guid}/pdf?type=…`
- No contenteditable / form fields inside document HTML (BC-12)
- Wider layout like step 6 (`max-w-6xl`) when showing previews

Wire in `WizardShell` for `displayStep === 7` (both unfinished step 7 and `completed`).

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Playwright browser not installed in env | Document install step; fail with clear error if Chromium missing |
| Preview vs PDF drift | Shared fill functions only; same HTML string into Chromium |
| Slow first PDF (browser cold start) | Reuse browser; acceptable for MVP local use |
| Large HTML / memory | One page at a time; close page after PDF |
| Completed + Back semantics confuse shell | Single final-view component; Back/Edit both clear `completed` and set step 6 |

## Migration Plan

1. Add Playwright dependency + install Chromium in README / current-state notes
2. Ship PDF lib + API, then UI
3. No data migration: existing sessions gain PDF when opened on step 7 / completed
4. Rollback: remove route/UI; sessions remain valid JSON

## Open Questions

None blocking — Playwright vs Puppeteer decided (Playwright); Edit target step decided (6).
