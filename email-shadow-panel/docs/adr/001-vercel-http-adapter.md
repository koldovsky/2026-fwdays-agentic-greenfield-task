# ADR 001 - Vercel HTTP Adapter

## Status

Accepted for local feasibility. Vercel Preview compatibility is deferred to Phase 4.

## Context

Email Shadow Panel needs server-side access to Emailnator so the public React app can generate temporary inboxes and read messages without exposing provider internals to the browser. Emailnator's internal HTTP interface is undocumented, so feasibility had to be proven before production implementation.

## Decision

Accept the direct HTTP Emailnator compatibility adapter for the MVP architecture.

Use Vercel Node.js Functions with native `fetch` and an isolated provider adapter.
Pin the runtime to Node 22.x to match the observed local environment and the pinned `package.json` engine.
Use Gmail-style generation through `dotGmail` by default.
Allow at most one bounded `googleMail` fallback when the initial `dotGmail` result is not compatible.
Reject custom-domain generation for the MVP.
Reject the production Playwright worker architecture for the MVP.
Treat Vercel Preview runtime compatibility as a later Phase 4 deployment gate rather than a Phase 0 blocker.

## Alternatives Considered

- Oracle plus Playwright worker: rejected because it violates the approved production constraints and adds persistent automation.
- Direct HTTP compatibility adapter: accepted for local feasibility after deterministic and human live verification.
- Local-only prototype: insufficient for the intended MVP direction.
- Abandoning Emailnator integration: fallback only if later deployment-specific gates fail.

## Evidence Supporting Acceptance

Codex-run deterministic evidence established:

- cookie and XSRF handling
- capsule sealing and restoration
- request classification
- structural detail sanitization
- preview auth gates
- boundary checks between browser and server code
- Gmail-style generation and bounded fallback behavior
- opaque message-ID compatibility and safe local selection behavior

Human-run local verification established:

- Gmail-style generation succeeded
- external inbound delivery succeeded
- cross-process capsule restoration succeeded
- real message listing succeeded
- real detail retrieval succeeded
- local detail output remained restricted to structural evidence only
- no sensitive message content was printed

## Constraints That Remain

- Vercel Preview deployment and runtime compatibility remain deferred to Phase 4.
- Provider behavior can still change over time.
- Rate limits, blocking, or deployment-environment differences could still affect later phases.

## Consequences

Accepted for the MVP direction:

- direct HTTP Emailnator adapter
- Gmail-style `dotGmail` default
- bounded `googleMail` fallback
- no production Playwright worker

Rejected for the MVP direction:

- custom-domain generation
- production Playwright worker architecture

## Decision History

- 2026-07-05: Proposed before Phase 0 implementation.
- 2026-07-05: Deterministic Phase 0 implementation and validation completed locally.
- 2026-07-06: Human live checks confirmed Gmail-style generation, inbound delivery, capsule restoration, indexed listing, and structural-only detail retrieval.
- 2026-07-06: Decision accepted for local feasibility with Vercel Preview verification deferred to Phase 4.
