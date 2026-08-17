## Context

`document-session`, `wizard-shell`, and `document-type` are shipped. Sessions already carry `date` (ISO, default today), optional `invoice-number` / `act-number`, and `doc-type`. Step 2 is still a stub. This change implements date editing and number issuance so later template/PDF steps have stable identifiers.

Constraints: data under configurable data root (NFR-12); kebab-case JSON keys (NFR-13); Ukrainian UI; no auth; reuse wizard chrome and session PATCH patterns from prior steps.

## Goals / Non-Goals

**Goals:**
- Step 2 UI: editable date (default today), show issued numbers as read-only after assignment (FR-05, FR-06, BC-06)
- Issue invoice `Р-{7 digits}` and/or act `{N}` based on `doc-type` (`invoice` → invoice only; `act` → act only; `invoice_act` → both)
- Persist counters in `{data-root}/{year}/doc_number.json`; independent files per year (FR-07, NFR-06)
- Do not re-issue numbers already present on the session (NFR-04)
- Update wizard-shell so step 2 is real content; steps 3–7 remain stubs

**Non-Goals:**
- Template fill / PDF / contacts / services
- Changing wizard step count by type (still 1–7 chrome)
- Auth, ЕДО, legal guarantees (BC-02, BC-03, BC-08)
- Manual override / custom number entry by the user
- Reclaiming or renumbering after date-year changes once numbers exist

## Decisions

### 1. Issue numbers on step-2 confirm («Далі»), not on first paint
Follow DESIGN §8.1: when the user confirms step 2, persist `date`, then for each number required by `doc-type` that is missing on the session, increment the year counter and write the formatted value onto the session.

**Why:** Year is taken from the confirmed date; issuing before the user finishes editing the date risks consuming the wrong year’s counter. Numbers appear read-only after issue (visible immediately after success and on later visits / «Назад»).

**Alternative:** Eager issue on entering step 2 — rejected (date may still change to another year).

### 2. Dedicated issue API + existing step PATCH
Add `POST /api/docs/[guid]/issue-numbers` with body `{ "date": "YYYY-MM-DD" }` that:
1. Validates guid + date
2. Sets session `date`
3. Reads/inits `{data-root}/{year}/doc_number.json` for `year` of that date
4. If `doc-type` needs invoice and `invoice-number` is absent → `last-invoice-seq += 1`, set `invoice-number` to `Р-` + 7-digit pad
5. If `doc-type` needs act and `act-number` is absent → `last-act-seq += 1`, set `act-number` to decimal string
6. Writes counter file and session atomically enough for local MVP (see decision 4)
7. Returns updated session JSON

Wizard «Далі» on step 2: call issue-numbers, then PATCH `current-step` to 3 (same wait-for-success pattern as other steps). Date-only edits before confirm may PATCH `{ date }` without issuing, or only send date on confirm — **Decision:** persist date on change via PATCH for reload safety; issue-numbers still runs on «Далі» and is idempotent for already-assigned numbers.

**Why:** Keeps counter mutation off the generic PATCH path; one place owns NFR-06 invariants.

### 3. Counter file shape (kebab-case)
```json
{
  "year": 2026,
  "last-invoice-seq": 0,
  "last-act-seq": 0
}
```
Missing file → init with zeros, then increment as needed. Path: `path.join(getDataRoot(), String(year), "doc_number.json")`.

**Why:** Matches NFR-13; DESIGN’s camelCase maps 1:1. Prefix `Р-` and 7-digit pad are fixed (BC-06).

### 4. Atomicity for local MVP
Use write-temp-then-rename for `doc_number.json`, and serialize issue operations per year with an in-process mutex (or lockfile) so concurrent requests in one Node process do not lose increments (NFR-06). Cross-process locking is best-effort for MVP (single local server assumed).

**Why:** DESIGN calls out race risk; full distributed locking is out of scope.

### 5. Which numbers `doc-type` needs
| `doc-type` | Invoice | Act |
|------------|---------|-----|
| `invoice_act` | yes | yes |
| `invoice` | yes | no |
| `act` | no | yes |

Do not clear an existing number if type later no longer needs it; do issue a missing required number on next confirm. Changing type on step 1 after numbers exist is rare; copy-from already clears numbers (BC-11).

### 6. Step 2 UI
Client `DocumentNumberingStep`: date input (ISO `YYYY-MM-DD` in session; display per UI norms), labels for invoice/act numbers when present (or short hint that numbers are assigned on «Далі»). «Далі» blocked until date is valid. Save/issue failures surface to the user (NFR-10).

### 7. Idempotency
Reload / «Назад» / second «Далі» MUST NOT increment counters when `invoice-number` / `act-number` already set for the needed kinds (NFR-04). Changing `date` after issue updates the date only; does not re-issue or move counters.

## Risks / Trade-offs

- [User changes date to another year before first issue] → Mitigation: year is taken at issue time from confirmed date (TC-10)
- [User changes date year after numbers already issued] → Mitigation: keep existing numbers (NFR-04); document as intentional
- [Concurrent issue for same year] → Mitigation: in-process mutex + atomic file replace
- [Numbers not visible until after first confirm] → Mitigation: acceptable per DESIGN; show clear copy that assignment happens on continue; after Назад, numbers are visible
- [Orphan number if doc-type changes] → Mitigation: ignore unused fields in later fill; optional cleanup deferred

## Migration Plan

- No migration of existing sessions; `date` already set; numbers remain optional until step 2 confirm
- New `{year}/` directories created on first issue for that year
- Rollback: revert UI to stub; unused counter files are harmless

## Open Questions

- None blocking. Display format for date in the UI (native `type="date"` vs text `DD.MM.YYYY`) can follow existing DESIGN tokens; session storage stays ISO.
