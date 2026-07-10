# Design: poc-polish-observability (S-08)

## Context

NFR-OBS-01 requires structured logs (requests, errors, OTP sends without PII)
plus a health endpoint. The health part shipped in S-01 (`app-skeleton`).
Today the API uses the default NestJS text logger: boot messages, Nest's
built-in unhandled-exception logging, and two SMS senders (`DevSms` logs the
OTP code by design, ADR-0004; `TurboSms` logs failures with `maskPhone`).
There is no request logging at all, and nothing is machine-parseable on
Railway.

The rest of S-08 is verification/process work (prod §6 pass, traceability,
POC report) that needs no design — only the logging capability does.

Constraints: BC-PRIN-01 (no more complex than a notebook), NFR-SEC-01 (no
phones/codes in logs), fallow's unused-dependency gate (new deps must land
with their first consumer), ADR-0002 (single container, stdout goes to
Railway logs).

## Goals / Non-Goals

**Goals:**

- Structured (JSON in production) API logs: one line per request, errors with
  stack traces, OTP send outcomes — all PII-free.
- Zero behavior change for API clients; no new endpoints, no DB changes.
- Keep local `nx serve` output human-readable.

**Non-Goals:**

- Metrics, tracing, log aggregation, correlation IDs across services (single
  service — request-scoped context adds machinery without a consumer).
- Log rotation/shipping — Railway captures stdout.
- Frontend logging.

## Decisions

### D1. NestJS built-in JSON `ConsoleLogger`, not pino/winston

`NestFactory.create(AppModule, { logger: new ConsoleLogger({ json: true }) })`
— NestJS 11 (already in use) emits structured JSON natively: every existing
`Logger` call site (SMS senders, boot, exceptions handler) becomes structured
for free.

- Alternative — `nestjs-pino`: request logging and redaction out of the box,
  but adds 3 packages, an interceptor pipeline, and redaction config for a
  7-endpoint POC. Rejected on BC-PRIN-01; our PII policy is "never put PII in
  the message" (already the S-02 idiom), which needs no redaction engine.
- Alternative — winston: same weight objection, no built-in Nest 11 synergy.

JSON is enabled when `NODE_ENV === 'production'` — the established prod
detection idiom (`auth-config.ts`, `attachments-config.ts`; Dockerfile sets
it). Local dev keeps the default pretty logger. A unit-testable factory
(`createAppLogger(env)`) keeps `main.ts` bootstrap-thin.

### D2. Request logging via Express middleware, not an interceptor

A tiny middleware (`app.use()` in `AppModule.configure` or functional) that
hooks `res.on('finish')` and emits one log line per API request:
`{ method, path, statusCode, durationMs }` with context `http`.

- Why not an interceptor: interceptors do not fire when a guard rejects
  (401s from `AuthGuard` would be invisible) or on 404 route misses.
  Middleware sees every request that reaches Express.
- Scope: only `/api/*` paths are logged; SPA static asset requests are noise
  and are skipped (cheap prefix check).
- Level: `log` for < 500, `error` handled by D3 (the request line itself
  stays `log`/`warn` — one channel per concern). 4xx are expected user
  outcomes (404 parity, 409 transitions, 429 rate limits) — logged at the
  same request line, no special casing.

### D3. Error logging: rely on Nest's exceptions handler, verify it

Nest's `BaseExceptionFilter` already logs unhandled (non-`HttpException`)
errors with stack via `Logger.error` — with D1 that output is already
structured JSON. No custom global filter is added; the existing local
attachments filter (multer remap) is untouched. The spec pins the observable
behavior (5xx → structured error log with stack), tests enforce it.

### D4. PII policy is a log-content contract, tested

The spec fixes what MUST NOT appear in logs (full phones, OTP codes in
`turbosms` mode, session/cookie token values, request bodies, query strings —
search `q` may contain requester names; FR-LIST-03). Concretely:

- The request line logs `req.path` (no query string), not `originalUrl`.
- No request/response bodies are ever logged.
- Existing call sites already comply (`maskPhone` in TurboSms; dev OTP log is
  the designed ADR-0004 fallback, selectable only when
  `NODE_ENV !== 'production'`).

Unit tests assert the middleware's emitted fields exactly (allowlist, not
denylist) — that is the enforcement mechanism, not a scanner.

## Risks / Trade-offs

- [JSON logs are unreadable during prod debugging via `railway logs`] →
  acceptable: lines are single-purpose and short; Railway renders JSON
  attributes; pretty-printing locally covers day-to-day work.
- [Allowlist tests can't prove no other code logs PII] → the S-02 grep-level
  review already established the idiom; the slice re-checks existing `Logger`
  call sites once (there are ~7) during implementation.
- [Middleware measures only Express-visible latency] → fine: NFR-OBS-01 asks
  for request visibility, not APM-grade timing.
- [UX-polish scope creep during the §6 pass] → hard rule from the proposal:
  fixes must stay within existing spec requirements and the timebox;
  anything larger becomes a POC-report finding.

## Migration Plan

No migration: additive logging only, deployed as a normal `railway up` after
the slice lands. Rollback = previous deployment (logs revert to text).

## Open Questions

- None blocking. The exact set of UX paper-cuts is unknown by design — it is
  the output of the end-to-end pass, bounded by the proposal's polish rule.
