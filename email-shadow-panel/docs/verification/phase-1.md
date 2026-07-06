# Phase 1 Verification

## Status

PHASE 1 DETERMINISTIC VERIFICATION: PASSED

PHASE 1 GATE: READY FOR PHASE 2

## Phase Objective

Implement and verify the production provider and anonymous session core without exposing provider internals, without running live Emailnator operations from Codex, without connecting to real Upstash, and without deploying to Vercel.

## Final Verdict

All Phase 1 deterministic exit criteria passed locally.

## Scope Verified

- formal `InboxProvider` contract
- production Emailnator provider boundary
- shared session-domain contracts and validation
- secure capability-token generation and hash-only persistence
- keyed anonymous visitor hashing
- reusable authenticated encryption for persisted session state
- deterministic in-memory repository behavior
- Upstash Redis repository design with TTL-aware atomic compare-and-set updates
- anonymous session service create, list, detail, and delete flows
- safe bounded application message references
- transport-independent domain errors
- Phase 0 regression coverage
- Phase 1 deterministic tests

## Preserved Codex-Run Implementation Record

The following maker evidence remains factual and preserved:

- the formal `InboxProvider` abstraction was implemented;
- Emailnator implements the production provider boundary;
- secure capability tokens are generated and persisted only as hashes;
- anonymous visitor values are persisted only as keyed HMAC hashes;
- provider and message-reference state is encrypted before persistence;
- the in-memory repository implements TTL, expiration, deletion, active-session counting, and stale-write rejection;
- the Upstash repository uses a TTL-aware atomic Lua compare-and-set design;
- application message references hide provider message IDs;
- transport-independent domain errors are implemented;
- no live Emailnator, Upstash, or Vercel operation was performed during Phase 1 implementation.

## Codex-Run Deterministic Checks

Environment: managed Codex desktop workspace
Actor: maker Codex

Successful deterministic checks:

- `npm run typecheck` -> PASS
- `npm run lint` -> PASS with 6 pre-existing frontend Fast Refresh warnings and 0 errors
- `npm run test:phase0` -> PASS; 26/26 tests passed; cross-process Phase 0 capsule restoration passed
- `npm run test:phase1` -> PASS; 25/25 tests passed
- `npm run test:deterministic` -> PASS
- `node --experimental-transform-types ./scripts/verify-phase1.ts` -> PASS

Managed-environment limitation recorded separately from implementation defects:

- `npm run build` -> FAIL in the managed Codex environment because the previously known Vite or Tailwind `spawn EPERM` and native-module loading issue recurred

That managed-environment build failure was classified as environmental rather than as a Phase 1 implementation defect.

## Final Human-Run Local Verification

Environment: normal local PowerShell
Actor: human

The human ran:

- `npm run verify:phase1`

Final result: PASS.

The aggregate verification completed successfully:

- lint: PASS with 6 pre-existing frontend Fast Refresh warnings and 0 errors
- typecheck: PASS
- Phase 0 tests: PASS, 26/26
- cross-process Phase 0 capsule restoration: PASS
- Phase 1 tests: PASS, 25/25
- client production build: PASS
- SSR production build: PASS
- Phase 1 artifact and sensitive-value checks: PASS

The Vite `vite-tsconfig-paths` migration notices and plugin timing report were informational only and did not fail the build.

The temporary ignored Phase 0 test artifact was removed after verification without inspecting its contents.

## Security Invariants Recorded

- plaintext capability tokens are never persisted
- raw visitor identifiers are never persisted
- plaintext provider state is never persisted
- provider message IDs are not exposed through application results
- provider cookies and XSRF values remain internal
- Upstash credentials and encryption keys are not committed
- application message-reference mappings remain encrypted and bounded
- stale repository writes cannot silently overwrite newer provider state

## Deferred Verification

### Phase 2

- public HTTP route handlers
- request validation and transport error mapping
- capability extraction from requests
- visitor and IP abuse controls
- active-inbox limits
- refresh locks
- public health endpoint
- handler-level tests

### Phase 4

- real Upstash connectivity
- Vercel Preview runtime compatibility
- production environment variables
- deployed cross-invocation session restoration
- live Emailnator flow through the production session service
- deployed rate-limit and kill-switch verification
- production log and secret inspection

These deferred checks were not claimed as passed in Phase 1.
