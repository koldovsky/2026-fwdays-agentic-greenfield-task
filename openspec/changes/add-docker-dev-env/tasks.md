# Tasks — Docker dev environment

> Spec-only for now. Implement when queue work starts (BullMQ/Redis stand-up
> after the `add-agent-loop` inline MVP). Task 3.x lands only with the worker.

## 1. Compose services

- [ ] 1.1 Add `docker-compose.yml`: `postgres:16-alpine` + `redis:7-alpine`,
      `127.0.0.1`-bound ports (5432, 6379), named volume for Postgres data,
      dev-only credentials (`vouch_dev`), healthchecks.
- [ ] 1.2 Verify migrations apply cleanly against compose Postgres via the
      existing migrate path; confirm schema matches the pglite path (same
      `src/shared/lib/db/migrations`, forward-only).
- [ ] 1.3 Update `docs/dev-setup.md`: compose quick-start, `DATABASE_URL` for
      compose vs pglite, `docker compose down -v` reset warning (destructive),
      dev-only credential note.

## 2. Guardrails

- [ ] 2.1 Confirm `.env*` stays gitignored and no compose value duplicates a
      real secret; compose credentials identifiably dev-only.
- [ ] 2.2 Confirm both services are unreachable from non-loopback interfaces
      (bind check) and images are version-pinned.

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
