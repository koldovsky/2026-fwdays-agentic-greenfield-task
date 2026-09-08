# Phase 3 - Frontend Integration

## Status

Implemented in one maker-only Codex pass for local deterministic verification.

## Objective

Connect the polished Email Shadow Panel frontend to the Phase 2 public API without redesigning the application, while adding bounded browser-local recent-inbox persistence, cancellable loading, bounded polling, safe hostile-message rendering, OTP detection, and deterministic tests.

## Context Used

- `../AGENTS.md`
- `AGENTS.md`
- `docs/specs/001-mvp-specification.md`
- `docs/specs/002-architecture.md`
- `docs/adr/001-vercel-http-adapter.md`
- `docs/adr/002-anonymous-session-persistence.md`
- `docs/adr/003-public-api-abuse-controls.md`
- `docs/tasks/phase-2-public-api-abuse-protection.md`
- `docs/verification/phase-2.md`
- `docs/agentic-process.md`
- `package.json`
- current `src/`, `api/`, `server/`, and existing test files

## In Scope

- typed browser API client for the Phase 2 routes
- versioned recent-inbox `localStorage` persistence
- startup restoration of the most recent valid inbox only
- selected-inbox switching with request cancellation
- manual refresh plus bounded automatic polling
- real message list and detail loading
- inert hostile-message rendering from provider-neutral detail text
- heuristic OTP and verification-code detection
- session expiration, deletion, timeout, provider, rate-limit, and offline handling
- local forgetting plus server delete requests when possible
- deterministic Phase 3 tests and verification scripts
- factual documentation updates

## Explicit Non-Goals

- accounts, registration, login, or profiles
- cross-device recovery or cloud sync of recent inboxes
- Playwright, Puppeteer, or browser automation workers
- live Emailnator, Upstash, or Vercel operations by Codex
- broad visual redesign
- unrestricted raw HTML rendering

## Implementation Notes

- The browser now uses one centralized same-origin API client with `credentials: "same-origin"`, bearer capability headers only, Zod-validated success and error envelopes, `AbortSignal` forwarding, safe `Retry-After` parsing, and no token leakage into URLs or thrown messages.
- Recent inboxes now use a versioned, validated, bounded `localStorage` repository with schema recovery, expiration pruning, duplicate prevention, deterministic ordering, and a maximum of five stored inboxes.
- A focused inbox controller now owns selected inbox state, startup restoration, list/detail cancellation, overlap prevention, polling timers, visibility handling, and local-storage synchronization.
- The mailbox UI now loads real list and detail data, keeps message selection stable when references persist, clears stale selections safely, and forgets expired or missing sessions locally.
- Message detail rendering now stays text-only and inert. The browser never renders raw HTML from the API.
- OTP detection remains heuristic and local-only. It prefers contextual 4-8 digit codes and constrained alphanumeric verification codes while rejecting common date, time, phone, and long-ID false positives.

## Testing Strategy

- `tests/phase3/api-client.test.ts`
- `tests/phase3/local-sessions.test.ts`
- `tests/phase3/inbox-controller.test.ts`
- `tests/phase3/polling.test.ts`
- `tests/phase3/rendering-safety.test.ts`
- `tests/phase3/otp.test.ts`

The suite uses injected API fakes, fake timers, fake visibility state, and browser-local storage doubles. No live provider, Redis, or deployment dependency is required.

## Deferred To Phase 4

- live Emailnator-through-UI verification
- live Upstash connectivity
- Vercel deployment and forwarded-header validation
- deployed kill-switch and real infrastructure inspection
