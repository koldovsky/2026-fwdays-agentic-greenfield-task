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
   - Expose the webhook port; note the public URL Coolify assigns (needed in `pipe` step below).

4. **GHCR pull access.** Connect Coolify to GHCR so it can pull the package:
   - Make the GHCR package readable (public, or add a registry credential in Coolify with a PAT
     scoped to `read:packages`).

5. **Env / secrets** (Coolify env vars only — **never** committed, never in the DB). Per AGENTS.md
   §Environment:
   - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`
   - `ANTHROPIC_API_KEY`
   - `DATABASE_URL` (from step 2)
   - `NOTION_TOKEN`, `NOTION_DB_FOODLOG_ID`, `NOTION_DB_REVIEWS_ID`, `NOTION_DB_METRICS_ID`,
     `NOTION_DB_FOODDB_ID` (owner only; Notion mirror lands in M7)
   - `TZ` (default `Europe/Kyiv`)

**Done when:** project + capped Postgres + env/secrets + GHCR pull are all in place. Flip `provision`
→ `done`. The loop can now run `pipe`.

## Handed to `pipe` (agent, automatable)

Not part of this runbook — the loop does these once a GHCR image exists:
- Deploy the image on the Coolify app.
- Register the Telegram webhook to the Coolify URL + `TELEGRAM_WEBHOOK_SECRET`
  (`curl https://api.telegram.org/bot<token>/setWebhook ...`, or a `npm run set-webhook` script).
- Verify a `/start` round-trips through the deployed bot (the `pipe` done-condition).

## After provisioning
Deploys are automatic: CI pushes a new image to GHCR ([ADR-0006](../adr/0006-build-off-box-ghcr.md)),
Coolify pulls it. No further manual infra unless env/secrets change.
