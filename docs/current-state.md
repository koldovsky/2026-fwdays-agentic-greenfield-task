# Current state — agent handoff

> Living log of the last agent session. Update at the end of every meaningful run.
> Sources of truth: [product-brief.md](product-brief.md), [requirements.md](requirements.md) (Stage 2, pending),
> and [docs/adr/](adr/).

## Last updated

`2026-06-30` (Europe/Kyiv)

## Phase

**Stage 4 — Loop authored: complete.** Next: per-slice build (Stages 5–7), starting with `app-shell`.

## Last action

Built the self-contained **`kurs-uah`** skill (`SKILL.md` + zero-dep `run.mjs`): fetches
the official NBU rate live, prints a Ukrainian table the agent reasons over to convert
amounts / read trends. **Live-tested** (convert both ways, 7-day trend, unknown-code
handling) and **mirrored to `.claude` / `.cursor` / `.codex` skills** (runs in any harness).
This **closed the ADR-0002 open question**: verified the NBU endpoints live — today
(`statdirectory/exchange?json`), dated archive (`?date=YYYYMMDD`), and the **~30-day range**
(`NBU_Exchange/exchange_site?start=&end=&valcode=`); ADR-0002 updated, `rate-history` slice
de-risked.

### Earlier this session
Made the loop **portable across Claude Code · Cursor · Codex** and tidied context:
(1) wired the **`vercel-react-best-practices`** skill via a path reference in `AGENTS.md`;
(2) **trimmed** the verbose `# Design system` block out of `AGENTS.md` into a lean
`# Skills (load on demand)` pointer (detail already lives in the `hryvnia-frontend-design`
skill + `DESIGN.md`) — leaner static context;
(3) mirrored the loop for the other tools — `.cursor/commands/` + `.codex/prompts/` for
`propose-slice`, `review-slice`, `kurs-maker`, `kurs-reviewer`, `kurs-eval-judge` (thin
redirectors to the canonical `.claude/` files), a `.cursor/rules/hryvnia.mdc` (alwaysApply),
and `docs/agent-tooling.md` explaining the portability + how maker≠checker holds (run each
checker in a fresh chat). `npm run lint` + `check:trace` still green.

(Prior — Stage 4: authored the loop itself — 3 agents, 2 commands, `CHECKLIST.md`,
`check-traceability.mjs`, git hooks (verified), CI, `.env.example`, openspec devDep + `verify`.)

## Status

- **Working:** app builds + lints green; design system wired. 8 specs validate strict. Still uncommitted.
- **Done (Stage 1):** product brief + ADR-0001/0002/0003; `AGENTS.md` handoff + product-docs rules; docs self-contained; checker = own two agents.
- **Done (Stage 2a):** design system wired (`docs/design-system/`, `app/styles/tokens/`, `components/ds/`, fonts, `DESIGN.md`, both skills); vendored DS excluded from lint.
- **Done (Stage 2):**
  - `docs/requirements.md` — FR/NFR/TC/BC, Phase, stable ids (25 MVP FRs + 1 Future).
  - `docs/context-architecture.md` — static-vs-dynamic context budget.
  - `openspec/specs/{app-shell,i18n,currency-list,currency-picker,converter,rate-history,trend-hint,footer-sayings}/spec.md` — validate `--all --strict` green.
  - `openspec/config.yaml` — project context added.
- **Done (Stage 3):** `docs/mvp-capability-plan.md` — slice table, acyclic dependency graph, critical path, build order, per-slice DoD + risks, FR-coverage (25/25, no gaps/dupes). **Checkpoint 2.**
- **Done (Stage 4):** the hand-authored loop — `AGENTS.md` engineering rules; 3 agents; 2 commands; `CHECKLIST.md`; `check-traceability.mjs`; git hooks (wired + verified); CI; `.env.example`; openspec devDep + `verify` script.
- **In progress:** —
- **Blocked:** —

## Next steps

1. **Per-slice loop (Stages 5–7)**, build order: `app-shell` → `i18n` → `currency-list` → `converter` → `rate-history` → `trend-hint` → `currency-picker` → *(optional)* `footer-sayings`. Each: `/propose-slice` → kurs-maker (tests-first) → `/review-slice` (two checkers) → archive.
2. `rate-history` history endpoint is now **verified** (ADR-0002): use
   `NBU_Exchange/exchange_site?start=&end=&valcode=&sort=exchangedate&order=desc&json`;
   de-dup weekend/holiday carry-over rows.
3. The `app/page.tsx` in-brand preview will be replaced by the real `app-shell` slice.
4. Still **uncommitted** (Stages 1–4) — a clean checkpoint commit is advisable before slices begin.

## Notes / decisions

- Brand name **«Гривня»** confirmed (`package.json` name `hryvnia`); skill prefix `hryvnia-` (design) / `kurs-` (agents + currency skill).
- Design skills: `hryvnia-design` (generation, in the ZIP) + `hryvnia-frontend-design` (application, authored).
- Lucide loads via UMD CDN (flagged substitution); Recharts is deferred (UMD global, wired at the chart slice).
- The design ZIP remains at `docs/Hryvnia exchange rate app design.zip` (source archive).
- Capability slices (order): `app-shell` → `i18n` → `currency-list` → `converter` → `rate-history-chart` → `trend-hint` → `footer-sayings` (optional).
- Requirement-ID prefixes reserved: `FR-SHELL/RATES/PICK/CONVERT/HISTORY/TREND/SAYINGS-*`, `NFR-*`, `TC-*`, `BC-*`.
- Engineering docs in **English**; product copy in **Ukrainian**.
- Scaffold + Stage-1 docs are still **uncommitted** — commit when the user approves scope (Checkpoint 1).
- `AGENTS.md` is currently only the Next.js preamble; the full authored version comes at Stage 4.
