# Local dev setup

Minimal environment to run Vouch locally with working sign-in/sign-up.

## 1. Environment variables

Create `.env.local` in the repo root **yourself** (agents must never read or
write `.env*` files — enforced by the permission deny-list). Generate real
random values; do not commit this file (it is gitignored by Next.js defaults).

| Variable | Required for | Format | Generate |
|----------|--------------|--------|----------|
| `AUTH_SECRET` | Auth.js sessions (`MissingSecret` without it) | 32+ byte random string | `openssl rand -base64 32` |
| `DATABASE_URL` | any DB access (register, sign-in, persistence) | Postgres URL | dev stand-in: `postgres://vouch@127.0.0.1:5544/postgres` |
| `CV_ENCRYPTION_KEY` | CV persistence (AES-256-GCM at rest, NFR-SEC-01) | 32 bytes as 64-char hex or base64 | `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | live tailoring only (tests use a fake provider) | Anthropic key | console.anthropic.com |
| `NEXT_PUBLIC_SITE_URL` | correct SEO URLs (defaults to `https://vouch.app`) | absolute URL | your origin |
| `PAYMENTS_PROVIDER` | payments provider selector | `emulator` (default) or `stripe` | — |
| `STRIPE_SECRET_KEY` | Stripe sandbox (server-only; `PAYMENTS_PROVIDER=stripe`) | `sk_test_…` | Stripe dashboard (test mode) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe sandbox (client-safe) | `pk_test_…` | Stripe dashboard (test mode) |
| `STRIPE_WEBHOOK_SECRET` | verify Stripe webhook signatures | `whsec_…` | `stripe listen` or dashboard |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry (leave empty to disable locally) | DSN URL | Sentry project settings |

A full template lives in `.env.example` — copy it to `.env.local` and fill in
real values. Never commit real keys (`.env.local` is gitignored).

One-shot creation (run in your own terminal, not via an agent):

```sh
{
  printf 'AUTH_SECRET=%s\n' "$(openssl rand -base64 32)"
  printf 'DATABASE_URL=postgres://vouch@127.0.0.1:5544/postgres\n'
  printf 'CV_ENCRYPTION_KEY=%s\n' "$(openssl rand -hex 32)"
} >> .env.local
```

## 2. Database (no local Postgres install needed)

`yarn dev:db` starts an in-process pglite served over TCP on `127.0.0.1:5544`
and applies all migrations from `src/shared/lib/db/migrations` (forward-only).
Data is in-memory: restarting the process resets the database.

```sh
yarn dev:db     # terminal 1 — pglite on :5544, migrations applied
yarn dev        # terminal 2 — Next.js dev server
```

### Compose (production-parity Postgres + Redis)

For real-PostgreSQL semantics (schema work, `yarn test:pg`) and data that
survives restarts, use the Docker Compose services instead of pglite. Requires
Docker; pglite stays the zero-install default for everyone else.

```sh
export DATABASE_URL=postgres://vouch_dev:vouch_dev@127.0.0.1:5432/vouch
yarn db:up          # postgres:16 + redis:7 on 127.0.0.1
yarn db:migrate     # local Postgres accepts non-TLS; no DATABASE_SSL needed
DATABASE_SSL=disable yarn dev
yarn db:down        # stop (keeps data on the named volume)
yarn db:reset       # DESTRUCTIVE: down -v wipes the volume, then re-up
```

- Ports bind to `127.0.0.1` only; images are version-pinned.
- `DATABASE_SSL` is read only by the app (`yarn dev`), not by `yarn db:migrate`
  (that runner takes SSL from the connection string's `sslmode`); local Postgres
  accepts non-TLS so neither needs a flag here.
- The credentials (`vouch_dev`) are **dev-only** and must never be used outside
  local development. Real secrets never live in `docker-compose.yml`.
- Redis is provisioned for the coming BullMQ queue and is not consumed by the
  app yet.

To run the DB-integration suite against this compose Postgres, use its URL with
`test:pg` (see the next section for the isolation + ephemeral-DB caveat):

```sh
TEST_DATABASE_URL=postgres://vouch_dev:vouch_dev@127.0.0.1:5432/vouch yarn test:pg
# a dirtied run can be wiped with `yarn db:reset`
```

### Running the DB-integration tests against real Postgres

`yarn test` runs the DB-integration suites (`src/shared/lib/db|account|auth/*.integration.test.ts`)
on in-process pglite — no DB required. To exercise the same tests against a **real
Postgres** and catch pglite-vs-Postgres divergence (the atomic usage-counter reserve,
the status-race guarded update, `findExportGrant`, `subscription.upsert`), point
`TEST_DATABASE_URL` at a Postgres instance and run:

```sh
TEST_DATABASE_URL=postgres://user:pass@127.0.0.1:5432/db yarn test:pg
```

Each test file isolates itself in a throwaway schema (created and dropped per run,
see `src/shared/lib/db/test-db.ts`), so point this at a dedicated/ephemeral DB — not
one holding data you care about. Unset, `test:pg` runs the same files on pglite.

## 3. Verify

- `GET /sign-in` renders with no `[auth][error] MissingSecret` in the server log.
- Registering a user returns 201; wrong credentials return the uniform
  `invalid_credentials` error (no account enumeration).
- `yarn test` and `yarn lint` pass without any env vars set (env is read
  lazily, never at import — see `src/shared/config/env.ts`).

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `[auth][error] MissingSecret` | `AUTH_SECRET` unset | add to `.env.local`, restart `yarn dev` |
| `Error: DATABASE_URL is not set` (register returns 500 `server_error`) | `DATABASE_URL` unset | add to `.env.local`; start `yarn dev:db` |
| `ECONNREFUSED 127.0.0.1:5544` | pglite server not running | `yarn dev:db` in a separate terminal |
| `CV_ENCRYPTION_KEY is not set` | key unset while saving a CV | add to `.env.local` (64-hex or base64, 32 bytes) |
