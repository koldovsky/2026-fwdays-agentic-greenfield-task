## Why

The repo is greenfield — only `docs/` exists, no runnable code. Before any feature (onboarding,
food logging, reviews) can land, we need a proven end-to-end path: a deployed bot that receives a
Telegram message and replies. This **tracer bullet** de-risks the whole delivery chain (build
off-box → GHCR → Coolify pull → long-poll → reply) once, so every later change inherits a working
pipeline instead of debugging infra and features together. It is the M0 milestone and unblocks the
entire backlog (`data` and everything downstream are `blocked-by: pipe`).

## What Changes

- Scaffold the plain-TS + grammY application skeleton under `src/` (per requirements §4): `bot/`
  (grammY instance + handlers) and `config/` (zod env validation), plus a minimal entrypoint.
- **Long-poll** Telegram update handling via `bot.start()` ([ADR-0014](../../../docs/adr/0014-long-polling-over-webhook.md))
  — **not** webhook. No public ingress, no TLS, no `setWebhook`, no webhook secret.
- A `/start` command handler that echoes back (the round-trip proof).
- A minimal internal `/health` HTTP server on `PORT` for Coolify's liveness probe — **not** publicly
  routed (ADR-0014).
- zod-validated env config in `config/`: `TELEGRAM_BOT_TOKEN`, `DATABASE_URL`, `PORT` (default
  `3000`) required; `ANTHROPIC_API_KEY` required for later changes but not exercised here; `NOTION_*`
  optional. Bot refuses to boot on missing/invalid required env.
- Multi-stage `Dockerfile` (build → slim runtime) so the image builds off-box.
- GitHub Actions CI → GHCR image push; deploy on the already-provisioned Coolify project (`provision`
  done).
- Wire the deferred `typecheck` + Fallow CI/local steps now that `src/` exists (AGENTS.md lists both
  as planned-until-`src/`).

## Capabilities

### New Capabilities
- `bot-runtime`: the application's runtime spine — env-validated boot, long-poll update loop,
  `/start` round-trip, and the internal `/health` liveness probe. The shared skeleton every later
  capability plugs into.

### Modified Capabilities
<!-- none — greenfield, no existing specs -->

## Impact

- **New code:** `src/index.ts` (entrypoint), `src/bot/` (grammY instance + `/start` handler +
  `/health` server), `src/config/` (zod env schema). New `Dockerfile`, `.dockerignore`,
  `.github/workflows/ci.yml` GHCR build/push job, `npm run dev`/`build` scripts in `package.json`.
- **Dependencies:** adds `grammy`, `zod` (runtime); `typescript` build. No Prisma/Anthropic/Notion
  wiring yet (later changes) — but `ANTHROPIC_API_KEY`/`DATABASE_URL` are validated as present.
- **Invariants touched:**
  - #7 **memory caps + build-off-box** — central to this change: multi-stage image, CI→GHCR,
    Coolify only pulls. Idle long-poll RSS ~60–100 MB, well under the 512 MB bot cap. **No
    `npm install`/`tsc` on the host.**
  - #9 **secrets in env only** — zod schema reads from env; no secret in repo or DB.
  - #5 **no agent loop** — no LLM call in this change; the structure introduces no loop. (Anthropic
    client lands in `router`.)
- **Memory/cost:** memory impact minimal (skeleton only). **Zero LLM cost** — no model call in the
  tracer bullet.
- **Deploy:** first image push makes `provision`'s GHCR pull live; per the runbook the GHCR public
  toggle (path A) happens on this first push.
