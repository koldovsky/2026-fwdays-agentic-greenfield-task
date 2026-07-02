# Runbook — Hardening verification (backlog item `hardening`, M8)

The M8 exit bar is **"all PRD [§4](../prd.md) success metrics (M1–M8) verified"**. Verification
splits in two, by design (change `hardening`, [design.md](../../openspec/changes/hardening/design.md)
§Context):

- **Sandbox (now):** code hooks + automated tests that ship WITH this change. Runnable with no
  external creds.
- **Deploy-time (on-box):** anything needing the real `ANTHROPIC_API_KEY`, `DATABASE_URL`, the
  Hetzner box, or live Telegram. The sandbox has none of these — these rows follow the
  **skip-with-note** pattern every prior change used for deploy-time gates
  ([ADR-0013](../adr/0013-eval-framework.md), the Notion round-trip in
  [ADR-0022](../adr/0022-notion-mirror-outbox-poll-worker.md)). Run them at the next deploy and record
  the evidence.

Resilience posture rationale: [ADR-0023](../adr/0023-runtime-resilience-crash-restart-bounded-retry.md).

## Metric checklist

| # | Metric (target) | Where | Procedure | Evidence |
|---|---|---|---|---|
| **M1** | Logging friction — ≥90% meals logged in one message | **Deploy-time** | Live eval suite (router + food) at temp 0 against the seeded baseline; needs the API key. Sandbox: `npm run evals` skips with note (no key). | `results/latest.json` vs `quality/eval-baseline.json` (single-message-log rate); `npm run check:evals` ratchet green in CI. |
| **M2** | Macro accuracy — Food DB exact; estimates ±20–30% | **Deploy-time** (accuracy) + sandbox (tagging) | Sandbox: unit tests assert catalog match → `source=fact`, miss → `source=estimate` (`test/food/**`). Live estimate accuracy needs the key → eval suite. | Food-tagging tests green (`npm test`); eval accuracy rows in `results/latest.json` (deploy-time). |
| **M3** | Number integrity — 0 totals disagreeing with DB SUM | **Sandbox** | `npm test` — totals-from-SUM suites (`test/reviews/**`, `test/query/**`); the LLM writes prose only, never numbers (invariant #2). | Totals==SUM tests green; no hand-summed number path in the diff. |
| **M4** | Review reliability — 100% of days reviewed, no doubles | **Sandbox** | `npm test` — scheduler idempotency + per-user-TZ + outer-query-guard suites (`test/reviews/scheduler.test.ts`); the unique key + upsert prevent doubles, the outer guard prevents a crashing tick. | Scheduler tests green incl. "transient outer-query failure is caught, not an unhandled rejection". |
| **M5** | Cost — Anthropic spend ≤ $3/month | **Sandbox** (hook) + **deploy-time** (real spend) | Sandbox: `test/llm/structured.test.ts` proves exactly one `[llm]` usage line per call with token counts. On-box: `grep '\[llm\]'` the container logs → sum `in`/`out` tokens over a day × model price; cross-check the Anthropic console. | Per-call usage line emitted (test); daily token sum from logs + console invoice (deploy-time). |
| **M6** | Footprint — bot RSS ≤512 MB, PG ≤256 MB, mysqld never OOM | **Deploy-time** | `curl http://<internal>:$PORT/health` → read `rssMb`/`heapUsedMb`; corroborate with `docker stats` on the bot + PG containers; confirm the crypto-bot `mysqld` is alive (`docker ps`, no OOM in `dmesg`). Sandbox: `test/bot/health.test.ts` proves the JSON shape + numeric fields. | Health-JSON tests green (sandbox); `rssMb` < 512 and PG < 256 from `/health` + `docker stats` (deploy-time). |
| **M7** | Reply latency — text <3s, photo <8s (p90) | **Deploy-time** | On-box: read `ms=` from the `[llm]` usage lines for the LLM leg; sample end-to-end reply time over a day of real messages for the p90. Sandbox: the `ms=` field is asserted present (`test/llm/structured.test.ts`). | `ms=` field present (test); p90 text/photo reply from log timestamps + LLM `ms` (deploy-time). |
| **M8** | Durability — 0 logged entries lost; mirror failures never lose data | **Sandbox** (posture) + **deploy-time** (live) | Sandbox: `test/lifecycle.test.ts` (fatal handler exits non-zero; shutdown stops the cron first), `test/bot/bot.test.ts` (boundary swallows + survives), Notion outbox tests (crash window tolerated, ADR-0022). On-box: kill the container mid-session → confirm the committed food entry survives restart and Telegram redelivers the unacked update. | Lifecycle + boundary + outbox tests green (sandbox); post-restart entry present + update redelivered (deploy-time). |

## Deploy-time steps (enumerated — run at next deploy)

1. **Seed eval baselines (M1/M2).** With `ANTHROPIC_API_KEY` set: `npm run evals`, review
   `results/latest.json`, commit the accepted baseline to `quality/eval-baseline.json`. CI's
   `npm run check:evals` then ratchets key-lessly.
2. **Memory (M6).** Deploy; `curl` the internal `/health` and read `rssMb`/`heapUsedMb`; run
   `docker stats` for the bot and PG containers under a realistic day; confirm `mysqld` is alive and
   no OOM-killer entries in `dmesg`. Bot < 512 MB, PG < 256 MB.
3. **Cost + latency (M5/M7).** Let the bot run a normal day. `grep '\[llm\]'` the logs: sum
   `in`/`out` tokens (× model price → monthly projection vs $3), read `ms=` for the LLM-leg latency,
   and sample end-to-end reply times for the text/photo p90.
4. **Durability (M8).** Mid-session, `docker kill` the bot container. After Coolify restarts it:
   confirm a food entry whose confirmation you saw is present in Postgres, and that an update sent
   during the down window is redelivered on the next long-poll. Confirm the 429 path by observing an
   `auto-retry` delay under load (or a `retry_after` log) rather than a dropped send.

> The sandbox has no `ANTHROPIC_API_KEY`, no `DATABASE_URL`, and no box, so steps 1–4 are **skipped
> with this note** in the implementation loop and executed at deploy. The code hooks and tests that
> make them verifiable ship in this change.
