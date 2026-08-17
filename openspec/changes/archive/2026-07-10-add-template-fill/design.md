## Context

Prior capabilities shipped: `locale-helpers`, `document-session`, `wizard-shell`, `document-type`, `document-numbering`, `contacts`, `services-catalog`. Session JSON already holds `client`, `done-by`, `services[]`, `invoice-number` / `act-number`, and `date`. Step 6 is still a stub. Fixed HTML templates live at repo `./templates/invoce.html` (BC-07 spelling) and `./templates/complete.html` with `data-prefilled="…"` anchors and a single `.service-row` prototype each.

Constraints: Ukrainian UI; no auth; reuse wizard chrome and session PATCH; pixel-faithful A4 HTML (NFR-07 for preview); kebab-case anchors except PRD `done_amount` (NFR-13); templates read from `./templates/` (NFR-12); same fill pipeline must later feed PDF (`pdf-export`).

## Goals / Non-Goals

**Goals:**
- Fill invoice and act templates from session snapshots (FR-13, FR-14)
- Compute `price-total` = Σ(`amount × price`) and `amount-cursive` from that total (TC-24, DESIGN §8.2)
- Step 6 read-only preview (iframe) for documents required by `doc-type`; no inline content editing
- Preview API returning filled HTML for reuse by `pdf-export`
- Update wizard-shell so step 6 is real; step 7 remains stub

**Non-Goals:**
- PDF generation / Playwright / download buttons (belongs to `pdf-export`, FR-15–FR-16)
- Renaming `invoce.html` (BC-07)
- Editing template files’ visual layout beyond fill/clone behavior
- Auth, ЕДО, legal guarantees (BC-02, BC-03, BC-08)
- Marking session `completed` (step 7 / pdf-export)

## Decisions

### 1. Fill by `data-prefilled` (+ FR class aliases)
Templates already mark slots with `data-prefilled="<anchor>"`. The engine SHALL set `textContent` on every matching element. Additionally fill elements whose CSS class equals a known FR anchor when present (e.g. `amount-cursive`, `done_amount`) so TC-15/TC-16 stay aligned with PRD names even if a slot uses class-only markup.

**Why:** Matches shipped templates without Mustache. DESIGN §6.1 said “CSS class anchors”; actual files use `data-prefilled` — treat that as the primary mechanism and classes as a secondary match. Alternative: rewrite templates to classes only — rejected (risks layout drift, BC-07 fidelity).

### 2. Template paths and filenames
| Logical type | File | Alias in code |
|--------------|------|---------------|
| Invoice | `templates/invoce.html` | `invoiceTemplatePath` |
| Act | `templates/complete.html` | `actTemplatePath` |

Resolve from `process.cwd()` / project root (not data-root). Do not rename `invoce.html`.

**Why:** NFR-12 + BC-07. Alternative: copy templates under data-root — rejected; PRD fixes `./templates/`.

### 3. Value map from session
Build a flat string map, then apply:

| Anchor / key | Source |
|--------------|--------|
| `client-*` / `done-by-*` | Contact snapshot fields (`full-name`, `inn`, `phone`, `acc`, `bank`, `mfo-bank`, `addr`) |
| `client-sign-name` / `done-by-sign-name` | Same party’s `full-name` (no separate sign field in MVP) |
| `doc-number` | `invoice-number` |
| `complete-doc-number` | `act-number` |
| `date` | `dateToNumeric(session.date)` |
| `date-cursive` | `dateToCursive(session.date)` |
| `data-cursive` | Alias → same as `date-cursive` (typo in act template) |
| `price-total` | Σ(`amount × price`) formatted for display |
| `amount-cursive` / `amount-total-cursive` | `amountToCursive(price-total)` |
| `service-cursive` | Join of line `service-name` values (e.g. `"; "`) |
| `service-name` | Per-row `service-name` |
| `price` / `amount-item` | Per-row unit `price` |
| `done_amount` / qty cell | Per-row model `amount` |
| Line sum (`service-sum`, act `amount-total` on row) | `amount × price` for that row |
| Document-level `amount-total` (act footer) | Same as `price-total` |

**Why:** Covers FR-13/FR-14 and real template keys. Map model `amount` → `done_amount` / qty (DESIGN §6.1). Alternative: change templates to match PRD names only — deferred; engine aliases are cheaper.

### 4. Multi-row services via clone
For each template, find `tr.service-row` (or first tbody data row). For `n` session services: clone the prototype `n` times, fill each clone, replace tbody contents. If `n === 0`, leave one empty row or clear cells (step 5 should already require ≥1 line before reaching step 6).

**Why:** Templates ship one prototype row. Alternative: string-replace a Mustache block — rejected (no Mustache in files).

### 5. Preview API
`GET /api/docs/[guid]/preview?type=invoice|act`

- Load session; 404 if missing
- `type=invoice` → fill `invoce.html`; `type=act` → fill `complete.html`
- Reject with 400 if `doc-type` does not include that document (`invoice` only → no act; `act` only → no invoice; `invoice_act` → both allowed)
- Response: `text/html; charset=utf-8` with filled document (or JSON `{ html }` — prefer raw HTML for iframe `src`)

**Why:** Server-side fill keeps FS and helpers off the client; same HTML later for PDF. Alternative: client-side fill — rejected (templates on server, NFR-12).

### 6. Step 6 UI
- Client component loads preview URL(s) in sandboxed iframe(s) (`sandbox` without `allow-scripts` if possible; templates are static HTML)
- Show invoice and/or act tabs or stacked panels per `doc-type` (TC-04/TC-05 behavior)
- No contenteditable / form fields inside the document
- «Далі» → `PATCH` `{ "current-step": 7 }` only (no extra session fields required)
- «Назад» → step 5 with data intact
- Wide: preview beside/above chrome per DESIGN; mobile: stacked

**Why:** FR-13/14 preview; DESIGN §5 step 6. Alternative: inject HTML via `dangerouslySetInnerHTML` — iframe preferred for A4 isolation and later print/PDF parity.

### 7. Module layout
`lib/template-fill/`: `fillInvoiceHtml(session)`, `fillActHtml(session)`, `computePriceTotal(services)`, shared DOM fill helper (use a server-safe HTML parser such as `linkedom` / `node-html-parser` — pick one already in deps or add a small parser; avoid full browser). Unit tests with fixture session covering TC-15, TC-16, TC-24. Route handler calls fill functions.

**Why:** Mirrors other `lib/*` stores; testable without Next request. Alternative: regex replace only — fragile for multi-row.

### 8. Number formatting
Display money/qty with Ukrainian-friendly decimals (e.g. two fraction digits, comma or dot consistently with templates’ `0,00` VAT line). Totals must equal exact Σ for TC-24 (compare numeric total in tests; display string derived from that number).

**Why:** Templates show `0,00` style; tests assert numeric equality of the underlying total.

## Risks / Trade-offs

- [Template `data-prefilled` typos / mismatches vs FR names] → Mitigation: explicit alias table in fill map; unit tests assert FR anchors when present
- [Invoice qty hardcoded without `data-prefilled`] → Mitigation: when cloning rows, set `.service-qty` / `done_amount` text from line `amount`
- [Invoice `service-sum` marked `price` in template] → Mitigation: on row fill, set sum cell to `amount × price` regardless of attribute name on that cell
- [Parser dependency weight] → Mitigation: prefer lightweight HTML parser; document choice in tasks
- [Iframe sizing / A4 scale] → Mitigation: CSS scale or scroll; visual polish OK if content is correct
- [Missing client/done-by on malformed session] → Mitigation: fill empty strings; step validation upstream should prevent this

## Migration Plan

- No session schema change
- Rollback: revert step 6 UI to stub; unused preview route is harmless
- Templates unchanged on disk except if a critical missing `data-prefilled` blocks TC — prefer engine workarounds first

## Open Questions

- None blocking. Exact money format (comma vs dot) can follow template literals during implementation.
