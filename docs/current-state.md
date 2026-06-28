# Current state — Kolo360

> Working-memory handoff between sessions. Read this first; update it after any
> meaningful change. Short and current — overwrite stale lines, don't append a log.

**Last action:** 2026-06-28 — **onboarded Project Factory loop** (`/project-factory:onboard
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
- Next: `templates` → `cycles` → `link` → `respond` → `form` → `usage-accounting`.
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
