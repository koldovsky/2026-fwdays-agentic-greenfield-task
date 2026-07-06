# Phase 0 Verification

## Status

PASSED FOR LOCAL FEASIBILITY

## Final Records

- `LOCAL LIVE PROVIDER VERIFICATION: PASSED`
- `PHASE 0 FEASIBILITY GATE: GO FOR PHASE 1`
- Vercel Preview verification is deferred to Phase 4.

## Phase Objective

Prove whether the required Emailnator workflow can run through direct server-side HTTP requests without browser automation and without exposing provider internals to the browser.

## Final Phase 0 Conclusion

Phase 0 passed for local feasibility.

Direct HTTP Emailnator integration is viable for the MVP.
Production Playwright is not required for the MVP.
Gmail-style generation is the accepted production path.
Custom provider domains are rejected for the MVP.
External inbound delivery was observed.
Cross-process restoration was observed.
Real message listing and detail retrieval were observed.
The CLI exposed only numeric indexes for message selection and only structural detail evidence for message retrieval.
No sensitive message content was printed.
Vercel Preview verification is deferred to Phase 4.

## Codex-Run Deterministic Verification

Codex-run deterministic evidence in the managed environment:

- `node --version` -> `v22.20.0`
- `npm --version` -> `11.6.1`
- `npm run typecheck` -> passed
- `npm run test:phase0` -> passed; 26 tests passed, 0 failed; cross-process capsule restoration passed in a fresh Node process
- `npm run lint` -> passed with 0 errors and 6 pre-existing frontend warnings under `src/components/ui/*`
- `npm run verify:phase0` -> reached the previously known managed-environment build limitation after lint, typecheck, and tests had already passed; `vite build` failed with the known `spawn EPERM` and Tailwind native-module loading issue

This managed-environment build failure was treated as an environment limitation rather than an implementation defect.

## Human-Run Deterministic Verification

Human-run deterministic evidence in a normal local PowerShell terminal:

- `npm run verify:phase0` -> PASS

That successful human-run command covered lint, typecheck, Phase 0 tests, cross-process capsule restoration, production builds, and artifact or sensitive-value checks in the normal local environment.

## Human-Run Live Provider Verification

Environment: normal local PowerShell
Actor: human

Observed outcomes:

- Gmail-style generation: PASS
- External email delivery: PASS
- Cross-process capsule restoration: PASS
- Indexed message listing: PASS
- Detail retrieval using the selected numeric index: PASS
- Detail output restricted to structural fields: PASS
- Sensitive content leaked: NO
- CAPTCHA, provider challenge, or rate limit: NO
- Capsule cleanup: PASS
- Repository safety check: PASS
- Overall local provider feasibility: PASS

The live detail output contained only structural evidence fields:

- `Content-Type`
- `Body length`
- `Known marker found`

No generated address, sender, subject, body, message ID, cookie, XSRF value, session key, capsule, or raw provider response was recorded here.

## Public-Reference-Derived Research

The following observations came from low-volume inspection of public Emailnator page and client assets only. They were useful for adapter design but were not treated as live proof.

- Public assets referenced cookie names `XSRF-TOKEN` and `gmailnator_session`.
- Public assets referenced `POST /generate-email`.
- Public assets referenced `POST /message-list` for message listing.
- Public assets suggested detail retrieval also uses `POST /message-list` with a `messageID` field.

## Compatibility Corrections Closed During Phase 0

These focused issues were found and corrected during Phase 0 before the final live pass succeeded:

- The local CLI detail path originally printed sanitized message text instead of structural evidence only.
- The local CLI list path originally lacked a safe selection mechanism for detail retrieval.
- The original generation request allowed custom-domain recipients, which were rejected for the MVP after external delivery failure.
- The original message-ID regex was narrower than the real provider opaque identifier format.

Deterministic regression coverage was added for each focused correction.

## Sensitive-Data Review

- `tests/fixtures/emailnator/README.md` documents fixture provenance as `synthetic`, `public-reference-derived`, or `live-sanitized`.
- Phase 0 artifact and sensitive-value checks passed.
- No live inbox addresses, sender addresses, subjects, bodies, message IDs, cookies, XSRF values, session keys, capsules, or raw provider responses were intentionally stored in repository documentation.

## Architecture Result

Accepted for local feasibility:

- direct HTTP Emailnator adapter
- Gmail-style `dotGmail` default generation
- bounded `googleMail` fallback
- numeric-index local selection flow
- structural-only local detail output

Rejected for the MVP:

- custom-domain generation
- production Playwright worker architecture

## Deferred Gate

Deferred to Phase 4:

- Vercel Preview runtime and deployment verification

## Final Verdict

Verdict: PASSED FOR LOCAL FEASIBILITY, GO FOR PHASE 1

Phase 0 established that the Email Shadow Panel MVP can use a direct HTTP Emailnator adapter locally without production Playwright. The remaining Preview-specific deployment gate is deferred to Phase 4.
