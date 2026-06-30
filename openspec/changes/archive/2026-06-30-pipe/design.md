## Context

Greenfield repo: only `docs/` + tooling (ESLint/Prettier/Vitest, husky hooks, docs:check) exist;
no `src/`. `provision` (M0, manual) is done — the Coolify project, capped Postgres, env/secrets, and
GHCR pull access are in place. This change lays the runnable spine all later capabilities plug into,
and proves the deploy chain once. Constraints: RAM-tight host (bot ≤512 MB, co-resident Postgres
≤256 MB + another project's mysqld), build strictly off-box (CI → GHCR; Coolify pulls), secrets in
env only. Delivery is long-poll ([ADR-0014](../../../docs/adr/0014-long-polling-over-webhook.md)),
chosen because the free `sslip.io` URL can't get valid TLS for a webhook.

## Goals / Non-Goals

**Goals:**
- A deployed bot where a `/start` message round-trips (Telegram → bot → Telegram).
- Folder-discipline skeleton (`src/bot/`, `src/config/`, entrypoint) per requirements §4 that later
  changes extend without restructuring.
- zod env validation that fails fast and boots without the optional `NOTION_*`.
- Multi-stage Dockerfile + CI→GHCR + Coolify deploy; wire deferred `typecheck` + Fallow steps.

**Non-Goals:**
- No Prisma/DB access (that is `data`), no Anthropic client or any LLM call (that is `router`), no
  Notion (M7). `ANTHROPIC_API_KEY`/`DATABASE_URL` are only *validated present*, not *used*.
- No webhook, no public ingress, no TLS/domain (ADR-0014).
- No feature logic beyond the `/start` echo and `/health` probe.

## Decisions

- **grammY long-poll via `bot.start()`** over webhook — per ADR-0014 (TLS blocker on `sslip.io`;
  single-user low traffic makes polling cost irrelevant). Handlers are webhook-portable if a domain
  appears later. No `setWebhook`, no `TELEGRAM_WEBHOOK_SECRET`.
- **`/health` as a bare `node:http` server**, not a web framework — one route, a few lines, keeps RSS
  minimal (no Express/Fastify dependency). It binds `PORT` for Coolify liveness only; Telegram
  delivery is the separate outbound poll, so the port carries no update traffic and is not public.
- **zod env schema in `config/`, validated at process start before any I/O.** Required:
  `TELEGRAM_BOT_TOKEN`, `DATABASE_URL`, `PORT` (default `3000`), `ANTHROPIC_API_KEY`. Optional:
  `NOTION_TOKEN`, `NOTION_*` ids, `TZ`. Parse once into a typed, frozen config object the rest of the
  app imports — fail-fast with the offending key named. Rationale: a half-configured bot should never
  reach Telegram; naming the key keeps deploy debugging cheap.
- **Multi-stage Dockerfile** (builder: install + `tsc` → dist; runtime: slim node, prod deps only,
  non-root). Image built in CI and pushed to GHCR; Coolify pulls. **No build step ever runs on the
  host** (invariant #7). First push flips the GHCR public toggle (runbook path A) so Coolify can pull.
- **CI wires `typecheck` + Fallow now** that `src/` exists — previously deferred (AGENTS.md). Same
  gates run locally (authoritative per ADR-0012); CI adds only the off-box image build.
- **No ADR needed** — this change *implements* existing decisions (ADR-0014 delivery, ADR-0006
  build-off-box, requirements §4 structure); it introduces no new or reversed architectural decision.

**No LLM call in this change.** The Anthropic client, single-deterministic-call discipline, and the
prompt-cached stable system prefix land in `router`; `pipe` introduces no model call and no agent
loop, so there is nothing to cache or justify here.

## Risks / Trade-offs

- **[GHCR pull not yet public on first deploy]** → first image push performs the runbook path-A
  public toggle; verify Coolify can pull before declaring the round-trip done.
- **[Env drift between zod schema and AGENTS.md table]** → schema is the single source; sync the
  AGENTS.md Environment section in the docs gate if names differ.
- **[Long-poll holds one outbound connection]** → negligible CPU/RAM at one user; idle grammY
  ~60–100 MB RSS, well inside the 512 MB cap (requirements §4). No mitigation needed.
- **[Single instance only]** — two concurrent pollers would double-consume `getUpdates`. Coolify
  runs one replica; document it, revisit only if scaled.

## Migration Plan

1. Land skeleton + Dockerfile + CI locally; gates green (lint/format/typecheck/test/fallow).
2. Push branch → CI builds image → GHCR (first push toggles GHCR public, path A).
3. Coolify pulls + runs the image with env set in `provision`.
4. Confirm `/health` returns 200 (Coolify healthcheck green) and `/start` round-trips.
- **Rollback:** Coolify redeploys the previous image tag; no schema/state to revert (no DB writes
  in this change).

## Open Questions

- None blocking. (Container memory limit value in Coolify is set during `provision`; verified against
  the cap in the `hardening` milestone, not here.)
