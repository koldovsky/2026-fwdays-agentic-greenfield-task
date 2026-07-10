# Tasks — Docker dev environment

> Sections 1 + 2 IMPLEMENTED 2026-07-10 (driver: the `db-test-seam` `test:pg`
> path needs a native Postgres the local pglite-over-wire endpoint can't serve).
> Section 3 (worker image) still blocked on the BullMQ graduation of
> `add-agent-loop`. Items marked (pending daemon) need a running Docker daemon to
> verify and were not runnable in the implementing environment.

## 1. Compose services

- [x] 1.1 Add `docker-compose.yml`: `postgres:16-alpine` + `redis:7-alpine`,
      `127.0.0.1`-bound ports (5432, 6379), named volume for Postgres data,
      dev-only credentials (`vouch_dev`), healthchecks.
- [ ] 1.2 (pending daemon) Verify migrations apply cleanly against compose
      Postgres via the existing migrate path; confirm schema matches the pglite
      path (same `src/shared/lib/db/migrations`, forward-only). `docker compose
      config` validates the file statically; boot + `yarn db:migrate` +
      `yarn test:pg` against it need the daemon.
- [x] 1.3 Update `docs/dev-setup.md`: compose quick-start, `DATABASE_URL` for
      compose vs pglite, `docker compose down -v` reset warning (destructive),
      dev-only credential note.

## 2. Guardrails

- [x] 2.1 Confirm `.env*` stays gitignored and no compose value duplicates a
      real secret; compose credentials identifiably dev-only (`vouch_dev`).
- [x] 2.2 Images version-pinned (`postgres:16-alpine`, `redis:7-alpine`, no
      `latest`) and ports declared `127.0.0.1`-bound in the file. (pending
      daemon) runtime non-loopback bind check.

## 3. Worker image (blocked on BullMQ graduation of `add-agent-loop`)

- [ ] 3.1 Add `worker/Dockerfile`: multi-stage (deps → build → runtime),
      `USER node`, production deps only, no secrets in layers; config via
      runtime env with fail-fast on missing vars.
- [ ] 3.2 Build + inspect image: non-root user, no `.env*`/secret in any
      layer, startup fails fast with a clear error when required env missing.

## 4. Verification

- [ ] 4.1 Run `agent-verify`: gates (build/lint/test) plus evidence for each
      scenario in `specs/dev-environment/spec.md` (compose up, bind check,
      pglite parity).
- [ ] 4.2 Independent `checker-review` of the diff (maker ≠ checker) against
      TC-STACK-04/05, TC-DEPLOY-01, and the security posture in `design.md`.
