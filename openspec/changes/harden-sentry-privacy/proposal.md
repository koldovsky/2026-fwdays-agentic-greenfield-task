# Harden Sentry privacy posture

## Why

Sentry was wired in (`sentry.server.config.ts`, `sentry.edge.config.ts`,
`src/instrumentation-client.ts`, `src/instrumentation.ts`) with defaults that
leak PII to a third party. In every config the privacy opt-outs are
**commented out** (`dataCollection.userInfo`/`httpBodies`), the DSN is
**hardcoded**, `tracesSampleRate` is **1.0**, and logs are enabled. Sentry's
default behavior attaches request bodies and user context to events, so the
plaintext CV/JD that flows through `POST /api/tailor`, `/api/tailor/analyze`,
`/api/tailor/generate`, and `/api/cv/parse`, plus authenticated user IDs, would
be shipped to a third-party ingest endpoint.

That directly violates the honesty/privacy contract: CV text is PII that is
encrypted at rest and never logged in plaintext (NFR-SEC-01), user IDs are kept
out of outbound payloads (NFR-SEC-02), and the PRD forbids third-party trackers
on any page (BC-PRIVACY-01) with CV text explicitly classified as protected PII
(BC-PRIVACY-02). Error reporting is allowed, but only as an explicit,
documented, redacting opt-out posture — not the shipped default.

The redaction must **fail-open**: a scrub-path bug must never drop an error
event, because a swallowed error becomes a silent blank, which NFR-OBS-01
forbids. So the design is "always send, always scrubbed," never "send only if
scrubbing succeeded."

## What Changes

- Set `sendDefaultPii: false` in all three Sentry configs (server, edge,
  client) and remove the reliance on the commented-out `dataCollection`
  opt-outs — the redaction hook, not a comment, is the enforcement point.
- Add a shared, framework-free redaction module in `shared/lib` used by
  `beforeSend` and `beforeSendTransaction` in every config: it scrubs request
  bodies, message/exception text, breadcrumbs, and extra/context that could
  carry CV or JD plaintext, and strips user IDs / identifying metadata
  (NFR-SEC-02) before an event leaves the process.
- The redaction hook SHALL fail-open: if scrubbing throws, the event is sent
  with a coarse "redaction-failed" fallback body rather than dropped, so no
  error is silently lost (NFR-OBS-01).
- Move the DSN and sample rates to environment (lazy accessors in
  `src/shared/config/env.ts`, matching the existing `get*`/throw pattern); no
  DSN literal in source.
- Production `tracesSampleRate` SHALL be < 1.0 (env-driven, sane default);
  full-rate tracing is dev-only.
- Keep the existing client config (`src/instrumentation-client.ts`) but apply
  the same hardening; it was shipped with the same leaky defaults.
- Document the posture (what Sentry receives, what is scrubbed, why this is not
  a "tracker" under BC-PRIVACY-01) so the opt-out is explicit and reviewable.

## Capabilities

### New Capabilities

- `observability`: error/trace reporting posture for Vouch. Defines that
  outbound Sentry events are PII-scrubbed and user-ID-free before leaving the
  process, that scrubbing fails open (scrubbed, never dropped), that the DSN and
  sample rates come from environment with a sub-1.0 production trace rate, and
  that this reporting is an explicit documented exception to the
  no-third-party-tracker rule (bug/error telemetry only, no analytics or
  fingerprinting).

### Modified Capabilities

_None._

## Impact

- Code (application, implemented in the apply phase, not here):
  - `sentry.server.config.ts`, `sentry.edge.config.ts`,
    `src/instrumentation-client.ts` — add `beforeSend`/`beforeSendTransaction`,
    `sendDefaultPii: false`, env-driven DSN + sample rate.
  - `src/shared/lib/observability/redact.ts` (new, framework-free per
    TC-PURE-01) + unit tests against CV/JD/user-id fixtures.
  - `src/shared/config/env.ts` — add `getSentryDsn()` (optional; telemetry
    silently disabled when unset) and trace-sample-rate accessor.
  - `src/instrumentation.ts` — unchanged wiring (`captureRequestError`).
- Specs: new baseline capability `observability`.
- Docs: `docs/current-state.md` handoff; a short posture note (what is sent /
  scrubbed) for the privacy record (BC-PRIVACY-01/02).
- No route, data-model, or UI changes.
