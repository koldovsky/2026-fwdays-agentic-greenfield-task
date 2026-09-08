# Phase 1 - Production Provider and Anonymous Session Core

## Status

Ready for implementation after Phase 0 feasibility approval

## Objective

Implement the reusable server-only production core for anonymous inbox sessions without exposing provider internals to the browser and without adding public API handlers yet.

## Business and Technical Value

This phase turns the proven Emailnator feasibility flow into a production-shaped backend core with encrypted temporary session persistence, capability-based access, deterministic repositories, and transport-independent error handling.

## Preconditions

- `docs/specs/001-mvp-specification.md` is approved.
- `docs/specs/002-architecture.md` is approved as the baseline.
- `docs/adr/001-vercel-http-adapter.md` is accepted for local feasibility.
- `docs/verification/phase-0.md` records a GO verdict for Phase 1.

## In Scope

- A formal `InboxProvider` abstraction.
- A production Emailnator provider implementation reusing the proven HTTP flow.
- Shared server-domain contracts and runtime validation.
- Anonymous session persistence contracts.
- Secure capability-token generation and hashing.
- Anonymous visitor hashing with keyed cryptography.
- Reusable provider-state encryption for persistence.
- Session repository abstraction.
- Deterministic in-memory session repository.
- Production Upstash Redis session repository design and implementation without live access.
- TTL and expiration handling.
- Atomic versioned encrypted-state updates.
- Safe application-level message references that hide provider message IDs.
- Transport-independent domain errors.
- Deterministic tests and factual verification documentation.

## Explicit Non-Goals

- Public API endpoints.
- Frontend integration.
- Browser `localStorage` integration.
- Accounts, login, passwords, or recovery.
- Playwright, Puppeteer, or browser workers.
- Live Emailnator requests from Codex during this phase.
- Live Upstash verification.
- Vercel deployment work.
- Rate-limit middleware.
- Queueing or background processing.

## Design Constraints

- Reuse the proven Phase 0 Emailnator transport instead of rewriting it.
- Keep provider cookies and XSRF handling provider-specific.
- Persist only encrypted provider or application session state.
- Persist only capability hashes, never plaintext capability tokens.
- Persist only keyed visitor hashes, never raw visitor identifiers.
- Keep provider message IDs internal and opaque.
- Use dependency injection where deterministic tests benefit from it.
- Use typed successes and typed failures.
- Keep HTTP concerns out of the domain and repository layers.

## Repository Scope

- `server/providers/`
- `server/session/`
- `tests/phase1/`
- `scripts/`
- `docs/tasks/`
- `docs/verification/`
- `docs/agentic-process.md`
- `docs/specs/002-architecture.md` only if needed
- focused ADRs only if implementation decisions merit them

## Required Behaviors

### Provider Abstraction

- Create inbox and return provider state.
- List messages using provider state and return refreshed provider state.
- Retrieve message detail using provider state and an opaque provider message ID.
- Preserve the accepted Gmail-style generation behavior.
- Keep the single bounded `googleMail` fallback.
- Reject custom-domain generation.

### Anonymous Session Model

Persist only:

- internal session ID
- capability-token hash
- anonymous visitor hash
- generated inbox address
- encrypted provider or application session state
- provider-state version
- provider identifier
- created timestamp
- updated timestamp
- expiration timestamp
- schema or envelope version

Do not persist plaintext capability tokens, raw visitor identifiers, raw IP addresses, or plaintext provider state.

### Repository Semantics

- Create with TTL.
- Lookup by capability hash.
- Delete by capability hash.
- Count active sessions by visitor hash.
- Atomically compare expected version before writing refreshed encrypted state.
- Preserve expiration when updating state.
- Reject stale state writes.

### Message Reference Strategy

- Never expose provider message IDs publicly.
- Reuse existing references for repeated provider messages.
- Store mappings only inside encrypted session state.
- Keep mapping growth bounded and prune deterministically.
- Reject unknown or stale references safely.

## Deterministic Verification Requirements

- `npm run lint`
- `npm run typecheck`
- `npm run test:phase0`
- a focused Phase 1 deterministic test command
- a Phase 1 aggregate verification command when available
- `npm run build` unless the known managed-environment build limitation blocks it again

If the managed Codex environment reproduces the known Vite or Tailwind `spawn EPERM` limitation, record it separately as environmental and continue with independent deterministic checks.

## Required Documentation Outputs

- `docs/verification/phase-1.md`
- `docs/agentic-process.md`
- this task file
- any focused ADR required by the implemented persistence design

## Acceptance Criteria

- A formal `InboxProvider` exists.
- Emailnator implements the provider contract without leaking Phase 0 CLI concerns.
- Capability tokens are securely generated and only stored as hashes.
- Visitor identifiers are stored only as keyed hashes.
- Provider state is encrypted before persistence.
- Repository abstractions exist for memory and Upstash.
- State updates are atomic and versioned.
- TTL and expiration behaviors are implemented.
- Safe application message references hide provider IDs.
- Session create, list, detail, and delete service operations work.
- Phase 0 tests still pass.
- New deterministic Phase 1 tests pass.
- Documentation records only factual evidence.
- No sensitive artifacts remain in the repository.

## Deferred Validation

- Live provider verification through production services.
- Live Upstash connectivity.
- HTTP status mapping and route-handler integration.
- Browser and frontend integration.
- Vercel deployment validation.
