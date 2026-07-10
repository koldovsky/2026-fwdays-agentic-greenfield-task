# Proposal: poc-polish-observability

> Slice: **S-08 · Поліровка, наскрізна перевірка, ретроспектива POC** (Е-7)
> from [docs/mvp-capability-plan.md](../../../docs/mvp-capability-plan.md) §1.
> PRD codes: **NFR-OBS-01** (fully: structured logs without PII), plus the
> closing verification of all FR/NFR (traceability 100%) and the product
> readiness criterion PRD §3.2.

## Why

The MVP feature set (S-01…S-07) is complete and deployed, but the POC is not
closed: NFR-OBS-01 is only half-done (health endpoint exists, but logs are
unstructured NestJS defaults — requests and errors are not logged at all in
production), the traceability matrix still has one open cell, and the product
readiness criterion (PRD §3.2 — a real user walks the full happy path §6 on
production) has never been verified end-to-end in one pass. S-08 closes these
gaps and produces the POC report that is the course deliverable.

## What Changes

- **Structured request/error logging (NFR-OBS-01)** — the only code
  capability of the slice:
  - API logs are structured (JSON in production) instead of free-text lines.
  - Every API request is logged: method, route, status, duration; errors
    (5xx) are logged with stack traces.
  - No PII in logs: phones only masked (as already done in `TurboSmsSender`),
    OTP codes never logged in `turbosms` mode (the dev-mode code log stays —
    that is the designed dev fallback, ADR-0004), no session tokens or cookie
    values, no user-entered free text (search queries, note bodies).
  - OTP send attempts (success/failure) are logged as structured events with
    masked phone — this already exists and is folded into the spec.
- **End-to-end production pass (PRD §3.2 / §6)**: one full happy-path walk on
  prod with a real SMS login — registration → house → ticket with photo →
  lifecycle to `Закрита` → search in the list — including the deferred
  NFR-STOR-01 demo check "photo survives a redeploy".
- **Small UX polish**: only defects/paper-cuts discovered during the
  end-to-end pass, fixed within existing spec requirements (no new behavior);
  timeboxed, anything bigger is logged as a finding in the POC report instead.
- **Traceability matrix to 100%**: every FR/NFR row has spec + test + demo
  check; the NFR-OBS-01 row is completed by this slice.
- **POC report** (`docs/poc-report.md`, Ukrainian): cycle metrics
  (time/cost/iterations/defects from `docs/cycles/`), quality assessment,
  conclusions for the main project — PRD §3.3.

## Capabilities

### New Capabilities

- `structured-logging`: structured, PII-free API logging — request logs,
  error logs, OTP send events (NFR-OBS-01, with NFR-SEC-01 constraints on
  log content).

### Modified Capabilities

<!-- none — health endpoint part of NFR-OBS-01 already lives in app-skeleton
     and does not change; UX polish stays within existing requirements -->

## Impact

- **API**: `api/src/main.ts` (logger setup), a request-logging middleware or
  interceptor + logging in the global exception path; no schema/DB changes,
  no new endpoints.
- **Web**: no planned changes; only possible paper-cut fixes from the
  end-to-end pass (each within existing specs).
- **Docs**: `docs/poc-report.md` (new), `docs/traceability-matrix.md` (final
  fill), `docs/current-state.md`.
- **Dependencies**: none planned — prefer NestJS built-in JSON logging over a
  new logging dependency (BC-PRIN-01; final call in design.md).

## Non-goals

- Full observability (metrics, tracing, dashboards, log aggregation) — PRD
  explicitly keeps it out of scope (NFR-OBS-01 "Повноцінна спостережуваність
  — поза скоупом").
- Any new product functionality (plan §1 S-08 non-goal) — no new screens,
  endpoints, or domain behavior.
- Log storage/rotation — Railway captures stdout; nothing to build.
- The final course-submission PR (`service-desk-mini` → `main`) — a separate
  act after the slice is done, not part of the slice itself (ADR-0008/0012).
