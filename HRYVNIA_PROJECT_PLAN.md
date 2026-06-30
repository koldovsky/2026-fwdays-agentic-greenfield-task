# «Гривня» — project plan

> **Course:** Agentic Engineering — Greenfield assignment.
> **Goal:** demonstrate as many Agentic Engineering practices as possible in a small,
> realistic, fully-finished project — *not* to build an impressive product.
> **This is a self-contained plan.** It references only this repository.
> **Last rebuilt:** 2026-06-29 (Europe/Kyiv).

---

## Progress at a glance

| Stage | Status |
|---|---|
| 1 — Discovery (brief + ADRs + handoff) | ✅ **done** |
| 2a — Design system (claude-design ZIP → DESIGN.md → frontend skill) | ✅ **done** |
| 2 — Specification (requirements + OpenSpec baseline) | ✅ **done** |
| 3 — Architecture (capability plan) | ✅ **done** |
| 4 — Bootstrap the hand-authored loop (agents, commands, hooks, CI, checklist, check script) | ✅ **done** |
| 5–7 — Per-slice loop (build each capability, maker ≠ checker) | ⏳ next |
| 8 — Verification (integration + e2e + a11y) | ⬜ |
| 9 — Maker self-review | ⬜ |
| 10 — Checker review (two checker agents) | ⬜ |
| 11 — Documentation (QA pack + README + technical docs) | ⬜ |
| 12 — PR preparation | ⬜ |
| 13 — Demo recording | ⬜ |

Live handoff: **[docs/current-state.md](docs/current-state.md)** (the source of truth for "where are we now").

---

## 0. Guiding principle

> **Reuse mechanisms, author judgment.**
> Borrow generic, undifferentiated mechanisms (a git-hook firing, a spec-validation CLI,
> a CI shape, the *idea* of phase gates). Hand-author everything that encodes a decision —
> agent rules, the maker/checker split, the gates, what "good" means. **Do not auto-generate
> the agentic scaffolding** — building the loop by hand is the demonstrated skill
> ([ADR-0003](docs/adr/ADR-0003-prior-art-reuse-boundary.md)).

Optimize for: Context Engineering · `AGENTS.md` · Spec-Driven Development (OpenSpec) ·
Loop Engineering · Verification · **Maker ≠ Checker** · reusable artifacts · review/validation ·
structured AI collaboration · visible engineering evidence. Apply **KISS + YAGNI**.

---

## 1. The project

**«Гривня»** — a calm, Ukrainian-first web app that answers one practical question:
**"What is the official UAH exchange rate today, what is it in my money, and which
way is it moving?"** — using the National Bank of Ukraine's public, keyless open data.

The domain is deliberately small and honest so the **engineering** is the star.
Full framing in **[docs/product-brief.md](docs/product-brief.md)**; decisions in **[docs/adr/](docs/adr/)**.

### Stack (locked — observed from the scaffold, see [ADR-0001](docs/adr/ADR-0001-stack.md))
- Next.js **16.2.9** · React **19.2.4** · TypeScript **^5 strict** · App Router.
- Tailwind CSS **4** (`@tailwindcss/postcss`) · ESLint 9.
- Data: **NBU `NBUStatService` open API** — keyless, free, official ([ADR-0002](docs/adr/ADR-0002-nbu-keyless-api.md)).
- Charts: Recharts (one rate-history line). **No DB, auth, email, cookies, analytics, map.**
- Tests: Vitest (unit) + Playwright (e2e + axe a11y). The app runs with **zero env vars**.

> ⚠️ This is **not the Next.js in training data** (16.2 has breaking changes). Read
> `node_modules/next/dist/docs/` before writing code ([AGENTS.md](AGENTS.md)).

### MVP capabilities → requirement-ID prefixes
| Capability slice | Prefix | Pure-logic domain (tests + evals) |
|---|---|---|
| App shell & navigation | `FR-SHELL-*` | — |
| i18n (Ukrainian strings) | `NFR-I18N-*` | — |
| Currency list (today's rates) | `FR-RATES-*` | NBU response → domain mapper |
| Currency picker / filter | `FR-PICK-*` | filter, inline "не знайдено" |
| Converter (UAH ⇄ currency) | `FR-CONVERT-*` | `convert()`, `parseAmount()` — total, locale-aware |
| Rate history chart (~30 d) | `FR-HISTORY-*` | window assembly, normalisation |
| Trend hint (calm sentence) | `FR-TREND-*` | `rateMove()` — direction + % |
| Footer sayings (optional) | `FR-SAYINGS-*` | deterministic day-of-year selection |
| Cross-cutting | `NFR-*`, `TC-*`, `BC-*` | — |

Build order = dependency order:
`app-shell` → `i18n` → `currency-list` → `converter` → `rate-history-chart` → `trend-hint` → `footer-sayings` *(optional)*.

---

## 2. What I author vs. what I reuse

| Artifact | Reuse (mechanism only) | **Author myself (the signal)** |
|---|---|---|
| `AGENTS.md` / `CLAUDE.md` | the "static context" idea | my rules: static-vs-dynamic split, correctness rules, Ukrainian-no-exclamation tone |
| Specs | OpenSpec **CLI** (`npx openspec validate`) | every spec + change folder (my domain) |
| Subagents | — | a maker + **two separate checkers** (see §8) |
| Slash commands / loop | — | my own `/propose-slice`, `/review-slice` |
| `CHECKLIST.md` | the *idea* of phase gates | a tight, project-tuned gate I can defend (§5) |
| Verification script | — | my own `scripts/check-traceability.mjs` |
| Hooks / CI | `core.hooksPath` mechanism; GH Actions shape | my own `.githooks/*` + minimal `ci.yml` |
| Evals + rubrics | — | rubrics for my domain's qualitative surfaces |
| `kurs-uah` skill | the self-contained-skill *shape* | my own zero-dep NBU skill |
| `DESIGN.md` + design skill | the design-system wiring *pattern* | my own `DESIGN.md` + frontend design skill (§7A) |
| (optional) React/Next perf rules | a public rule-set skill, copied verbatim as a tool | referenced from `AGENTS.md` |

**Deliberately out of scope (YAGNI):** a large multi-agent fleet, a multi-page gate
document, DB/auth/RBAC, background-automation jobs, CI ratchets, third-party PR-review
services. Their checks may run locally as evidence; they do not gate a tiny keyless app.

---

## 3. Stage-by-stage plan

Stages 5–7 (API integration, UI, error handling) collapse into a **per-slice loop** —
that's where maker ≠ checker lives. Each slice = one OpenSpec change folder.

### Stage 1 — Discovery ✅ done
- **Delivered:** `docs/product-brief.md`; `docs/adr/ADR-0001` (stack), `ADR-0002` (NBU API),
  `ADR-0003` (engineering approach); seeded `docs/current-state.md`; `AGENTS.md` handoff +
  product-docs rules.
- **Done when:** brief + 3 ADRs committed, scope signed off (Checkpoint 1).

### Stage 2a — Design system (from the claude-design ZIP) ⏳ next
Full flow in **§7A**. Unpack ZIP → wire tokens + `components/ds/` → author `DESIGN.md` →
author the frontend design skill → reference both skills from `AGENTS.md`.

### Stage 2 — Specification
- **Tasks:** `docs/requirements.md` (FR/NFR/TC/BC, Phase=MVP/Future, stable IDs); `openspec init`;
  one baseline spec per capability.
- **Done when:** every MVP FR in exactly one spec; `npx openspec validate --all --strict` green;
  `node scripts/check-traceability.mjs` green.

### Stage 3 — Architecture
- **Tasks:** `docs/mvp-capability-plan.md` (slice table, acyclic dependency graph, per-slice DoD,
  FR-coverage table); `docs/context-architecture.md` (static-vs-dynamic context budget).
- **Done when:** graph acyclic, FR coverage complete, plan approved (Checkpoint 2).

### Stage 4 — Bootstrap the hand-authored loop (my G0)
- **Tasks:** finalize `AGENTS.md`; author `.claude/agents/{kurs-maker,kurs-reviewer,kurs-eval-judge}.md`;
  author `.claude/commands/{propose-slice,review-slice}.md`; tight `CHECKLIST.md`;
  `.githooks/{pre-commit,commit-msg}`; minimal `.github/workflows/ci.yml`;
  `scripts/check-traceability.mjs`; `evals/` dir; `.env.example` (zero required vars).
- **Done when:** `npm run lint && npm run build` green; hooks fire on an empty commit.

### Stages 5–7 — Per-slice loop (my G4, repeated per slice)
For each slice (`currency-list` → `converter` → `rate-history-chart` → `trend-hint`):
1. **Tests-first (RED):** `kurs-maker` writes failing unit tests from the spec (`@trace FR-x`).
   Pure logic in `lib/` (framework-free) + NBU fetch wrapper with honest degradation.
2. **UI:** thin page + `components/` using DS tokens; loading / empty / error states.
3. **Error handling:** unknown currency inline ("не знайдено"); NBU failure → visible degraded
   state (never 500/blank); locale parser accepts `,` and trailing zeros; stale-day labelled honestly.
4. **GREEN:** implement until tests pass; `lint`/`build`/`openspec validate` green.
5. **Maker ≠ checker:** `kurs-reviewer` + `kurs-eval-judge` (both ≠ maker) review → fix findings → re-run green.
6. **Archive:** `npx openspec archive add-<slice>`; update `current-state.md`; commit with `Slice:`/`Refs:` trailers.

### Stage 8 — Verification (my G5)
Integration test for convert→display; Playwright e2e (core flow + responsive + axe a11y light/dark);
run the full `CHECKLIST.md`. → `docs/qa/automated-verification-latest.md`.

### Stage 9 — Maker self-review
Maker runs `lint/test/build/openspec validate`, fixes obvious issues, writes a self-review note → `docs/qa/global-review.md`.

### Stage 10 — Checker review (my G7 — maker ≠ checker)
Independent pass by `kurs-reviewer` (spec + correctness) and `kurs-eval-judge` (quality).
Fix every confirmed finding → `docs/qa/review-findings.md` + `docs/qa/eval-report.md`.

### Stage 11 — Documentation (my G6)
Traceability matrix, manual test plan (non-dev executable), demo script, risk register,
acceptance report; `docs/technical/*`; `README` usage section; final `current-state.md`.

### Stage 12 — PR preparation
Branch; fill `.github/pull_request_template.md`; PR body (what/why, FR coverage, gate evidence,
screenshots); CI green. → `docs/pr-description.md`.

### Stage 13 — Demo recording
Automated headless Playwright clips — one per capability + empty/error state; each clip asserts
its FRs. Plus your own 1–2 min screen-capture walkthrough for the course. → `docs/qa/demo-recordings/*`.

---

## 4. Artifacts (purpose · owner · update)

| Artifact | Purpose | Owner | Update |
|---|---|---|---|
| `AGENTS.md` (+ `CLAUDE.md`) | Durable cross-cutting agent rules + handoff + product-docs protocol | Me | Rarely; demote detail to specs / `context-architecture.md` |
| `openspec/specs/*`, `openspec/changes/*` | Requirement/scenario specs; one change folder per slice | Me | `propose → apply → archive`; `validate --strict` gates it |
| `docs/requirements.md` | Numbered traceable FR/NFR/TC/BC source of truth | Me | Append-only IDs; never renumber |
| `docs/product-brief.md` | What/why/for-whom, brand, scope | Me | When scope changes |
| `docs/adr/*` | Accepted decisions (stack, API, approach, later choices) | Me | Append; supersede, never delete |
| `docs/context-architecture.md` | Static-vs-dynamic context budget | Me | When `AGENTS.md` grows |
| `docs/current-state.md` | Living handoff (Kyiv timestamp, status, next steps) | Every session | At every milestone (automated by `AGENTS.md` rule) |
| `CHECKLIST.md` | My tight gates G0–G7 | Me | Tick passage in current-state |
| `scripts/check-traceability.mjs` | Every MVP FR cited in a spec + has a `@trace` test | Me | Wired into hook + CI |
| `evals/cases/*.eval.ts` + `docs/qa/eval-report.md` | Graded *quality* tests can't assert | Me writes; `kurs-eval-judge` grades | Case per slice's qualitative surface |
| `docs/qa/review-findings.md` + `global-review.md` | Checker findings + maker self-review | checkers (≠ maker) | Per slice + global at G7 |
| `DESIGN.md` (root) | Brand decision-of-record; wires the design system; satisfies `BC-BRAND-01` | Me | After unpacking the ZIP (§7A) |
| `docs/design-system/**` (+ its `SKILL.md`) | Vendored design output: tokens, guidelines, components, UI kit + generation skill | claude design (ZIP) | Replace by re-unpacking |
| `.agents/skills/hryvnia-frontend-design/SKILL.md` | Frontend-application design skill | Me | When DESIGN.md rules change |
| `.claude/skills/kurs-uah/{SKILL.md,run.mjs}` | Portable, self-contained currency advisor skill | Me | Versioned with the repo |

---

## 5. CHECKLIST.md — my own tight gates (draft)

**G0 — Scaffold & loop:** `lint`+`build` green; hooks fire; `AGENTS.md`+ADRs present;
my agents + commands exist; `check-traceability.mjs` runs; `openspec init` done; `evals/` present; `.env.example` (zero vars).
**G1 — Framing:** brief + requirements numbered & phase-tagged; scope signed off.
**G2 — Baseline specs:** `openspec validate --all --strict` green; `check-traceability` green.
**G3 — Capability plan:** plan complete; dependency graph acyclic; approved.
**G4 — Per slice:** tests-first RED→green (none weakened); pure `lib/` total + `@trace`; eval case authored;
no input/NBU failure 500s or fails silently; both checkers clean; commands green; change archived; trailers on commit.
**G5 — Hardening:** integration + e2e (core + responsive + axe a11y light/dark) green.
**G6 — QA proof pack:** traceability matrix, manual plan, demo script, risk register, acceptance; eval report passes; recordings assert FRs.
**G7 — Release:** global review clean; CI green; technical docs + README done; current-state final; PR opened with evidence.

---

## 6. Skills & rules

**Author as `AGENTS.md` rules:** Next.js-16 preamble; `lib/` purity (no `next/*`/`react`/DOM; colocated `*.test.ts`);
error-surface (no 500/blank, inline empty states, honest degradation); locale (comma decimals + trailing zeros;
mono tabular figures); tone (Ukrainian-first, calm, **no exclamation marks**); test-first per slice; maker ≠ checker.

**Author my own skill — `kurs-uah`** (`.claude/skills/kurs-uah/{SKILL.md,run.mjs}`):
zero-dependency Node + global `fetch`; vendored currency list; fetches NBU directly with
`AbortSignal.timeout`; prints a Ukrainian table (`валюта · курс · зміна за тиждень · напрям`);
the **agent reasons over it** to answer "скільки буде 100 USD" / "куди рухається курс євро".
Rules: use only numbers from the script; near-term horizon; answer in Ukrainian, calm, no exclamation marks;
self-contained (no app, no key, any harness). Optional second skill `konverter` (pure convert) for a two-skill demo.

**Design skills:** see §7A (one ships in the ZIP, one I author).

---

## 7A. Design system workflow (claude design → DESIGN.md → design skill)

> Runs as **Stage 2a**, after the brief and before the UI slices. Needs the claude-design ZIP.

**Input:** the claude-design **ZIP** (generated via "claude design"), containing `styles.css`,
`readme.md`, `SKILL.md` (a `user-invocable` generation skill), `tokens/`, `assets/`,
`guidelines/`, `components/` (`.jsx`+`.d.ts`+`.prompt.md` each), `ui_kits/<app>/`.

**Steps:**
1. **Unpack** into `docs/design-system/` (vendored, read-only; keep its `SKILL.md` + `readme.md`).
2. **Wire into the app:** tokens → `app/styles/tokens/` (imported by `globals.css` + a Tailwind
   `@theme inline` bridge); components → `components/ds/` (App-Router-ready, `'use client'`),
   exported from `@/components/ds`; fonts in `app/layout.tsx` (`next/font`, self-hosted, Cyrillic);
   assets → `public/brand/`.
3. **Author `DESIGN.md`** (root) — brand decision-of-record: brand («Гривня», calm, Ukrainian-first,
   no exclamation marks, "one number then the detail"); a *Where-it-lives* table; token rules (consume
   **semantic aliases**, never raw ramps); type (sans + mono tabular for every numeric); theming
   (`data-theme="dark"`, WCAG AA); voice; a11y/motion. Satisfies `BC-BRAND-01`.
4. **Author the frontend design skill** `.agents/skills/hryvnia-frontend-design/SKILL.md` — tells any
   build-agent: read `DESIGN.md` first; prefer `@/components/ds`; style with semantic tokens / Tailwind
   bridge, never hex; mono tabular figures for numbers; Ukrainian-first, no exclamation marks; keep
   focus ring + AA + reduced-motion.
5. **Reference both skills** from `AGENTS.md` ("Skills (load on demand)").

**The two design skills:**
| Skill | Path | Origin | Purpose |
|---|---|---|---|
| Generation / prototyping | `docs/design-system/SKILL.md` (`user-invocable`) | ships in the ZIP | generate mocks/prototypes/in-brand code |
| Frontend application | `.agents/skills/hryvnia-frontend-design/SKILL.md` | I author it | make build-agents apply the brand on real pages |

**Done when:** `npm run build` green with tokens + `@/components/ds` imported; a sample page renders
in-brand (light + dark) at AA contrast; `DESIGN.md` + both skills committed; `BC-BRAND-01` satisfied.

---

## 8. Maker ≠ Checker — my own agents

**Maker — `kurs-maker`:** writes failing tests from spec → implements to green → wires UI + error
states → drafts capability docs → runs local commands → writes self-review note. **Never reviews its own slice.**

**Checker — two separate agents (both ≠ maker, ≠ each other):**
- **`kurs-reviewer`** — spec compliance + correctness (error-surface, locale parsing, `lib/` purity, tone); structural + behavioural.
- **`kurs-eval-judge`** — quality grading (error-message clarity, empty-state usability, Ukrainian tone, trend-hint wording).

No third-party review service is part of the engineering loop — the separation is demonstrated entirely by my own agents.

**Checker checklist (per slice):**
- [ ] Every spec scenario implemented; no silent scope drift.
- [ ] No user input or NBU failure → 500 / blank / silent failure.
- [ ] Locale parsing correct (comma decimals, trailing zeros); mono tabular figures; stale-day labelled honestly.
- [ ] Empty / loading / error states present and honest; inline, no toast.
- [ ] Pure `lib/` logic total, framework-free, fully unit-tested with `@trace`.
- [ ] Eval case grades the qualitative surface (Ukrainian tone, no exclamation marks, clarity) — passes rubric.
- [ ] a11y AA both themes; focus ring visible; reduced motion respected.
- [ ] Tests written before impl and observed red; none weakened.
- [ ] `lint`/`test`/`build`/`openspec validate --strict` green; commit has `Slice:`/`Refs:` trailers.
- [ ] Reviewer agents ≠ maker agent confirmed.

---

## 9. Verification plan

**Manual** — *Happy:* convert 100 USD→UAH; switch currency; view ~30-day chart; trend hint shows direction.
*Edge:* `100,50` (comma); trailing zeros; same-currency convert; weekend/holiday (NBU serves prev business day);
very large amount. *Failure:* NBU unreachable → visible degraded state; unknown currency → inline "не знайдено", no toast; empty history → empty state.

**Automated** — Vitest unit on `lib/*` (`convert`, `parseAmount`, `rateMove`) with locale + boundary inputs, `@trace FR-x`;
`tsc` strict + `npm run build`; eslint + prettier (hooks + CI); Playwright core flow + responsive + axe a11y (light/dark).

**API** — network failure (mock NBU 500/timeout → degraded state asserted in e2e); invalid/malformed JSON (caught, no crash);
loading (skeleton of equal footprint); empty (no rate for date → honest message).

---

## 10. Deliverables checklist

- [ ] Source: Next.js App Router app · pure `lib/` · DS components · `kurs-uah` skill.
- [ ] Specs: `docs/requirements.md` + `openspec/specs/*` + archived `openspec/changes/*`.
- [ ] `AGENTS.md` + `CLAUDE.md` + ADRs + `docs/context-architecture.md`.
- [ ] My loop: `.claude/agents/*`, `.claude/commands/*`, `.githooks/*`, `ci.yml`, `scripts/check-traceability.mjs`.
- [ ] Verification: unit + e2e + a11y + `docs/qa/automated-verification-latest.md`.
- [ ] Review: `docs/qa/review-findings.md` (clean) + `docs/qa/global-review.md`.
- [ ] Evals: `evals/cases/*.eval.ts` + `docs/qa/eval-report.md`.
- [ ] Docs: README · `docs/qa/*` (traceability, manual plan, demo script, risk register, acceptance) · `docs/technical/*` · `docs/current-state.md`.
- [ ] `DESIGN.md` + `docs/design-system/` + frontend design skill.
- [ ] Demo: automated headless clips + manifest + 1–2 min walkthrough.
- [ ] PR description + open PR; CI green.

---

## 11. Next prompts — execute in order (Stage 1 done)

1. **Design system from the claude-design ZIP** *(after I drop the archive — §7A):*
   2a unpack & wire → 2b author `DESIGN.md` → 2c author the frontend design skill + reference both in `AGENTS.md`.
2. **Specification:** write `docs/requirements.md` (FR/NFR/TC/BC, Phase, stable IDs); `openspec init` + baseline specs; `validate --strict`.
3. **Architecture:** `docs/mvp-capability-plan.md` + `docs/context-architecture.md`.
4. **Bootstrap the loop:** finalize `AGENTS.md`; author `kurs-maker` + `kurs-reviewer` + `kurs-eval-judge`;
   `/propose-slice` + `/review-slice`; `CHECKLIST.md`; `.githooks/`; `ci.yml`; `scripts/check-traceability.mjs`. Verify lint/build + hooks.
5. **Slice loop (maker ≠ checker):** `currency-list` → `converter` → `rate-history-chart` → `trend-hint`
   (tests-first RED → green → two-checker review → archive). Repeat per slice.
6. **`kurs-uah` skill.**
7. **Eval cases + rubrics**, graded by `kurs-eval-judge`.
8. **Hardening:** integration + Playwright e2e (responsive + axe a11y light/dark); run the full CHECKLIST.
9. **QA proof pack + README + technical docs.**
10. **Record demos (automated headless) + prepare the PR** with FR coverage and gate evidence; CI green.

---

## 12. Open decisions / reminders

- [ ] Keep the optional **footer sayings** capability, or drop it for a tighter MVP?
- [ ] Generate the claude-design **ZIP**, drop it in, then run prompt 1 / §7A.
- [ ] Decide whether to include one optional `BUG-x` round to showcase triage.
- [ ] Commit Stage 1 (scaffold + docs) when ready — currently uncommitted.
- [ ] Primary UI is **Ukrainian-only** (English only as tiny system labels).
- [ ] All numeric/date logic uses the published `exchangedate`, never `toISOString().slice(0,10)`.
