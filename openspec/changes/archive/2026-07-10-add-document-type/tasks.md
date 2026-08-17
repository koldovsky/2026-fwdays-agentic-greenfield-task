## 1. Session copy helper

- [x] 1.1 Add `copySessionFields(targetGuid, sourceGuid)` in `lib/document-session` — merge `doc-type`, `date`, `client`, `done-by`, `services`; clear `invoice-number` / `act-number`; set `copied-from`; keep target `guid`, `current-step`, `completed`
- [x] 1.2 Validate `doc-type` on PATCH in `updateSession` (reject unknown values)
- [x] 1.3 Unit tests: successful copy omits numbers; missing/invalid source throws without mutating target; default type remains `invoice_act`

## 2. Copy API

- [x] 2.1 Add `POST /api/docs/[guid]/copy` accepting `{ "source-guid": string }`, calling the store helper, returning updated session JSON
- [x] 2.2 Map invalid/missing source to clear 4xx error body (same tone as session-not-found)

## 3. Step 1 UI

- [x] 3.1 Create `DocumentTypeStep` client component: radios for `invoice_act` / `invoice` / `act` with Ukrainian labels; controlled from session `doc-type`
- [x] 3.2 Persist `doc-type` via `PATCH /api/docs/[guid]` on change; show save errors without claiming success (NFR-10)
- [x] 3.3 Add copy-from-guid field + action; call copy API; on success refresh session UI; on failure show error and leave prior data intact
- [x] 3.4 Wire step into `WizardShell`: render `DocumentTypeStep` on step 1; keep stubs for steps 2–7; pass initial session fields needed by the form

## 4. Verification & handoff

- [x] 4.1 Manual/automated checks for TC-04–TC-06 (type persistence + copy without numbers) and reload keeps `doc-type`
- [x] 4.2 Update `docs/current-state.md` with document-type status and next capability (`document-numbering`)
