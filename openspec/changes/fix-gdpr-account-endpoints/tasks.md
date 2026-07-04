## 1. Error envelope

- [x] 1.1 Wrap `DELETE /api/account` downstream calls in try/catch; return `{ error: "deletion_failed" }` with status 500 on throw (NFR-OBS-01)
- [x] 1.2 Wrap `GET /api/account/export` downstream calls (incl. `getCvEncryptionKey()`, `getDb()`, assembly) in try/catch; return `{ error: "export_failed" }` with status 500 on throw
- [x] 1.3 Log the cause server-side only, with no user ID / CV text / key material in the line (NFR-SEC-01/02); no stack or schema detail in the response body

## 2. Confirm delete propagation

- [x] 2.1 Confirm every child table references `users(id) ON DELETE CASCADE` so account delete cascades within 24 h (NFR-GDPR-02)

## 3. Tests

- [x] 3.1 `DELETE /api/account`: anon → 401, success → 200 + both session cookies cleared, service throw → 500 `deletion_failed` (no schema leak)
- [x] 3.2 `GET /api/account/export`: anon → 401, success → 200 JSON attachment, user gone → 404, unset key → 500 `export_failed` (no key-name leak), assembly throw → 500

## 4. Verify

- [x] 4.1 `yarn lint` + `yarn build` + `yarn test` clean (519 tests green after +8)
- [ ] 4.2 Run agent-verify + checker-review; update `docs/current-state.md`; archive this change once reviewed
