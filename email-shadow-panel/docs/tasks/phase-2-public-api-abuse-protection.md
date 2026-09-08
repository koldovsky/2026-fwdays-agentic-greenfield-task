# Phase 2 - Public Vercel API and Abuse Protection

## Status

Ready for implementation after Phase 1 deterministic verification

## Objective

Implement the public anonymous backend API for Email Shadow Panel with secure capability transport, visitor and client-IP abuse controls, atomic active-inbox limits, per-session operation locks, safe timeout handling, and deterministic verification.

## Business and Technical Value

This phase turns the production-shaped Phase 1 session core into a public backend surface that the existing frontend can consume later without exposing Emailnator cookies, provider message IDs, raw visitor identifiers, or raw client IP addresses.

## Preconditions

- `docs/specs/001-mvp-specification.md` is approved.
- `docs/specs/002-architecture.md` is accepted as the current baseline.
- `docs/adr/001-vercel-http-adapter.md` is accepted.
- `docs/adr/002-anonymous-session-persistence.md` is accepted.
- `docs/verification/phase-1.md` records a Phase 2-ready verdict.

## In Scope

- public API routes for create, list, detail, delete, and health;
- stable public JSON contracts and error envelopes;
- bearer-only capability extraction and validation;
- anonymous visitor-cookie generation and reuse;
- trusted client-IP extraction with immediate keyed hashing;
- deterministic and Upstash-shaped rate-limit abstractions;
- concurrency-safe active-inbox reservation enforcement;
- per-session operation locks;
- request deadlines with real cancellation signals;
- provider kill-switch enforcement;
- structured redacted diagnostics;
- deterministic Phase 2 tests and verification artifacts.

## Explicit Non-Goals

- frontend integration;
- browser `localStorage` session wiring;
- live Emailnator requests by Codex;
- live Upstash access;
- Vercel deployment;
- browser automation;
- checker artifact generation;
- automatic commit or push.

## Design Constraints

- keep handlers thin and dependency-injectable;
- keep provider cookies, XSRF values, plaintext provider state, provider IDs, and capability hashes out of public responses;
- accept capabilities only through `Authorization: Bearer`;
- hash visitor cookies and client-IP values before persistence or limiter keys;
- ensure active-inbox enforcement is concurrency-safe;
- ensure stateful provider operations are serialized per session or capability hash;
- use actual abort signals instead of timeout wrappers that leave work running;
- avoid real network or cloud dependencies during deterministic verification.

## Repository Scope

- `api/`
- `server/api/`
- `server/session/`
- `server/providers/`
- `tests/phase2/`
- `scripts/`
- `docs/tasks/`
- `docs/verification/`
- `docs/adr/`
- `docs/specs/002-architecture.md`
- `docs/agentic-process.md`
- `.env.example`
- `package.json`

## Required Behaviors

### Public Endpoints

- `POST /api/inboxes`
- `GET /api/inboxes/messages`
- `GET /api/inboxes/messages/:messageReference`
- `DELETE /api/inboxes`
- `GET /api/health`

### Capability Transport

- accept only `Authorization: Bearer <capability-token>`;
- reject missing, malformed, duplicated, query-string, or oversized authorization values;
- return the plaintext capability token only during successful inbox creation.

### Visitor and Client Signals

- server-generated anonymous visitor cookie with bounded lifetime;
- visitor-cookie rotation for malformed values;
- trusted client-IP extraction at the HTTP boundary with immediate keyed hashing;
- no raw visitor or client-IP persistence or logging.

### Abuse Controls

- visitor create rate limit;
- client-IP create rate limit;
- capability read rate limit;
- visitor active-inbox cap with concurrency-safe reservations;
- one stateful provider operation at a time per session.

### Transport Safety

- method validation and `Allow` headers for unsupported methods;
- same-origin enforcement for browser-originated state-changing requests;
- `Cache-Control: no-store` and `X-Content-Type-Options: nosniff` headers;
- stable public error envelopes with safe request IDs;
- provider kill switch;
- deterministic timeout and cancellation handling.

## Deterministic Verification Requirements

- `npm run lint`
- `npm run typecheck`
- `npm run test:phase0`
- `npm run test:phase1`
- `npm run test:phase2`
- `npm run build` when the local environment permits
- `node --experimental-transform-types ./scripts/verify-phase2.ts`

Managed-environment build failures must be recorded separately from implementation defects when the same known Vite or Tailwind native-module issue recurs.

## Required Documentation Outputs

- `docs/tasks/phase-2-public-api-abuse-protection.md`
- `docs/verification/phase-2.md`
- `docs/adr/003-public-api-abuse-controls.md`
- `docs/agentic-process.md`
- `docs/specs/002-architecture.md` when needed

## Acceptance Criteria

- all five logical public endpoints exist;
- create, list, detail, and delete handlers remain thin and injectable;
- capability credentials use `Authorization: Bearer` only;
- visitor-cookie behavior is secure and deterministic;
- raw visitor and client-IP values are never persisted or logged;
- visitor, client-IP, and capability rate limits work deterministically;
- active-inbox limits remain concurrency-safe;
- per-session locks are ownership-safe;
- provider timeouts use actual abort signals;
- provider kill switch blocks provider calls safely;
- public errors are stable, safe, and normalized;
- health stays minimal and non-sensitive;
- Phase 0 and Phase 1 regressions still pass;
- Phase 2 deterministic tests pass;
- documentation records only factual evidence;
- no sensitive artifacts remain.

## Deferred Validation

### Phase 3

- frontend integration with these public endpoints;
- browser `localStorage` restoration flows;
- client-side polling, retry UX, and selection state.

### Phase 4

- live Upstash connectivity;
- Vercel runtime behavior and forwarded-header validation in deployment;
- live Emailnator requests through the public API;
- deployed kill-switch, timeout, and logging inspection;
- cloud environment variable wiring.
