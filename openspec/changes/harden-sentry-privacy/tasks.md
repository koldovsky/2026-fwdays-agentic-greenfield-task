## 1. Redaction module (shared/lib, framework-free)

- [ ] 1.1 Add `src/shared/lib/observability/redact.ts`: a pure `redactEvent(event)` that scrubs request bodies, `message`, exception values, breadcrumb data, and `extra`/`contexts` of anything that could carry CV or JD plaintext, and strips user identity (`event.user`, user-id fields) — no `next/*`, no DOM globals (TC-PURE-01, NFR-SEC-01, NFR-SEC-02)
- [ ] 1.2 Make `redactEvent` fail-open: wrap the scrub in a try/catch that, on throw, returns the event with a coarse `redaction-failed` placeholder body instead of `null`, so an event is never dropped (NFR-OBS-01)
- [ ] 1.3 Add a matching `redactTransaction` (or share the code path) for `beforeSendTransaction`, stripping the same fields from span/transaction payloads
- [ ] 1.4 Add the `shared/lib/observability` public API barrel (`index.ts`) exporting the redaction hooks
- [ ] 1.5 Unit tests against fixtures: a CV-text body, a JD-text body, an event carrying `user.id`/user-id metadata, and a scrub-throws case — assert plaintext and user IDs are gone, and that the throw case still returns a (scrubbed-placeholder) event, never `null` (NFR-SEC-01, NFR-SEC-02, NFR-OBS-01)

## 2. Env-driven config

- [ ] 2.1 Add `getSentryDsn()` to `src/shared/config/env.ts` (lazy, returns `undefined` when unset so telemetry is silently disabled — never a hardcoded literal)
- [ ] 2.2 Add a trace-sample-rate accessor with a production default < 1.0 (env override), full-rate only outside production

## 3. Apply hardening to all three Sentry configs

- [ ] 3.1 `sentry.server.config.ts`: `sendDefaultPii: false`, DSN from `getSentryDsn()`, env-driven `tracesSampleRate`, wire `beforeSend` + `beforeSendTransaction` to the redaction hooks; remove the dead commented `dataCollection` block
- [ ] 3.2 `sentry.edge.config.ts`: same hardening as 3.1
- [ ] 3.3 `src/instrumentation-client.ts`: same hardening (client config was shipped with the same leaky defaults — task brief's "no client config" note is stale)
- [ ] 3.4 Confirm `src/instrumentation.ts` still wires `register()` + `onRequestError` correctly after the config edits

## 4. Posture documentation

- [ ] 4.1 Add a short posture note (in-repo, e.g. alongside the redaction module or `docs/`) documenting exactly what Sentry receives, what is scrubbed, and why bug/error telemetry is an explicit exception to the no-third-party-tracker rule (no analytics, no fingerprinting) — BC-PRIVACY-01, BC-PRIVACY-02

## 5. Verify

- [ ] 5.1 Run `agent-verify` (build/typecheck/lint/test) and exercise the touched IDs: redaction unit tests green, DSN/sample-rate sourced from env, no hardcoded DSN in source (NFR-SEC-01, NFR-SEC-02, NFR-OBS-01)
- [ ] 5.2 Run `checker-review` (independent maker≠checker pass) against PRD IDs, FSD import rules, and this delta spec
- [ ] 5.3 Update `docs/current-state.md` handoff (last action + timestamp, working-on IDs, next steps, blockers) and archive the change once shipped
