# ADR 002 - Anonymous Session Persistence and Safe Message References

## Status

Accepted for Phase 1 local implementation

## Context

Phase 1 needs a production-shaped anonymous inbox session core built on top of the approved direct HTTP Emailnator adapter. The browser must never receive provider cookies, XSRF values, provider session state, or provider message IDs. Temporary persistence must work in memory for deterministic tests and in Upstash Redis for production deployment later, without relying on accounts or user authentication.

## Decision

Adopt a capability-based anonymous session model with encrypted internal session state and atomic versioned persistence.

The accepted design is:

- capability tokens are 32-byte cryptographically random bearer tokens encoded as base64url;
- the plaintext capability token is returned only when a session is created;
- the repository stores only the SHA-256 capability-token hash;
- visitor identity is an opaque future API-layer input hashed server-side with HMAC-SHA-256 and a validated secret key;
- persisted session records contain metadata only plus one encrypted internal session-state blob;
- the encrypted internal state contains Emailnator provider state and the application message-reference mapping;
- application message references are random opaque values stored only inside encrypted state and reused when the same provider message reappears;
- message-reference mappings are bounded and pruned deterministically;
- in-memory persistence uses compare-and-set version checks with expiration preserved across updates;
- Upstash persistence uses namespaced Redis keys and a Lua `EVAL` compare-and-set update that reads the current TTL with `PTTL`, verifies the expected version, writes the new encrypted state, increments the version, and reapplies the remaining TTL;
- visitor activity counts are tracked per visitor hash with a Redis sorted set keyed by expiration timestamps so expired sessions can be pruned without storing raw visitor identifiers.

## Alternatives Considered

- Plaintext capability tokens in Redis: rejected because a datastore leak would directly grant inbox access.
- Plain hashes of visitor identifiers without a key: rejected because stable unhashed identifiers would be linkable across environments and easier to enumerate.
- Storing provider message IDs directly in browser-facing responses: rejected because provider internals must stay private and swappable.
- Read-then-write Redis updates without server-side atomicity: rejected because concurrent refreshes could silently overwrite newer encrypted state.
- Separate plaintext reference tables beside encrypted provider state: rejected because it would widen the persistence surface and leak provider-linked metadata.

## Consequences

Positive:

- the browser receives only safe capability tokens, inbox metadata, application message references, and sanitized message details;
- provider-specific state remains server-only and encrypted at rest;
- deterministic tests can use the same repository contract as production code;
- stale concurrent updates fail safely instead of overwriting newer state.

Tradeoffs:

- session detail and list operations can fail with a stale-version error under concurrent refreshes and must be retried by a later transport layer;
- encrypted internal session state is larger than a minimal provider-state-only blob because it also carries the message-reference map;
- Upstash live verification remains deferred until a later phase because this phase does not contact real infrastructure.
