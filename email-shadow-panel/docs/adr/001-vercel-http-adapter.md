# ADR 001 - Vercel HTTP Adapter

## Status

Proposed — pending Phase 0 evidence

## Context

Email Shadow Panel needs server-side access to Emailnator so the public React app can generate temporary inboxes and read messages without exposing provider internals to the browser. Emailnator's internal HTTP interface is undocumented, so feasibility must be proven before production implementation.

## Problem With the Previous Playwright/Oracle Approach

A persistent browser automation worker would add operational cost, deployment complexity, fragile browser state, and a larger security surface. It also conflicts with the approved production constraints: no Playwright, Chromium, Oracle infrastructure, persistent workers, queues, or browser automation.

## Proposed Decision

Use Vercel Node.js Functions with native `fetch` and an isolated Emailnator compatibility adapter, if Phase 0 proves the full workflow. Store temporary encrypted provider state in Upstash Redis Free only in later phases after a GO verdict.

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

## Evidence Required Before Acceptance

- Provider-session bootstrap evidence.
- Cookie and XSRF handling evidence.
- Address generation evidence.
- Message-list evidence.
- Individual message-detail evidence.
- Session serialization and restoration evidence from a new process or invocation.
- Vercel Preview compatibility evidence.
- Sanitized fixtures and deterministic tests.

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
