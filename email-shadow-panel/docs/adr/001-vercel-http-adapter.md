# ADR 001 - Vercel HTTP Adapter

## Status

Proposed - PENDING HUMAN VERIFICATION

## Context

Email Shadow Panel needs server-side access to Emailnator so the public React app can generate temporary inboxes and read messages without exposing provider internals to the browser. Emailnator's internal HTTP interface is undocumented, so feasibility must be proven before production implementation.

## Problem With the Previous Playwright/Oracle Approach

A persistent browser automation worker would add operational cost, deployment complexity, fragile browser state, and a larger security surface. It also conflicts with the approved production constraints: no Playwright, Chromium, Oracle infrastructure, persistent workers, queues, or browser automation.

## Proposed Decision

Use Vercel Node.js Functions with native `fetch` and an isolated Emailnator compatibility adapter, if Phase 0 proves the full workflow. Pin the runtime to Node 22.x to match the observed local environment (`node --version` returned `v22.20.0`) and rely on the same major through `package.json` for local and Vercel execution.

## Alternatives Considered

- Oracle plus Playwright worker: rejected for the target architecture because it violates production constraints and adds persistent automation.
- Vercel HTTP compatibility adapter: preferred if feasibility evidence proves bootstrap, generation, listing, detail, session restoration, and Preview compatibility.
- Local-only prototype: useful for learning but insufficient for a public Vercel deployment.
- Abandoning Emailnator integration: fallback if the provider cannot be used safely or reliably within constraints.

## Expected Benefits

- Fits Vercel Hobby.
- Avoids production browser automation.
- Keeps provider details isolated.
- Preserves the existing React frontend.
- Keeps future operating cost low.

## Known Risks

- Emailnator endpoints and response shapes may change.
- Provider traffic from Vercel may be blocked.
- Cookie and XSRF handling may be brittle.
- Session restoration may be impossible or unsafe.
- Message detail may require undiscovered state.

## Evidence Collected So Far

- A Vercel-style Preview probe was implemented as `api/_probe/emailnator.ts` with a named `POST(request: Request): Promise<Response>` export and Preview-only guards.
- A single tested helper now owns multi-cookie extraction and fails clearly when `Headers.getSetCookie()` is unavailable.
- Deterministic validation covers cookie handling, capsule sealing and restoration, request classification, structural detail sanitization, Preview auth gates, and a boundary check that `src/` does not import `server/`, `api/`, or `scripts/`.
- Public-reference-derived research from Emailnator's public page and client bundle indicates cookie names `XSRF-TOKEN` and `gmailnator_session`, `POST /generate-email`, and `POST /message-list` with detail keyed by `messageID`.
- The public-reference-derived research above is not proof of the live provider contract.

## Evidence Still Required Before Acceptance

- Live provider-session bootstrap evidence.
- Live cookie and XSRF handling evidence.
- Live address generation evidence.
- Live message-list evidence.
- Live individual message-detail evidence.
- Live session serialization and restoration evidence from a new process or invocation.
- Vercel Preview compatibility evidence from an actual Preview deployment.
- Separate checker review and CodeRabbit remediation evidence after changes are committed in a future step.

## GO Criteria

The HTTP adapter can be accepted only if all required workflow steps succeed without CAPTCHA bypass, challenge bypass, browser automation, high-volume probing, generic proxying, or committed sensitive data.

## NO-GO Criteria

Reject the adapter if message detail, session restoration, or Vercel Preview access cannot be demonstrated within the approved constraints.

## Consequences If Accepted

Later phases may implement production API endpoints, temporary encrypted Redis state, capability-token hashes, rate limits, refresh locks, and frontend integration around the adapter.

## Fallback If Rejected

Do not proceed with the full HTTP-proxy architecture. Re-scope the product, choose a different approved provider, or keep the project as a frontend prototype with documented limitations.

## Decision History

- 2026-07-05: Proposed before Phase 0 implementation. Evidence not collected yet.
- 2026-07-05: Phase 0 implementation and deterministic validation completed locally. Live inbox generation, live message retrieval, Vercel Preview probing, and final GO or NO-GO determination remain pending human verification.
