# ADR 003 - Public Capability Transport, Anonymous Visitor Cookie, and Atomic Abuse Controls

## Status

Accepted for Phase 2 local implementation

## Context

Phase 2 needs a public Vercel-compatible backend API around the Phase 1 anonymous session service without exposing provider internals or introducing personal identifiers. The transport layer must authenticate inbox access with bearer capabilities, identify anonymous visitors safely, extract and hash client IP signals at the trust boundary, enforce create and read abuse limits, cap active inboxes per visitor under concurrency, and serialize stateful provider operations.

## Decision

Adopt a thin public HTTP layer with bearer-only capability transport, server-generated anonymous visitor cookies, keyed client-IP hashing, fixed-window rate limits, atomic visitor-slot reservations, and ownership-safe per-session operation locks.

The accepted design is:

- bearer capability tokens are accepted only through `Authorization: Bearer <token>` and are validated before repository access where practical;
- the public API never accepts capabilities through query strings, path segments, or visitor cookies;
- the server issues an opaque anonymous visitor cookie, rotates malformed values, marks it `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` in production, and stores only the keyed visitor hash derived from that cookie;
- the transport layer extracts the trusted client address from the left-most value of `x-forwarded-for`, with bounded localhost fallback only for local development requests, and hashes that address immediately with domain-separated keyed HMAC;
- visitor create limits, client-IP create limits, and capability read limits use deterministic fixed-window rate limiters in memory for tests and atomic Redis `INCR` plus `PEXPIRE` operations in production;
- active-inbox enforcement uses a repository-backed reservation flow: reserve a visitor slot atomically before provider creation, persist the session normally, and release the reservation in a `finally` path so failed creates do not leak capacity;
- the in-memory repository tracks active-session reservations separately from active sessions, and the Upstash repository uses dedicated visitor-reservation sorted sets plus atomic Lua scripts;
- list and detail operations acquire per-capability locks before touching provider state; Redis locks use `SET NX PX` for acquisition and compare-and-delete Lua release scripts so stale owners cannot delete newer locks;
- provider-touching requests run under one API-level deadline with `AbortController`, and the session service checks the signal again before writing refreshed encrypted state so late completions do not persist after timeout;
- a provider kill switch is enforced at the transport boundary so create, list, and detail return safe `503` responses without calling Emailnator, while delete remains available and health reports a generic degraded state.

## Alternatives Considered

- capabilities in query strings or URLs: rejected because URLs leak too easily through logs, browser history, and referrers;
- browser fingerprints instead of cookies: rejected because they add privacy risk and unstable identity characteristics;
- unprotected `count active sessions -> create session` checks: rejected because concurrent creates could exceed the visitor limit;
- optimistic unlocks without ownership checks: rejected because expired owners could delete a newer lock holder's state;
- `Promise.race` without cancellation: rejected because provider requests could continue running after timeout and still mutate state later.

## Consequences

Positive:

- public API responses stay provider-neutral and stable;
- anonymous visitor and client-IP signals remain one-way hashed before persistence or limiter keys are created;
- create concurrency stays bounded without storing raw visitor identifiers;
- refresh and detail operations no longer rely on repository compare-and-set races as the first line of defense;
- deterministic tests can exercise the same transport policies without live Upstash, Emailnator, or Vercel access.

Tradeoffs:

- active-slot reservations briefly make enforcement conservative until the reservation is released after a successful create;
- fixed-window rate limits are simpler than sliding windows and can burst at window boundaries;
- production health is intentionally minimal and does not prove live provider or Redis reachability.

## Decision History

- 2026-07-06: Proposed before Phase 2 implementation.
- 2026-07-06: Implemented with deterministic in-memory and Upstash-shaped production abstractions.
- 2026-07-06: Accepted after local deterministic verification without live Emailnator, Upstash, or Vercel access.
