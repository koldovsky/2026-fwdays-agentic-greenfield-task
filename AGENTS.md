<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Vouch

Vouch is a Ukrainian-first **Honest Resume Tailor** (Next.js app).

## Docs

Read the relevant doc in `docs/` before working in its area:

- [`docs/cv-agent-requirements.md`](docs/cv-agent-requirements.md) — PRD, the single source of truth. Numbered requirements (`FR-*` / `NFR-*` / `TC-*` / `BC-*`); cite IDs in specs, PRs, tests.
- [`docs/cv-agent-product-brief.md`](docs/cv-agent-product-brief.md) — business narrative behind the PRD (who/why, end-to-end usage, MVP boundary).
- [`docs/system-design.md`](docs/system-design.md) — architecture: Feature-Sliced Design frontend + async two-pass tailoring pipeline.
- [`docs/DESIGN.md`](docs/DESIGN.md) — design system: brand rules + how tokens/fonts are wired into the app.
- [`docs/current-state.md`](docs/current-state.md) — live work log / handoff (see rule below).

## Current-state log (required)

`docs/current-state.md` is the running handoff between agent sessions. **Read it at the start of every session** and **update it before you finish** any unit of work. Keep it short and current — overwrite stale content, do not append endlessly.

It must always answer:
- **Last action** — what was just done, with an ISO-8601 timestamp (`YYYY-MM-DD`, add time if known).
- **Working on** — the requirement IDs (`FR-*` / `NFR-*` / `TC-*` / `BC-*`) currently in progress.
- **Next steps** — the concrete next actions for whoever picks up.
- **Blockers / open questions** — anything unresolved.

### Plan-first workflow (enforced by hooks)

`docs/current-state.md` doubles as the **persistent plan** — plan mode with memory between
sessions. For any non-trivial task:

1. **Plan before code.** Write the plan into `docs/current-state.md` first — concrete numbered
   steps under **Next steps** (or a `### Plan` subsection under **Working on**), citing
   requirement IDs.
2. **Execute against the plan.** Follow the written steps; update them as they complete or the
   approach changes — the file must reflect the *current* plan, not the original one.
3. **Close the loop.** Before finishing, refresh Last action / Working on / Next steps / Blockers.

Enforcement (`.claude/settings.json` + `.claude/hooks/`): a `UserPromptSubmit` hook injects this
rule each turn; a `Stop` hook blocks finishing when the working tree changed but
`docs/current-state.md` was not updated.

## Commit on the fly (required)

**Commit each coherent unit of work as you go — do not batch a whole session into one commit, and
never leave a session with the tree dirty.** This is the durable memory between sessions; an
uncommitted change is a change the next session cannot trust (this handoff doc has drifted from the
real commit state more than once — commits are the source of truth, prose is not).

Rules:
- After each self-contained change (a bug fix, a slice, a spec) passes `yarn lint` + relevant
  tests, commit it. One logical change per commit.
- Conventional Commits (`feat` / `fix` / `docs` / `chore` / `refactor` / `test`), scoped to the
  change slug, e.g. `fix(delete-profile): …`.
- **Never commit secrets** — no keys, `.env*`, tokens, or PHI. Verify `git status` / the diff
  before every commit.
- Branch first if on `main`. End commit messages with the `Co-Authored-By` trailer.
- Before finishing a session: tree must be clean (committed) or the dirty files explicitly noted in
  `docs/current-state.md` with why.

## Skills (Agentic Engineering)

Project skills live in `.claude/skills/` (Claude Code) and `.cline/skills/` + `.clinerules/workflows/` (Cline). Reach for them by default:

- **agent-verify** — verify a change (build/lint/test → FR/NFR evidence). Run before any handoff or PR. *(verification)*
- **checker-review** — independent review of a diff vs PRD + DESIGN + FSD rules. Second pass, not the maker. *(maker ≠ checker)*
- **fsd-scaffold** — scaffold an FSD slice at the right layer with the import-rule guardrails. *(architecture)*
- **honesty-eval** — evals for the two-pass grounding + overclaim detection. *(evals)*
- **sync-current-state** — read/update `docs/current-state.md` handoff. *(loop continuity)*
- **perf-audit** — Lighthouse audit vs the NFR-PERF-04 mobile budget; run after any landing/font/global-CSS change (LCP margin ≈ 20 ms). *(performance)*
- **openspec-\*** — spec-driven change workflow (propose/apply/archive/sync/explore). *(SDD)*

Subagents (Claude Code, `.claude/agents/`): **checker** (fresh-context maker≠checker diff review, read-only) and **verifier** (fresh-context build/lint/test + FR/NFR evidence gate). Prefer them over running the corresponding skill in the maker's own context.

Guardrails wired into tooling: the FSD downward-only import rule, slice public-API rule, and `shared/lib` framework-free rule (TC-PURE-01) are **enforced by ESLint** (`eslint.config.mjs`) — `yarn lint` fails on violations.

## Separation of duties (STRICT — maker ≠ checker ≠ test author)

**The agent that wrote the code MUST NOT review it or write its tests in the same context.** Code
review and test authoring (unit / integration / e2e) are **independent responsibilities** that run
in a **separate sub agent with a clean context** and its own review/test skill and settings. The
maker's context is contaminated by its own intent; a clean context catches what the maker cannot
see. This is non-negotiable — no self-review, no self-authored tests passed off as independent
verification.

Rules:
- **Code review → separate sub agent, clean context.** Never review your own diff inline. Dispatch
  the fresh-context **`checker`** subagent (or the **`checker-review`** skill run in a *separate*
  agent, never the maker's). Review is against PRD IDs + DESIGN + FSD rules + NFRs. Read-only.
- **Test authoring → separate sub agent, clean context.** Unit, integration, and e2e tests are
  written by a dedicated **test-author** subagent with its own skill/settings, not by the maker.
  The maker states *what* must be covered (FR/NFR IDs, edge cases); the test author independently
  decides *how* and writes them against the spec, not the implementation. (Honesty-core evals use
  the **`honesty-eval`** skill, likewise in a separate context.)
- **Verification → `verifier` subagent.** Build/lint/test + FR/NFR evidence gate runs fresh-context
  (`verifier`), never in the maker's context.
- **One role per context.** A single agent context is maker *or* checker *or* test author — never
  two. If a context already made the change, it is disqualified from reviewing/testing it.

Gap to close: `.claude/agents/` ships **`checker`** + **`verifier`** but **no dedicated
`test-author` subagent/skill yet** — this rule mandates one. Until it exists, spawn a general sub
agent with a clean context + explicit test-authoring brief; do not let the maker write the tests.

## Before you build (STRICT — requirements → spec → architecture → plan, then code)

**No new feature is implemented before this gate passes.** Code written ahead of it is rejected on
review regardless of quality. Order is fixed:

1. **Analyze requirements.** Map the ask to PRD IDs (`FR-*` / `NFR-*` / `TC-*` / `BC-*`). If intent,
   scope, edge cases, or acceptance criteria are unclear or missing, **STOP and ask** — do not guess
   or infer silently. Surface AI-leverage and integration opportunities here.
2. **Prepare specs.** Author the OpenSpec change delta (`openspec-propose`) with `WHEN/THEN`
   scenarios, each citing its PRD ID. Spec before code (see SDD below).
3. **Prepare architecture.** State the FSD layer(s)/slice(s) touched, data model + pipeline impact,
   and the import-rule/`shared/lib`-purity implications. Note NFR risks (perf, security, i18n).
4. **Update `docs/current-state.md`.** Write the plan (numbered steps + requirement IDs) into the
   handoff BEFORE the first line of code — this is the plan-first workflow the hooks enforce.

Only after 1–4 does implementation start (`fsd-scaffold` → build). Skipping straight to code, or
building past an unanswered requirement question, is a hard violation.

## Model routing (analyze → grade complexity → pick model, optimize tokens)

**After analyzing requirements, grade the task's complexity and route it to the cheapest model that
can do it right.** Reasoning-heavy work earns a big model; mechanical work must not burn one. This
runs as part of the pre-build gate (step 1) and on every subagent dispatch.

1. **Grade complexity.** Trivial/mechanical (rename, typo, format, single-line, obvious lookup) →
   **low**. Standard slice/bugfix/test with clear scope → **medium**. Multi-file design, honesty
   pipeline, security-sensitive, ambiguous, or cross-cutting → **high**.
2. **Route the model.** Pass `model` on the `Agent`/`Workflow` call to match:
   - **low** → `haiku` (Haiku 4.5) — locate/edit/mechanical (`cavecrew-investigator`, `cavecrew-builder`).
   - **medium** → `sonnet` (Sonnet 4.6) — most slices, tests, reviews.
   - **high** → `opus` (Opus 4.8) — architecture, honesty-core, security, adversarial review.
   - Default: omit `model` and inherit the session model. `fork` ignores `model` (inherits parent).
3. **Optimize tokens regardless of tier.** Prefer read-only locator subagents
   (`cavecrew-investigator`) over dumping files into main context; delegate broad searches to
   `Explore`; let compressed subagent output keep main context lean. Don't run a search inline and
   in a subagent both.

Guideline, not dogma: when unsure, size up one tier rather than risk a wrong cheap answer — a
re-do costs more tokens than the bigger model saved.

Enforcement: a `PreToolUse` hook (`.claude/hooks/model-routing-reminder.sh`, matcher
`Agent|Workflow`) injects an **advisory** reminder when a dispatch omits `model` and is not a
`fork`. Non-blocking — it never denies the call, just prompts a conscious complexity grade.

## Spec-Driven Development (SDD)

This project is spec-driven (OpenSpec, `schema: spec-driven`). **Spec before code** for any new or changed capability.

- **Baseline specs** live in `openspec/specs/<capability>/spec.md` — the current committed truth (`Purpose` + `Requirements` with `WHEN/THEN` scenarios). Today: `app-shell`, `design-system`, `checklist`, `bullets`, `marketing-landing`. Every requirement cites its PRD ID.
- **Changes** are proposed as deltas under `openspec/changes/` via the openspec skills: `openspec-propose` → `openspec-apply` → `openspec-archive` (archive folds deltas into the baseline specs).
- The PRD (`docs/cv-agent-requirements.md`) stays the source of truth for *what* and *why*; specs make behavior testable (`WHEN/THEN`) and traceable. Keep them in sync.
- Validate specs/changes: `openspec validate --specs` (or `openspec validate <change>`). Project context + artifact rules are in `openspec/config.yaml`.

Workflow: propose a change → generate specs/design/tasks → implement (`fsd-scaffold`) → verify (`agent-verify`) → review (`checker-review`) → archive.

## Design

Read [`DESIGN.md`](docs/DESIGN.md) before building or restyling any UI — it covers the brand rules and how the design system is wired into the app. The full system (tokens, components, UI kit, guidelines) lives in `docs/vouch-design-system/`.

Quick rules: design tokens are Tailwind v4 `@theme` vars in `src/app/globals.css` — style with utilities (`bg-ink`, `text-brand`, `font-display`, `rounded-xl`, `shadow-card`). Fonts load via `next/font` in `src/app/layout.tsx`. Never add new brand hues, emoji, exclamation points, or icon libraries.
