# Tasks: poc-polish-observability (S-08)

## 1. Structured logging (NFR-OBS-01)

- [x] 1.1 Logger factory (`createAppLogger(env)`): NestJS `ConsoleLogger`
      with `json: true` when `NODE_ENV=production`, default pretty logger
      otherwise (design D1); wire into `NestFactory.create` in `main.ts`;
      unit-test the factory's mode selection
- [x] 1.2 Request-logging middleware for `/api/*`: one entry per request on
      `res 'finish'` — method, `req.path` (no query string), status code,
      duration ms; skip SPA/static paths (design D2); unit tests assert the
      emitted fields as an exact allowlist (query string absent, no body
      fields) and cover 401 (guard rejection) and 404 (route miss) entries
- [x] 1.3 Error logging: test that an unhandled non-`HttpException` error
      yields a 500 plus a structured error log with stack via Nest's
      exceptions handler (design D3 — verify, don't rebuild)
- [x] 1.4 PII audit of existing `Logger` call sites (~7 files, design D4):
      confirm masked-phone/no-code idiom everywhere; fix any stragglers
- [x] 1.5 Smoke on locally built prod-mode app (`NODE_ENV=production`,
      real MySQL): request lines are single-line JSON, 401/404 requests
      logged, query string absent, OTP request leaves no phone in logs

## 2. End-to-end production pass (PRD §3.2 / §6)

- [x] 2.1 Deploy the slice to Railway via `railway up`; confirm health green
      and JSON request logs visible in `railway logs`
- [x] 2.2 Full happy-path §6 walk on prod with a real user and real SMS
      (user-assisted): registration → house → ticket with photo → executor +
      «В роботі» → notes → «Виконана» → «Закрита» → find via list
      filters/search; no manual interventions
- [x] 2.3 NFR-STOR-01 demo check: redeploy (`railway up` or restart), reopen
      the ticket — photo still renders (closes the deferred S-07 demo cell)
- [x] 2.4 Record every friction/paper-cut found during the pass as a list:
      each item is either a timeboxed polish fix (→ 3.x) or a POC-report
      finding — no new behavior either way

## 3. UX polish (timeboxed, within existing specs)

- [x] 3.1 Fix the accepted paper-cuts from 2.4, each within existing spec
      requirements, with a unit/e2e test where the fix is testable; re-run
      the affected e2e specs
- [x] 3.2 If the list is empty or everything was deferred to the report,
      note that explicitly (task closes either way)

## 4. Traceability 100% and POC report

- [x] 4.1 `docs/traceability-matrix.md`: fill the NFR-OBS-01 logs cell
      (spec `structured-logging` + tests + demo check); sweep all rows —
      no `—` cells left; bump changelog (v1.8, S-08 closed)
- [x] 4.2 Write `docs/poc-report.md` (Ukrainian): cycle metrics from
      `docs/cycles/S-01…S-08` (time, cost, iterations, defects), quality
      assessment (code, ADR discipline, UI), what agentic SDD did well/badly
      on this stack, requirement/methodology conclusions for the main
      project (PRD §3.3)

## 5. Slice DoD (fixed order, openspec/config.yaml)

- [x] 5.1 All task checkboxes above are `[x]`
- [x] 5.2 `npm run verify` passes
- [x] 5.3 Smoke test on a real DB done (covered by 1.5 — reference the run)
- [x] 5.4 Playwright e2e: full `nx e2e web-e2e` suite green as the S-08
      regression proof (no new UI behavior; add specs only for 3.1 fixes
      that changed testable UI behavior)
- [x] 5.5 Adversarial review by `slice-reviewer` (ADR-0010): freeze the
      range at an explicit end SHA, one pass over the slice diff;
      critical/high fixed + re-verify; medium/low dispositions logged
- [x] 5.6 Launch-and-look: run the app locally, walk the slice happy path
      (request logs appear, app unchanged for the user)
- [x] 5.7 `npx openspec validate poc-polish-observability --strict` pass;
      archive the change; `npx openspec list` empty; prettier over synced
      `openspec/specs/**/*.md`
- [x] 5.8 Update `docs/current-state.md` (phase: POC closed; done / next /
      blockers)
- [x] 5.9 Session retrospective via `/slice-retro` → `docs/cycles/S-08.md`
