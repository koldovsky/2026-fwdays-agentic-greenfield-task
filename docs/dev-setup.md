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

For production-parity Postgres + Redis via Docker Compose, see the planned
`add-docker-dev-env` change (`openspec/changes/add-docker-dev-env/`) — not yet
implemented; pglite is the supported dev path today.

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
