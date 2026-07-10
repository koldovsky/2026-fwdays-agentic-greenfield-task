## Why

Vouch's entities exist only as in-memory pure models; nothing is stored. The PRD
requires durable Postgres for users, CV profiles, job descriptions, tailorings,
subscriptions, and usage counters (`TC-STACK-05`), with CV text encrypted at rest
(NFR-SEC-01) and full GDPR export/delete (NFR-GDPR-01/02). This change adds the
persistence layer that auth, history, and billing depend on.

## What Changes

- Add PostgreSQL as the datastore, accessed from the Next.js app via a typed data
  layer (route handlers + server actions; no separate service). Schema + migrations
  for users, cv_profiles, job_descriptions, tailorings, checklist_items, bullets,
  subscriptions, usage_counters — matching the entities in `system-design.md` §7.
- Encrypt CV text at rest (AES-256 or provider-native) and keep it out of logs
  (NFR-SEC-01, BC-PRIVACY-02).
- Persist parsed CV profiles per account and re-use them across tailorings
  (FR-CV-04); cascade-delete profiles and their tailorings (FR-CV-05).
- Persist tailorings so paid users get history (FR-HISTORY-01/02, FR-TAILOR-04).
- Add GDPR endpoints: export all user data as JSON (NFR-GDPR-01) and permanently
  delete an account with propagation within 24h (NFR-GDPR-02).

## Capabilities

### New Capabilities
- `persistence`: Postgres schema, typed data-access layer, encryption-at-rest, and
  GDPR export/delete. Serves TC-STACK-05, FR-CV-04/05, FR-HISTORY-01/02,
  FR-TAILOR-04, NFR-SEC-01, NFR-GDPR-01/02.

### Modified Capabilities
<!-- None. Entities keep their pure models; this adds a repository layer beneath them. -->

## Impact

- New: SQL migrations + schema, `shared/lib/db` typed client, per-entity
  repository modules, `src/app/api/account/export` + `.../delete` route handlers,
  encryption helper in `shared/lib/crypto`.
- Depends on: a Postgres instance (env `DATABASE_URL`), an encryption key (env);
  `add-auth` supplies the current user.
- Serves: TC-STACK-05, FR-CV-04/05, FR-HISTORY-01/02, FR-TAILOR-04, NFR-SEC-01,
  NFR-GDPR-01/02, BC-PRIVACY-02.
