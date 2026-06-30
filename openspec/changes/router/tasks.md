## 1. LLM client (src/llm)

- [x] 1.1 Added `@anthropic-ai/sdk`. `src/llm/client.ts`: `createAnthropicClient(apiKey)` (key from
  validated config; no network at construction).
- [x] 1.2 `src/llm/systemPrefix.ts`: stable system prefix as a cached block
  (`cache_control: { type: "ephemeral" }`). Voice deferred to `coach-persona` — seam only.
- [x] 1.3 `src/llm/structured.ts`: `parseStructured` — ONE `messages.create` call,
  `model: "claude-sonnet-4-6"`, `temperature: 0`, `output_config.format` (JSON schema from the zod
  schema via `zod-to-json-schema`; auto-parse helper avoided — SDK 0.107's needs zod v4, we pin v3),
  client-side `schema.parse`. No tool loop (#5).

## 2. Router (src/router)

- [x] 2.1 `src/router/schema.ts`: zod `intent` enum + `date` token + optional fields. English (#6).
- [x] 2.2 `src/router/date.ts`: pure `resolveDate(token, userTz, now)` via `Intl`; `yesterday` =
  user-local today − 1 day; explicit `YYYY-MM-DD` passes through. No LLM call.
- [x] 2.3 `src/router/router.ts`: `classifyMessage(client, text, { userTz, now? })` → one classify
  call (current message only — #1), date resolved in code, returns `{ intent, ...fields, date }`.

## 3. Bot wiring (bot-runtime delta)

- [x] 3.1 `src/bot/bot.ts`: `handleText` routes non-command text through `classifyMessage` and replies
  with the intent + resolved date; leading-`/` messages are skipped (commands bypass the router).
  `createBot(token, deps)` now takes the LLM client + userTz; `index.ts` wires them.

## 4. Eval framework (ADR-0013)

- [x] 4.1 `evals/datasets/router-intent.jsonl`: 18 labeled cases across all six intents + RU/UA/EN.
- [x] 4.2 `evals/run.ts` + `npm run evals` (`tsx`): real classify at temp 0, graded by
  `evals/grade.ts` (exact enum + accuracy), writes `evals/results/latest.json` (gitignored).
- [x] 4.3 `scripts/check-eval-ratchet.mjs` + `npm run check:evals`: key-less compare to
  `quality/eval-baseline.json` (committed `{}`); fail on regression; graceful skip when latest
  absent.
- [x] 4.4 CI `Eval ratchet` step (key-less) added; `evals`/`check:evals` documented in AGENTS.md.

## 5. Verification (tests for touched invariants)

- [x] 5.1 Test (#5 no agent loop): classify issues exactly one `messages.create` (mocked client).
- [x] 5.2 Test (#1 no chat history): built params carry exactly one user message + `temperature: 0`.
- [x] 5.3 Test (date back-dating): `resolveDate` yesterday/today/explicit + TZ-near-midnight.
- [x] 5.4 Test: system prefix block carries `cache_control: { type: "ephemeral" }`.
- [x] 5.5 Test: `check-eval-ratchet.mjs` fails on a synthetic regression and skips gracefully with no
  `latest.json` (fixtures via `execFileSync`; key-less). Plus a bot-routing + command-skip test.

## 6. Evals gate (first run)

- [ ] 6.1 **SKIPPED in this environment (logged):** the live `npm run evals` needs `ANTHROPIC_API_KEY`
  + egress to `api.anthropic.com`, neither available in this sandbox (TLS-intercepted, as with the
  Prisma engine download). The runner + ratchet land and unit-test green; baseline is committed `{}`.
  Run `npm run evals` locally with a key to seed real scores, then ratchet.

## 7. Gates

- [x] 7.1 Local gates green: lint, format:check, typecheck, test (30 passing), build, docs:check;
  `check:evals` skips gracefully. (Fallow still deferred — ADR-0011.)

## 8. Review (maker ≠ checker)

- [x] 8.1 Handed the diff to SEPARATE reviewer subagents (Standards + Spec, parallel, fresh). No HARD
  violations / no scope creep. Resolved: Standards — guard clause in `structured.ts` (no `JSON.parse('')`
  on empty/refusal output), added `test/llm/structured.test.ts` + `test/evals/grade.test.ts` (rule 11
  mirrors); Spec — `answer` now excluded from the enum unless a question is pending
  (`makeRouterSchema` + `test/router/schema.test.ts`), strip `$schema` from the generated JSON schema
  (400 risk), synced design.md to the actual structured-output approach (zod v3 → zod-to-json-schema)
  and softened the proposal's eval-gate wording (baseline seeds on first local run, ADR-0013). 37 tests
  green. Live structured-output + eval run remain deploy-time (no key/egress in sandbox).
