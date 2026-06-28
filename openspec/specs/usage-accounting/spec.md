# usage-accounting

## Purpose

Record one usage row for every Claude API call the system makes, capturing the
provenance of each call (purpose, cycle, model, token counts), and let HR read
aggregate AI spend — total and per cycle, split by model and purpose — for
cost-of-operation analysis (FR-USAGE-01, FR-USAGE-03). This capability owns the
recording and aggregation behaviour; it does not own the per-call USD cost
formula or the seeded price table (FR-USAGE-02 / FR-USAGE-04), which belong to
the `token-cost-calculation` spec and are referenced here, never duplicated.

## Requirements

### Requirement: Record a usage row for every Claude API call

The system SHALL persist exactly one usage row for each completed Claude API call
(FR-USAGE-01). Each row SHALL capture the call timestamp, the purpose
(`interview` or `summary`), the cycle id the call was made for, the model id, the
input token count, and the output token count. When the Claude response reports
cached versus uncached token counts, the row SHALL capture them; when those
fields are absent from the response, the row SHALL still be written with the
totals it does have. Token counts SHALL be read from the model response, not
estimated. Inbound token and purpose data SHALL be validated with Zod at the
boundary, with TypeScript types inferred from those schemas via `z.infer`; a row
SHALL NOT be written from unvalidated values, and no `any`/cast SHALL be used to
coerce the response shape (NFR-COST-01 context only — see exclusions).

The USD cost stored alongside or derived from a row is computed by the
`token-cost-calculation` capability (FR-USAGE-02); this capability supplies the
model id and token counts to that function and SHALL NOT re-implement the price
table or the cost formula.

#### Scenario: Interview call records a usage row

- **GIVEN** an AI interview turn that calls the Claude API for an existing cycle
- **WHEN** the call completes successfully and returns input and output token counts
- **THEN** one usage row is persisted with `purpose = interview`, that cycle's id,
  the model id used, the timestamp of the call, and the reported input and output
  token counts

#### Scenario: Summary call records a usage row

- **GIVEN** an HR-triggered summary generation that calls the Claude API for an
  existing cycle
- **WHEN** the call completes successfully
- **THEN** one usage row is persisted with `purpose = summary`, that cycle's id,
  the model id, the timestamp, and the reported token counts

#### Scenario: Cached vs uncached tokens captured when available

- **GIVEN** a Claude response that reports cached and uncached input token counts
- **WHEN** the usage row is recorded
- **THEN** the row stores the cached and uncached token counts as reported

#### Scenario: Missing cache fields still record the row

- **GIVEN** a Claude response that does not include cached/uncached token fields
- **WHEN** the usage row is recorded
- **THEN** the row is still persisted with its timestamp, purpose, cycle id, model
  id, and input/output token totals, and the cache fields are left unset (not
  fabricated)

#### Scenario: One call yields exactly one row

- **GIVEN** a single completed Claude API call
- **WHEN** recording finishes
- **THEN** exactly one usage row exists for that call (no duplicate and no missing
  row)

#### Scenario: Malformed usage payload is rejected before persistence

- **GIVEN** a token-usage payload with a negative token count, a non-integer token
  count, or a purpose that is not `interview` or `summary`
- **WHEN** recording is attempted
- **THEN** Zod validation fails and no usage row is written

#### Scenario: Persistence failure does not silently lose the row

- **GIVEN** a valid usage payload whose database write fails
- **WHEN** recording is attempted
- **THEN** the failure surfaces as an error (it is not swallowed) so the missing
  row is observable, and no partial row is left behind

### Requirement: HR aggregate spend view

The system SHALL let an authenticated HR user read aggregate AI spend computed
from the recorded usage rows (FR-USAGE-03). The aggregation SHALL report the
grand total spend and the spend per cycle, and within each grouping SHALL break
the figures down by model id and by purpose. Spend figures SHALL be derived from
the usage rows' token counts via the `token-cost-calculation` capability
(FR-USAGE-02), so totals stay consistent with the per-row cost. Access SHALL
require a cabinet session; the view SHALL NOT be reachable by a respondent token
or by an unauthenticated request (NFR-SEC-01).

#### Scenario: Total and per-cycle spend with model and purpose breakdown

- **GIVEN** recorded usage rows spanning multiple cycles, models, and both purposes
- **WHEN** an authenticated HR user opens the spend view
- **THEN** the view shows the grand total spend and a per-cycle total, each split
  by model id and by purpose, with the figures derived from the recorded token
  counts

#### Scenario: No usage yet shows an empty state

- **GIVEN** no usage rows have been recorded
- **WHEN** an authenticated HR user opens the spend view
- **THEN** the view renders a designed empty state showing zero spend, not an
  error and not a blank page

#### Scenario: Unauthenticated request is redirected to sign-in

- **GIVEN** a request to the spend view with no valid cabinet session
- **WHEN** the request is handled
- **THEN** the user is redirected to the sign-in route with a `next` parameter
  preserving the spend view destination, and no spend data is returned

#### Scenario: Respondent token cannot read spend

- **GIVEN** a request carrying a respondent cycle token but no cabinet session
- **WHEN** the spend view is requested
- **THEN** access is forbidden and the user is redirected home; no cycle's spend
  data is returned

#### Scenario: Aggregation tolerates a model id absent from the current price table

- **GIVEN** a recorded usage row whose model id is not present in the current price
  table
- **WHEN** the aggregate spend is computed
- **THEN** the failure to price that row surfaces explicitly (consistent with
  `token-cost-calculation`'s unknown-model handling) rather than silently dropping
  the row's tokens from the totals

## Exclusions

- The per-call USD cost formula and the configurable, seeded price table
  (FR-USAGE-02, FR-USAGE-04) are intentionally NOT owned here; they live in the
  `token-cost-calculation` spec and are referenced, not duplicated.
- The persistent schema/columns for the usage row are defined by the `data-model`
  spec; this capability owns the recording behaviour that fills those columns, not
  their DDL.
- Bounding of AI usage volume — capped interview follow-ups and one summary run per
  explicit HR action (NFR-COST-01) — is enforced by the `ai-interview` and report
  capabilities, not here. This capability records whatever calls those capabilities
  make.
- Editing the price table, exporting spend data, billing, budgets, alerts, and any
  forecasting are intentionally unsupported in MVP.
