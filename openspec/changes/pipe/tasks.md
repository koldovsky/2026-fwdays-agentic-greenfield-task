## 1. Project scaffold & dependencies

- [x] 1.1 Add runtime deps (`grammy`, `zod`) and confirm `typescript` build dep; `tsconfig.json`
  already strict/NodeNext/`rootDir: src` — added `tsconfig.build.json` (excludes `*.test.ts`) for
  the dist build.
- [x] 1.2 Add `npm run dev` (`tsx watch`), `npm run build` (`tsc -p tsconfig.build.json`), and
  `npm start` scripts; `typecheck` now has `src/` inputs.
- [x] 1.3 Create `src/` skeleton per requirements §4: `src/bot/`, `src/config/`, `src/index.ts`
  (other domain folders deferred to their changes).

## 2. Config (zod env validation)

- [x] 2.1 `src/config/env.ts`: zod schema — required `TELEGRAM_BOT_TOKEN`, `DATABASE_URL`,
  `ANTHROPIC_API_KEY`, `PORT` (coerce, default `3000`); optional `NOTION_*`, `TZ` (default
  `Europe/Kyiv`). `loadEnv()` parses once → frozen typed config, throws `EnvValidationError` naming
  offending keys; entrypoint logs + `process.exit(1)`.
- [x] 2.2 Confirmed no secret is read from anywhere but `process.env` (invariant #9) — no secret
  defaults, no DB/file reads.

## 3. Bot runtime (long-poll + /start)

- [x] 3.1 `src/bot/bot.ts`: `createBot(token)` builds the grammY `Bot`; `/start` → `handleStart`
  replies in the same chat (round-trip ack). Handler extracted for unit testing.
- [x] 3.2 `src/index.ts`: load env (exit non-zero on failure) → start `/health` server →
  `bot.start()` (long-poll, no `setWebhook`, ADR-0014). SIGINT/SIGTERM → `bot.stop()` + close health.

## 4. Health probe

- [x] 4.1 `src/bot/health.ts`: bare `node:http` server; `GET /health` → `200 ok`, else `404`.
  Internal only — not used for Telegram delivery. Listener extracted for testing.

## 5. Containerization & CI/CD

- [x] 5.1 Multi-stage `Dockerfile` (builder: `npm ci` + `tsc`; runtime: `--omit=dev`, non-root
  `node` user, `node dist/index.js`) + `.dockerignore`.
- [x] 5.2 `.github/workflows/ci.yml`: added **typecheck** step; added a `build → push to GHCR` job
  (push to `main` only). No build step targets the production host (invariant #7).
  **Fallow deferred:** ADR-0011 status is "implementation deferred to M0", but the binary is not
  installed/wired — wiring a new static-analysis tool is out of scope for the tracer bullet. Logged
  skip; revisit in a dedicated change (kept ADR-0011 as-is).
- [ ] 5.3 **Deploy-time (human):** confirm Coolify pulls the first GHCR image (first push toggles
  GHCR public, runbook path A) and runs it with `provision` env. Cannot be done in-session.

## 6. Verification (tests for touched invariants)

- [x] 6.1 Test (#9 env / fail-fast): rejects missing required vars naming them; `PORT` defaults
  `3000` + coerces; boots with `NOTION_*` absent; returns frozen config. (`src/config/env.test.ts`)
- [x] 6.2 Test: `/start` handler replies to the same chat (stubbed ctx). (`src/bot/bot.test.ts`)
- [x] 6.3 Test: `/health` returns `200 ok`, `404` otherwise (live server, port 0).
  (`src/bot/health.test.ts`)
- [ ] 6.4 **Deploy-time (human):** a real `/start` round-trips through the deployed bot; Coolify
  healthcheck green; idle RSS spot-checked < 512 MB (#7). Cannot be done in-session.
- [x] 6.5 Local gates green: `lint`, `format:check`, `typecheck`, `test` (9 passing), `build`,
  `docs:check`. (Fallow excluded — see 5.2.)

## 7. Review (maker ≠ checker)

- [x] 7.1 Handed the diff to SEPARATE reviewer subagents (Standards + Spec, parallel, fresh).
  Resolved: Standards HARD — top-level `function`→`const` arrow (rule 6) across all `src/`;
  Standards judgement — Dockerfile `NODE_OPTIONS=--max-old-space-size=384` (cap #7); Spec —
  CI now builds the image on PRs (push to GHCR still main-only) so a broken Dockerfile fails
  pre-merge; Spec minor — `TZ` synced into the spec env requirement. Re-ran gates green.
