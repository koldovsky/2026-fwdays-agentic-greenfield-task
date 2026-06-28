# Current state — Kolo360

> Working-memory handoff between sessions. Read this first; update it after any
> meaningful change. Short and current — overwrite stale lines, don't append a log.

**Last action:** 2026-06-28 — completed `form` slice (FR-FORM-01..04), archived
(`archive/2026-06-28-add-form`). One-question-per-screen form UI: `FormFlow.tsx` (sequential
`currentIndex`, `findResumeIndex` for all-questions resume, `hydratedQuestionId` re-hydration
pattern), `ScaleAnswerField.tsx`, `OpenAnswerField.tsx`, `saveAnswer` server action
(`form-actions.ts`), `lib/cycles/resume.ts` (`firstUnansweredRequiredQuestion`). Review-gate
found 3 confirmed findings (all fixed): missing mode guard on `saveAnswer` (interview-mode
write blocked), `as`-casts replaced with type narrowing, TOCTOU done-transition hardened via
`updateMany`. 228 tests. 3 deferred to security backlog (rate limit, ARIA radiogroup,
savedAnswers RSC payload).

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
- Next: `usage-accounting` (FR-USAGE-01, FR-USAGE-03). `generateCycleToken` in
  `lib/cycles/link-token.ts` is the one shared home. `lib/schemas/answer.ts` is the shared
  answer-write contract `form`/`ai-interview` MUST import. `results` (FR-PROGRESS) waits on
  ai-interview (manual).
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

1. Next slice: `cabinet-shell` (FR-SHELL-01..03 — sidebar + sticky header + respondent shell),
   rendered inside the now-protected area. Reuses `lib/i18n` and the session/cookie helpers.
   Propose via `/opsx:propose`, then `/opsx:apply`.
2. Carry-over nits from the add-auth review (archived tasks.md 7.3): #3 make guarded `/api/*`
   return 401 JSON (not a redirect) when those routes land; #5 revisit CSRF token. Address when
   the cabinet slice adds routes/APIs behind the guard.
3. Set `AUTH_JWT_SECRET` in env per environment; provision the HR account with
   `node scripts/create-hr-user.mts <email> "<password>" ["Name"]`. `DATABASE_URL`/`DIRECT_URL`
   already in `.env.local`. (A test row `test.user@test.com` exists in Neon — drop before prod.)

## Open questions / blockers

- None. (Deferred to Future: real email delivery via Resend, Telegram channel, full
  360° multi-reviewer, AWS self-hosting.)
