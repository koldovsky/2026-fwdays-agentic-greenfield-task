# Runbook — Coolify provisioning (backlog item `provision`, M0)

One-time **manual** infra on the existing Hetzner box. The implementation loop can't do this (Coolify
UI + secrets) — do it by hand, then flip `provision` to `done` in
[openspec/backlog.md](../../openspec/backlog.md). Rationale: [ADR-0004](../adr/0004-self-hosted-postgres-coolify.md)
(self-hosted PG), [ADR-0006](../adr/0006-build-off-box-ghcr.md) (build off-box → GHCR), AGENTS.md
rule 7 (memory caps).

> **Caps are sacred.** Bot ≤ 512 MB, Postgres ≤ 256 MB. The box is co-resident with the crypto-bot's
> mysqld — it must **never** be OOM-killed. Builds happen in CI, never on the box (`npm install`/`tsc`
> on the server is forbidden).

## Steps

1. **Project.** In Coolify, create project **`nutrition-bot`**.

2. **Postgres resource.** Add a PostgreSQL service to the project.
   - Set the container **memory limit = 256 MB** (hard).
   - Tune down for the cap: small `shared_buffers` (e.g. 64 MB), modest `max_connections` (e.g. 20),
     `work_mem` low. Goal: stay under 256 MB under load.
   - Note the connection string → this becomes `DATABASE_URL`.

3. **Application.** Create the app from the **GHCR image** (Coolify *pulls*, does not build):
   `ghcr.io/ivolchkov/2026-fwdays-agentic-greenfield-task:latest` (or the tag CI publishes).
   - Set the container **memory limit = 512 MB** (hard).
   - **No public domain needed** — delivery is **long-polling** ([ADR-0014](../adr/0014-long-polling-over-webhook.md));
     the free `sslip.io` URL can't get valid TLS. Leave Domains empty. Set **Ports Exposes = `3000`**
     for the internal `/health` probe only (not publicly routed); leave Port Mappings empty.

4. **GHCR pull access.** The package doesn't exist until `pipe`'s first CI push. Chosen approach
   (**public**): after that first push, GitHub → Packages → the package → Package settings → Danger
   Zone → **Change visibility → Public**. Then Coolify pulls with no creds. This is the one manual
   step that happens **mid-`pipe`** (the runner will prompt for it). *(Alt: keep private + add a
   Coolify registry credential with a PAT scoped `read:packages`.)*

5. **Env / secrets** (Coolify env vars only — **never** committed, never in the DB). Per AGENTS.md
   §Environment:
   - `TELEGRAM_BOT_TOKEN`
   - `ANTHROPIC_API_KEY`
   - `DATABASE_URL` (from step 2)
   - `PORT=3000` (internal `/health` probe)
   - `NOTION_TOKEN`, `NOTION_DB_FOODLOG_ID`, `NOTION_DB_REVIEWS_ID`, `NOTION_DB_METRICS_ID`,
     `NOTION_DB_FOODDB_ID` (owner only; Notion mirror lands in M7)
   - `TZ` (default `Europe/Kyiv`)

**Done when:** project + capped Postgres + env/secrets + GHCR pull are all in place. Flip `provision`
→ `done`. The loop can now run `pipe`.

## Handed to `pipe` (agent, automatable)

Not part of this runbook — the loop does these once a GHCR image exists:
- Deploy the image on the Coolify app.
- The bot opens an outbound **long-poll** (`getUpdates`) to `api.telegram.org` on boot — no webhook
  registration needed ([ADR-0014](../adr/0014-long-polling-over-webhook.md)).
- Verify a `/start` round-trips through the deployed bot (the `pipe` done-condition).

## After provisioning
Deploys are automatic: CI pushes a new image to GHCR ([ADR-0006](../adr/0006-build-off-box-ghcr.md)),
Coolify pulls it. No further manual infra unless env/secrets change.
