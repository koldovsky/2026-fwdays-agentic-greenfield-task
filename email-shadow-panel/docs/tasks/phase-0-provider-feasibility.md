# Phase 0 - Emailnator HTTP Feasibility

## Status

Ready for implementation after human approval

## Objective

Prove whether the required Emailnator workflow can run through server-side HTTP requests locally and from a Vercel Preview deployment without browser automation or bypassing provider controls.

## Business and Technical Value

This phase determines whether the planned Vercel HTTP adapter architecture is viable before investing in production endpoints, Redis state, or frontend integration.

## Prerequisites

- Phase 0A documentation reviewed by the human.
- Human approval to run low-volume provider probes.
- A safe manual test email available when prompted.
- Vercel Preview deployment access for the protected probe.

## Questions to Answer

- How is a provider session established?
- Which cookies are required?
- Is an XSRF token required, and where is it obtained?
- Can a new address be generated with approved options?
- Can its message list be fetched?
- Can an individual message body be fetched?
- Can the session be serialized and restored in a new process or invocation?
- Does Vercel Preview infrastructure permit the same requests?
- Are challenge or blocking responses encountered?
- What response shapes must the production adapter validate?

## Scope

- Local provider probe.
- Protected Vercel Preview-only probe.
- Session serialization experiment.
- Sanitized fixture capture.
- Deterministic tests around parsing, validation, redaction, and control flow.
- Feasibility documentation and ADR update.

## Explicit Non-Goals

- Production API endpoints.
- Frontend integration.
- Redis or another datastore.
- Production rate limiting.
- Background jobs.
- Browser automation.
- High-volume probing.
- CAPTCHA or challenge bypass.
- Generic proxy behavior.

## Likely Files and Directories

- `server/providers/emailnator/`
- `api/probe/`
- `tests/`
- `docs/fixtures/`
- `docs/verification/phase-0.md`
- `docs/adr/001-vercel-http-adapter.md`
- `docs/agentic-process.md`

## Allowed Dependencies

- Native Node.js `fetch`.
- A narrowly scoped cookie-jar dependency if justified.
- Zod or the repository's existing runtime-schema library.
- Node built-in test tooling or an existing test setup.

## Prohibited Dependencies

- Playwright.
- Chromium.
- Puppeteer.
- Axios or `node-fetch` without demonstrated need.
- Redis or database clients.
- Job queue libraries.
- Browser automation or stealth tooling.

## Security Constraints

- Use a fixed Emailnator origin.
- Do not expose arbitrary upstream URLs or headers.
- Do not commit raw cookies, XSRF tokens, session capsules, inbox addresses, personal senders, or message bodies.
- Redact logs and fixtures.
- Use bounded request timeouts and response-size limits.
- Stop on challenge, CAPTCHA, or blocking responses.

## Local Probe Requirements

The local probe must bootstrap a provider session, generate one address, pause for a human test email, list messages, fetch message detail, and print only redacted structural evidence.

## Vercel Preview Probe Requirements

The Preview probe must be protected by an internal bearer token, run only in Preview, and expose only narrow feasibility actions. This token is not product-user authentication.

## Message-Detail Discovery Requirements

Message detail must be proven by a real provider response. Endpoint names, request bodies, and response shapes must not be guessed or invented.

## Session Serialization and Cross-Process Restoration Requirements

The probe must serialize the minimum provider session state, restore it in a new process or invocation, and prove that list or detail requests still work after restoration.

## Fixture and Redaction Requirements

Fixtures must be sanitized before writing to the repository. They may include statuses, header presence, cookie count, body lengths, schema shape, and hashed identifiers. They must not include usable provider state or personal message content.

## Deterministic Test Requirements

Tests must cover parsing, validation, response classification, redaction, capsule handling, timeout behavior, and protected Preview route gates. Live provider probing is excluded from deterministic verification.

## Manual Test-Email Checkpoint

One manually sent harmless email is allowed. The probe must pause with clear instructions and resume only after human confirmation.

## Required Scripts

- `npm run probe:emailnator`
- `npm run test:phase0`
- `npm run verify:phase0`

Exact script internals may adapt to the existing package and test setup.

## Required Implementation Artifacts

- Provider feasibility source code.
- Protected Preview-only probe.
- Sanitized fixtures.
- Tests.
- Updated ADR.
- Updated verification report.
- Updated agentic-process record.

## Acceptance Criteria

- Bootstrap succeeds or fails with classified evidence.
- Generation succeeds or fails with classified evidence.
- Message listing succeeds or fails with classified evidence.
- Message detail is proven or disproven.
- Session restoration works in a new process or invocation, or fails with evidence.
- Vercel Preview compatibility is demonstrated or disproven.
- Deterministic tests and verification scripts run.
- Sensitive data is absent from committed artifacts.

## GO Conditions

- Bootstrap, generation, list, detail, session restoration, and Vercel Preview access all work without bypassing provider controls.
- Runtime response shapes are understood well enough to validate.
- Deterministic verification passes.
- Security and redaction review finds no committed secrets.

## NO-GO Conditions

- Message detail cannot be demonstrated.
- Session restoration cannot be demonstrated.
- Vercel Preview access is blocked.
- Required behavior needs CAPTCHA bypass, challenge bypass, browser automation, high-volume probing, or generic proxying.

## Known Risks

- Emailnator may change undocumented endpoints.
- Vercel network ranges may be blocked.
- Cookie or XSRF behavior may rotate.
- Message detail may require state that cannot be safely serialized.
- Low-volume manual probing may not reveal all production failure modes.

## Human Approval Gate

Do not begin Phase 0 implementation or live provider probing until the human approves this task specification.
