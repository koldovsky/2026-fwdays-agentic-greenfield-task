# Current state — Kolo360

> Working-memory handoff between sessions. Read this first; update it after any
> meaningful change. Short and current — overwrite stale lines, don't append a log.

**Last action:** 2026-06-28 — completed `usage-accounting` slice (FR-USAGE-01, FR-USAGE-03),
archived (`archive/2026-06-28-add-usage-accounting`). `UsageRow` Prisma model + `UsagePurpose`
enum, migration `add-usage-row`; `lib/ai/record-usage.ts` (server-only, validates with
`recordUsageInputSchema`, computes `costUsd = cost(...)` at write time, throws on failure — never
swallows); `app/(cabinet)/usage/page.tsx` (spend view: grand total + per-cycle + BreakdownTable by
model×purpose, EmptyState + ErrorState); `lib/nav` + `nav-icons` extended with `usage` entry.
9 new unit tests (record-usage.test.ts). 237 tests total. 3 findings deferred to security backlog
(SEC-BL-08 float precision, SEC-BL-09 single-layer auth, SEC-BL-10 cycleId ownership).

**Last action:** 2026-06-29 — post-demo fix batch (6 items), 309 tests + lint/tsc/build green,
NOT yet committed (AI slices commit `91dea7f` is in; this batch is uncommitted):
1. AI-interview chat input now shows a hint/example (placeholder + helper line).
2. Form completion screen made a clear centered calm "thank you" (FR-FORM-04), no exclamation.
3. **Delete cycle (FR-CYCLE-06, new — added to PRD + cycles spec):** HR-only `deleteCycle` action
   (cascade via schema onDelete), confirm `Dialog`, redirect to list. P2025 → idempotent success.
4. **Deadline off-by-one bug fixed:** `daysRemaining`/`deriveStatus` now count whole CALENDAR days,
   deadline-day INCLUSIVE (a "tomorrow" deadline no longer floors to 0 and reads "Прострочено").
   `formatDaysRemaining` gained a `todayLabel` (0 days = "Сьогодні останній день", only <0 overdue).
5. **Report grounding too strict bug fixed:** policy changed (report spec FR-REPORT-02 updated) from
   "one bad quote rejects the whole summary" → `pruneUngroundedQuotes` drops ungrounded quotes,
   keeps the report; summariser prompt now forbids quoting scale answers + demands verbatim.
6. **Form ended before a trailing OPTIONAL question:** FormFlow now walks ALL questions
   (findResumeIndex), completes only at the end; `saveAnswer` accepts answers on a `done` cycle
   (form is forward-only, no edits) so the optional tail is reachable. (Q5 stays optional — not
   counted toward required progress, by design.)

Earlier: manual AI slices ALL DONE + reviewed: `ai-interview`, `results`, `report` (commit
`91dea7f`). Set `ANTHROPIC_API_KEY` in `.env.local` for live interview/summary + `npm run eval:ai`.

**results (FR-PROGRESS-01..03) — DONE (manual), reviewed clean.** Pure `lib/cycles/progress.ts`
(answered = required questions with a VALID answer — fixes `listCycles`' old raw `_count` bug that
would miscount optional + insufficient rows). Cycle detail rewritten: live `LiveProgress` (polls
`/api/cycles/[id]/progress` every 5s, no sockets), per-question answers (ScaleDots + numeral / full
open text / explicit unanswered + insufficient note), on-demand raw dialog (`QuestionDialog` →
`/api/cycles/[id]/dialog`, AI-answered only). Both API routes re-check HR session (401) + calm 404.
Ported `components/data/{ProgressBar,ScaleDots}`.

**report (FR-REPORT-01..04) — DONE (manual, Opus), reviewed clean.** `lib/ai/summary/`: pure quote
normalisation (NFC+collapse+case-sensitive) + `validateSummaryGrounding` (every quote attributed by
snapshot questionId AND verbatim in that open answer, else not persisted); `summarise` (Opus,
structured tool output, Zod-validated). `draftSummary` action: HR-auth, done-only, in-process
single-flight + `Summary.cycleId` unique + P2002 → at most one model call/one summary; data-min
prompt; usage recorded (purpose summary). `ReportSection`: Draft button w/ inline progress →
read-only typeset serif render. SEC-BL note: cross-instance single-flight deferred.

**ai-interview (FR-AI-01..09) — DONE (manual, Opus), reviewed.** Server-side streamed chat at
`/respond/[token]/interview` (Node Route Handler, no WebSockets). Architecture: a cheap haiku
**judge** (structured tool output, Zod-validated) decides `addressesQuestion`/`scaleCandidate`;
pure `decideTurn` (lib/ai/interview/) applies the follow-up cap (default 2) → record / followup /
capped-out insufficient row; sonnet **interviewer** streams the Ukrainian reply. Pure modules
(scale mapping, transcript traversal, turn machine) unit-tested (38 tests). `Answer.insufficient`
flag added (migration `add_answer_insufficient`). Data minimisation: only questions + transcript +
first name reach the model. Injection-resistant system prompt + offline guard test + gated live
`npm run eval:ai` (`*.eval.test.ts`, excluded from `npm test`). Graceful degradation → calm retry +
`fallbackToForm` (interview→form, answers preserved in the shared Answer model). ModeStub deleted
(form + interview both real now). Independent review: 2 findings fixed (prompt name label), 1 by
design (capped required → cycle stays collecting, FR-CYCLE-04); SEC-BL-11/12 logged. 275 tests,
build green. NOT yet committed.

**Earlier:** completed `respond` slice (FR-RESP-01..03), archived.

**Earlier:** **onboarded Project Factory loop** (`/project-factory:onboard
--no-reverse`, Claude adapter only). Installed: 11 agents → `.claude/agents/`, 6 workflows →
`.claude/workflows/`, `check-*`/`gate-status`/`qa-verify`/`record-demos` scripts, git hooks
(`.githooks/` + `core.hooksPath`, verified firing), Claude Code ESLint hook → `.claude/settings.json`,
CI → `.github/workflows/ci.yml`, package.json `check:*`/`qa:*`/`gate:*` scripts, ADR-0001 (stack) +
ADR-0002 (context arch), `.project-factory/retrofit.json` (3 pre-loop slices flagged retrofitted).
Non-destructive: no existing code touched.

**Phase 2 baseline specs — DONE (traceability gate now GREEN).** Ran `spec-pipeline` (11
spec-writers + critique/revise + cross-capability coverage check) → authored baseline OpenSpec
specs for every remaining MVP capability: `cabinet-shell` (FR-SHELL-01..03), `directory` (FR-DIR),
`templates` (FR-TPL), `cycles` (FR-CYCLE), `link` (FR-LINK), `respond` (FR-RESP), `form` (FR-FORM),
`ai-interview` (FR-AI-01..09), `results` (FR-PROGRESS), `report` (FR-REPORT), `usage-accounting`
(FR-USAGE-01/03 only; 02/04 stay with `token-cost-calculation`). `check-traceability.mjs` → **0
failures** (50 MVP FRs; 100 warnings = missing test-traces/recordings, expected pre-build).
`openspec validate --all --strict` → 14/14. Fixed one cross-check contradiction: the cycle `done`
predicate now defers everywhere to the canonical rule in `cycles` (FR-CYCLE-04: required questions
answered); `ai-interview` no longer redefined it.

**Gates:** G0/G2/G4/G7/G8 PASS, G5 SKIP (coverage), G1/G3 need human sign-off. CI template still
needs adaptation before green (`BETTER_AUTH_SECRET`→`AUTH_JWT_SECRET`; no `test:integration`/`test:e2e` yet).

**Phase 4 build (orchestrated).** Mechanical slices run autonomously with the full gated loop
(spec → red test → implement → review-gate maker≠checker → trajectory → archive, one Slice:/Refs:
commit). STOP before `ai-interview` and `report` (manual). `results` (FR-PROGRESS) depends on
ai-interview → deferred until after the manual slices.

- **cabinet-shell (FR-SHELL-01..03) — DONE, archived** (`archive/2026-06-28-add-cabinet-shell`).
  Cabinet route group + sidebar/sticky header, sidebar-free respondent shell, canonical
  empty/loading/error state components, pure `lib/nav` + `lib/http/auth-redirect` (unit-tested),
  server-only `app/(cabinet)/current-user.ts`, proxy same-request cookie forwarding. 3 review-gate
  rounds, clean evidence. 45 tests. Deferred security findings → `docs/qa/security-backlog.md`
  (SEC-BL-01..04: sign-in rate limit, proxy revoked-user check, dep advisories, sign-out CSRF).
- **directory (FR-DIR-01..04) — DONE, archived** (`archive/2026-06-28-add-directory`). Canonical
  `lib/schemas/employee.ts` (Zod, exact field rules, lowercased email, `toFieldErrors`) shared by
  on-blur client + server-action boundary; create/update/archive actions (typed result, P2002→email,
  HR-session assert, soft archive); `/employees` list + add/edit form + empty/loading/error; shared
  `components/forms/{Input,Field,Button}`. 2 review rounds, clean. 64 tests.
- **cabinet-shell RSC bugfix** (`6c4807c`): server Sidebar was passing a Lucide component fn to the
  client NavItem → runtime 500 on /cycles+/employees (build+static review missed it). Now only the
  string `navKey` crosses; nav-icons returns a JSX element. `tsconfig.tsbuildinfo` untracked. LESSON:
  add an RSC server→client serialization check to review focus; rely on Phase 6 runtime/vision for UI.
- **templates (FR-TPL-01..03) — DONE, archived** (`archive/2026-06-28-add-templates`). Canonical
  `lib/schemas/template.ts` (strict integer anchors, scale/open refine, unique+contiguous order;
  exported `scaleAnchorsSchema`/`questionRowSchema` reused on DB read), `lib/templates/orderedQuestions`,
  two seeded templates with stable ids via idempotent `scripts/seed-templates.mts` (deleteMany stale +
  upsert by id), read-only `/templates` list + `/templates/[id]` preview. 1 review round, clean. 104 tests.
- **cycles (FR-CYCLE-01..05) — DONE, archived** (`archive/2026-06-28-add-cycles`). Atomic
  create-and-launch (schema-driven: no draft status); pure `lib/cycles/{link-token,snapshot,status}.ts`
  + `lib/schemas/cycle.ts` (all red-first unit-tested); `createCycle` server action (Zod boundary,
  P2002 retry OUTSIDE transaction, HR session guard); /cycles list + create form + /cycles/[id] detail;
  `lib/i18n/format.ts` formatDaysRemaining with correct Ukrainian plural. 2 review rounds, 9 confirmed
  findings fixed (critical: P2002 retry loop, UA plurals, empty state, loading.tsx). 149 tests.
- **link (FR-LINK-01..03) — DONE, archived** (`archive/2026-06-28-add-link`). Public
  `/respond/[token]` server component (no auth, token-gated only); `getRespondentCycleByToken`
  in `app/respond/[token]/queries.ts` reads persisted `status` directly (not re-derived from
  deadline); `tokenBoundarySchema` validated before any DB call (same calm not-found page for
  malformed and unknown tokens — no oracle); `CopyLinkButton` client component on cycle detail
  page. 1 review round (code/spec-compliance/security in parallel), 4 confirmed findings fixed
  (missing server log on broken snapshot, setTimeout leak on unmount, missing schemas.test.ts,
  missing `server-only` guard on cabinet cycles/queries.ts). 167 tests. 3 findings deferred to
  `docs/qa/security-backlog.md` (SEC-BL-05..07: cabinet IDOR — no HR-user scoping, token in RSC
  payload, first-name-to-token linkage — all accepted/moot for single-HR-account MVP).
- **respond (FR-RESP-01..03) — DONE, archived** (`archive/2026-06-28-add-respond`). Mode-choice
  gate added to the `link` slice's respondent page: `Cycle.mode` unset → `ModeChoice` (intro +
  confidentiality note + two buttons, no question preview); set → `ModeStub` (explicit
  placeholder, flagged for wholesale replacement by `form`/`ai-interview`). `chooseMode` server
  action persists the choice race-safely via `db.cycle.updateMany({ where: { mode: null, status:
  "collecting" }, ... })` — first-write-wins, loser re-reads and reports the winner's mode, never
  a conflict error. Shared answer-write contract `lib/schemas/answer.ts` (open/scale Zod schemas,
  `isValidAnchorValue`) defined for `form`/`ai-interview` to import — no write in this slice. 1
  review round (3 parallel reviewers), 4 confirmed findings fixed (ModeChoice was hiding the
  entire intro not just the question preview; non-collecting cycle reused the generic
  write-failure message instead of a dedicated "closed" message; `questionId` had no upper
  bound; TOCTOU on the conditional write's WHERE clause). 198 tests.
- **form (FR-FORM-01..04) — DONE, archived** (`archive/2026-06-28-add-form`). One-question-
  per-screen: `FormFlow.tsx` (sequential `currentIndex` + `findResumeIndex` for resume),
  `ScaleAnswerField.tsx`, `OpenAnswerField.tsx`, `saveAnswer` action (`form-actions.ts`),
  `lib/cycles/resume.ts`. 3 review-gate findings fixed (mode guard, as-casts, TOCTOU). 228 tests.
- **usage-accounting (FR-USAGE-01, FR-USAGE-03) — DONE, archived**
  (`archive/2026-06-28-add-usage-accounting`). `UsageRow` model + migration; `recordUsage`
  server-only helper; `/usage` spend view; nav entry. 9 new tests (237 total). 3 deferred
  security findings (SEC-BL-08..10).
- Build-cache caveat: do NOT run `npm run build`/qa battery while a `next dev` server is live — the
  concurrent `.next` writes corrupt the dev cache (clear with `rm -rf .next`).

Process note: review-gate must be invoked with HARDCODED args in its persisted scriptPath (the
harness arg-passing bug drops `args`), and scoped to the committed slice diff (`baseRef HEAD~1`) so
it reviews only the slice, not the whole tree.

Soft cross-check notes to carry: NFR-PERF-01 unowned; NFR-DX-01 only cited by ai-interview though
repo-wide; token-generator (FR-CYCLE-02 / FR-LINK-02) needs one named `lib/` home when those build.

## Done so far

- Groundwork: `docs/requirements.md` (PRD), `product-brief.md`, `DESIGN.md` + in-app design
  system, `AGENTS.md`, OpenSpec, `docs/mvp-capability-plan.md`. (archived)
- **Slice `add-token-cost-calculator`** (archived) — pure `cost()` in `lib/ai/`, Zod usage
  schemas in `lib/schemas/usage.ts`, seed price table; `zod`+`vitest` infra, `@/` alias.
- **Slice `add-foundation`** (archived) — `prisma/schema.prisma` (9 models + 4 enums), shared
  `lib/db/` client, Prisma 7 adapter; Neon provisioned, migration `init` applied.
- **Slice `add-auth`** (FR-AUTH-01..05; reviewed + archived; spec → `openspec/specs/auth/`) — credentials in `HrUser`; pure
  `lib/auth/{tokens,password,redirect,cookies}.ts` (+ tests) and DB-backed `session.ts`;
  `lib/schemas/auth.ts` + lazy `lib/env.ts` (only `AUTH_JWT_SECRET` in env); `proxy.ts` guard +
  transparent refresh; `app/sign-in/` (server action + client form) and `app/api/auth/sign-out`;
  `lib/i18n/{uk,en}.ts`; `scripts/{hash-password,create-hr-user}.mts`; migration `add_auth_tables`.
  Added `jose`; `tsconfig` got `allowImportingTsExtensions` (for `.mts` scripts). 32 tests.

## Next step

Manual AI slices (Opus, by hand — not the factory): `ai-interview`, `results`, `report` — ALL DONE
+ independently reviewed (see top). All MVP FRs now built.

Next: (1) commit the three AI slices (one branch is fine; commit-msg hook needs a `Refs:`/`Slice:`
trailer); (2) set `ANTHROPIC_API_KEY` and smoke-test the interview + summary live + `npm run
eval:ai`; (3) PR prep — confirm changed-file count under CodeRabbit's cap (`.coderabbit.yaml`
path_filters), PR description with homework proofs (real name, 1–2 min video, practices).

## Open questions / blockers

- None. (Deferred to Future: real email delivery via Resend, Telegram channel, full
  360° multi-reviewer, AWS self-hosting.)
