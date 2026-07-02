## 1. Database foundation

- [x] 1.1 pg (node-postgres) adapter `shared/lib/db/pg.ts` (Queryable, lazy pool) + forward-only `migrate.ts` runner (statement-split, schema_migrations); `DATABASE_URL` in `shared/config/env.ts`, `CV_ENCRYPTION_KEY` in `shared/lib/crypto`.
- [x] 1.2 Migrations for users, cv_profiles, job_descriptions, tailorings, checklist_items, bullets, subscriptions, usage_counters (cascade FKs, CHECK constraints) — `shared/lib/db/migrations/0001_init.sql`. Live-apply verification deferred (needs Postgres).
- [x] 1.3 `shared/lib/crypto` AES-256-GCM helper (encrypt/decrypt) for PII columns — pure `aes.ts` (versioned `v1:` envelope, random IV, GCM auth tag) + env-bound `key.ts` (`CV_ENCRYPTION_KEY`, lazy). 15 tests.

## 2. Repository layer

- [x] 2.1 `shared/lib/db` — driver-agnostic `Queryable` port + hand-mapped repos (no ORM leak). pg adapter satisfies the port 1:1.
- [x] 2.2 CV profile repo: save encrypted text (via `shared/lib/crypto`), reuse across tailorings, cascade delete (FR-CV-04/05). Fake-Queryable tests prove ciphertext-at-rest + mapping.
- [x] 2.3 Tailoring repo: persist tailoring + checklist_items + bullets (ord-stable), listByUser/findById history, cascade delete (FR-TAILOR-04, FR-HISTORY-01/02). pglite-verified.

## 3. GDPR endpoints

- [ ] 3.1 `GET /api/account/export` → JSON of CV profile + tailoring history (NFR-GDPR-01)
- [ ] 3.2 `DELETE /api/account` → hard delete with cascade, propagation ≤ 24h (NFR-GDPR-02)

## 4. Verify & review

- [x] 4.1 Verified via pglite (in-process PG): migrations apply on empty DB + idempotent, CV encrypt round-trip, user→cv_profiles and tailoring→items/bullets FK cascade. Real external-PG run still recommended pre-launch.
- [x] 4.2 CV column asserted ciphertext (`v1:` envelope, no plaintext) in fake + pglite tests; repos never log CV text (NFR-SEC-01).
- [ ] 4.3 Independent checker-review vs PRD + FSD (entities stay pure; DB in shared/lib)
