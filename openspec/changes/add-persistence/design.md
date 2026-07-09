# Design — add-persistence

## Context

Entities today are framework-free pure models in `src/entities/**` with no store.
Target architecture (`system-design.md` §6–7) puts durable state in Postgres,
accessed from the thin Next.js App Router via route handlers / server actions.
`shared/lib` must stay framework-free (TC-PURE-01), so DB code lives in a new
`shared/lib/db` + repository modules — not inside entity pure logic.

## Goals

- Durable Postgres schema for all MVP entities (`TC-STACK-05`).
- CV text encrypted at rest; never logged plaintext (NFR-SEC-01, BC-PRIVACY-02).
- Typed, testable repositories; entity pure models unchanged.
- GDPR export (JSON) + hard delete with cascade (NFR-GDPR-01/02).

## Decisions

- **Runtime:** Next.js route handlers + server actions (per project decision),
  not a separate NestJS service. Keeps one deployable; matches current repo.
- **Access layer:** a typed query builder / ORM in `shared/lib/db` behind
  per-entity repositories (`userRepo`, `cvProfileRepo`, `tailoringRepo`, …).
  Repositories map rows ↔ existing entity pure models — no ORM types leak upward.
- **Encryption:** CV text and any PII column encrypted with an app-held key
  (AES-256-GCM) via `shared/lib/crypto`; ciphertext stored, plaintext never logged.
- **Deletes:** FK `ON DELETE CASCADE` from user → cv_profiles → tailorings →
  checklist_items/bullets, so account/profile deletion is atomic (FR-CV-05,
  NFR-GDPR-02).
- **Migrations:** versioned SQL migrations checked into the repo; run in CI + on
  deploy.

## Schema (condensed)

`users(id, email, password_hash, created_at)`
`cv_profiles(id, user_id→users, encrypted_text, structured_json, created_at)`
`job_descriptions(id, raw_text, requirements_json, created_at)`
`tailorings(id, user_id→users, job_description_id→job_descriptions, match_score, created_at)`
`checklist_items(id, tailoring_id→tailorings, requirement_id, status, rationale)`
`bullets(id, tailoring_id→tailorings, text, grounding, source_ref, excluded)`
`subscriptions(id, user_id→users unique, plan, status, current_period_end)`
`usage_counters(id, user_id→users unique, lifetime_tailorings, updated_at)`

## Risks / open questions

- Anonymous tailorings (no user_id) — store transiently vs session-scoped row?
  MVP: keep session-only, persist on first sign-in.
- Encryption key rotation deferred to a later change.
