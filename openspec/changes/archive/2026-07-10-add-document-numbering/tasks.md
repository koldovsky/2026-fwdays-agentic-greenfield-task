## 1. Yearly counter store

- [x] 1.1 Add `lib/document-numbering` (or under `lib/document-session`): types for `doc_number.json` (`year`, `last-invoice-seq`, `last-act-seq`), path helper `{data-root}/{year}/doc_number.json`, read-or-init
- [x] 1.2 Implement `issueNumbersForSession(guid, date)` — update session date; increment only missing numbers required by `doc-type`; format `Р-{7 digits}` / act integer; write counter + session; in-process mutex per year + atomic file replace
- [x] 1.3 Unit tests: first invoice → `Р-0000001` (TC-08); next same year increments (TC-09); other year uses separate file (TC-10); idempotent when numbers already set; `invoice` / `act` / `invoice_act` issue the right fields

## 2. Issue API

- [x] 2.1 Add `POST /api/docs/[guid]/issue-numbers` accepting `{ "date": "YYYY-MM-DD" }`, calling the store helper, returning updated session JSON
- [x] 2.2 Map invalid guid / invalid date / missing session to clear 4xx errors; surface persistence failures without partial success claims (NFR-10)

## 3. Step 2 UI

- [x] 3.1 Create `DocumentNumberingStep` client component: date control bound to session `date` (default today); show read-only invoice/act numbers when present; Ukrainian labels
- [x] 3.2 Persist date via `PATCH` on change; on «Далі» call issue-numbers then advance `current-step` (block on invalid date or failed issue)
- [x] 3.3 Wire into `WizardShell`: render numbering step on step 2; keep stubs for steps 3–7

## 4. Verification & handoff

- [x] 4.1 Verify TC-07–TC-10 (default today, first/next invoice, other-year file) plus reload/Back does not re-issue
- [x] 4.2 Update `docs/current-state.md` with document-numbering status and next capability (`contacts` or parallel tracks)
