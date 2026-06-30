# Current state — agent handoff

> Living log of the last agent session. Update at the end of every meaningful run.
> Sources of truth: [product-brief.md](product-brief.md), [requirements.md](requirements.md) (Stage 2, pending),
> and [docs/adr/](adr/).

## Last updated

`2026-06-30T16:20:00+03:00` (Europe/Kyiv)

## Phase

**Stage 5 — Per-slice build:** **`app-shell`**, **`i18n`**, **`currency-list`** done,
reviewed, archived; next slice **`currency-picker`** or **`converter`**.

## Last action

**`currency-list` slice — first slice touching the live NBU API, full loop run:**

1. **Propose:** `openspec/changes/add-currency-list/` (proposal, design, delta spec,
   tasks) — key design calls: Server Component fetch + `/api/rates` Route Handler for
   retries (`TC-DATA-01`: NBU never called from the browser); don't reuse DS `RateRow`
   (it forces a fabricated trend pill); pure `lib/nbu/` mapping + Kyiv-timezone date
   logic separate from the I/O fetch wrapper; hourly cache (`next.revalidate`) by
   default, forced-fresh on retry. `openspec validate add-currency-list --strict` green.
2. **kurs-maker (tests-first):** `lib/nbu/{mapRates,kyivDate,fetchTodayRates}.test.ts`
   written first (20 tests), confirmed **RED** (module-not-found) before each
   implementation file existed. `fetchTodayRates` tests mock `globalThis.fetch` —
   non-200 / network-reject / malformed-JSON / empty-array all resolve `{ ok: false }`,
   never throw. Built `app/api/rates/route.ts`, `components/rates/{CurrencyRow,
   CurrencyFocusPanel,RatesView}.tsx`, converted `app/page.tsx` to a Server Component.
   Added `uk.rates.*` strings; **removed** the now-dead `uk.home.*` group (its
   `PlaceholderPanel` consumer was replaced) and updated `lib/i18n/uk.test.ts`
   accordingly. 34/34 tests, `npm run verify` green.
3. **Live verification:** `npm run build` statically prerendered `/`, meaning
   `fetchTodayRates()` ran against the **real NBU API during the build**. Confirmed
   real `USD`/`EUR` rows + Ukrainian names + the non-stale "Станом на" label in
   `.next/server/app/index.html` — the full pipeline verified end-to-end against
   production data, not just fixtures.
4. **kurs-reviewer (Checker #1):** **CLEAN.** One candidate gap was investigated, not
   just flagged: FR-RATES-02 requires showing "unit" but `CurrencyRow` shows none —
   live-probed NBU for JPY/KRW (historically per-100 elsewhere) and confirmed this
   endpoint normalizes every currency to **per-1**; cross-checked the vendored
   reference (`FocusHero.jsx`/`RateRow.jsx`), which only shows a unit prefix when
   `unit > 1`. Concluded **not a gap** — documented as "investigated and resolved,"
   not silently dropped. 3 non-blocking suggestions (Next-fetch-extension nuance vs.
   `TC-PURE-01`'s literal import rule; 200-with-`ok:false` envelope pattern;
   client-clock asymmetry on the retry-only stale recompute).
5. **kurs-eval-judge (Checker #2):** **PASS 95/100** — stale-date-honest 94,
   error-calm-inline 96, rate-readability 96, no-fabricated-trend 100. Graded partly
   against the **live-rendered build output**, not just intended behaviour.
6. **Archived:** `openspec/changes/archive/2026-06-30-add-currency-list/`
   (`--skip-specs`). `npx openspec list` → no active changes.

**Maker≠checker note (unchanged from i18n):** subagents still not reloaded this
session; roles performed explicitly and sequentially by the orchestrator, re-reading
files fresh at each switch. A session reload is still recommended before the next slice.

### Prior: `i18n` slice — full loop run in one session

(subagents not yet registered this
session, so the orchestrator adopted each role explicitly per its `.claude/agents/*.md`
definition, re-reading files fresh rather than from memory at each role switch):

1. **Propose:** `openspec/changes/add-i18n/` (proposal, design, delta spec, tasks);
   `openspec validate add-i18n --strict` green.
2. **kurs-maker (tests-first):** `lib/i18n/uk.test.ts` written first, confirmed **RED**
   (`Cannot find module './uk'`), then `lib/i18n/uk.ts` (typed `as const` table) added →
   **GREEN** (6/6). Migrated `AppHeader`, `AppFooter`, `AppShell`, `app/page.tsx`,
   `app/layout.tsx` to read `uk.*`; deduplicated the two column labels (previously
   defined twice); verified byte-identical migration incl. non-ASCII punctuation
   (curly apostrophe U+2019, em-dash U+2014). Independent recursive scan: **zero**
   stray Cyrillic literals outside `lib/i18n/uk.ts`. `evals/cases/i18n.eval.ts` added.
   13/13 tests, `npm run verify` green.
3. **kurs-reviewer (Checker #1):** **CLEAN** — re-read spec + diff fresh; 2 non-blocking
   suggestions (`en.ts` fallback shape note; lock remaining string literals later).
   Appended to [review-findings.md](qa/review-findings.md).
4. **kurs-eval-judge (Checker #2):** **PASS 98/100** — copy-centralised 100,
   voice-consistent 100, labels-deduplicated 96, zero-behaviour-change 96. Appended
   to [eval-report.md](qa/eval-report.md) (restructured to one running doc, per-slice
   sections, matching `review-findings.md`'s pattern).
5. **Archived:** `openspec/changes/archive/2026-06-30-add-i18n/` (`--skip-specs`;
   baseline spec unchanged). `npx openspec list` → no active changes.

**Note on maker≠checker this session:** `kurs-maker`/`kurs-reviewer`/`kurs-eval-judge`
are not registered as Task-tool subagents yet (created mid earlier session; Claude Code
loads `.claude/agents/` at startup). The orchestrator performed each role explicitly and
sequentially, re-reading source fresh at each switch rather than reasoning from
implementation memory — independence by discipline, not isolation. **A session reload
will register the subagents** for true isolated dispatch on the next slice.

---

### Prior: `app-shell` reviewed (Cursor-built, Claude-checked)

**`/review-slice app-shell`** — both checkers clean:
- **kurs-reviewer:** CLEAN (4 non-blocking suggestions in [review-findings.md](qa/review-findings.md))
- **kurs-eval-judge:** PASS 96/100 ([eval-report.md](qa/eval-report.md))
- Change archived → `openspec/changes/archive/2026-06-30-add-app-shell/` (`--skip-specs`; baseline spec unchanged)
- **Independent re-check (fresh context):** gates re-run green (7/7 tests; verify green). Applied the one
  reviewer suggestion that touched NFR-OBS-01 — `suppressHydrationWarning` on `<html>` in `app/layout.tsx`
  (prevents a hydration warning on dark-preference reloads). Slice **committed**.

### Prior checkpoint

**`/kurs-maker app-shell`** — tests-first implementation complete; `npm run verify` + `npm run test:run` green.

**Checkpoint commit `953118f`** on branch **`build/hryvnia-foundation`** (off `main`):
189 files — Stages 1–4 + design system + `kurs-uah`.

## Status

- **Working:** full app shell, theme toggle (no-flash), centralised i18n table, and a
  real currency-list page server-rendering live NBU rates with selection, stale
  labelling, and a recoverable error state. Vitest wired (`test:run`, 34 tests across
  5 files). `npm run verify` green.
- **Done (slices):** `app-shell` (FR-SHELL-01…04), `i18n` (FR-I18N-01, NFR-I18N-01),
  `currency-list` (FR-RATES-01…05) — all implemented, two-checker reviewed, archived.
  `app-shell` + `i18n` are **committed** (`54290cf`, `b1d6f34`); `currency-list` is
  **archived but not yet committed**.
- **In progress:** — (await commit for `currency-list`)
- **Blocked:** —

## Next steps

1. **Commit** the `currency-list` slice (`lib/nbu/*`, `app/api/rates/`,
   `components/rates/*`, `app/page.tsx` rewrite, QA reports) with `Slice:`/`Refs:`
   trailers — on top of `b1d6f34`.
2. **Reload the session** before the next slice so `kurs-maker`/`kurs-reviewer`/
   `kurs-eval-judge` register as real isolated Task-tool subagents (still pending
   across all three slices built so far this session).
3. **`/propose-slice currency-picker`** or **`/propose-slice converter`** — both
   depend only on `currency-list` (already done) and can be built in either order
   per `docs/mvp-capability-plan.md`'s dependency graph.
4. Remaining build order: `currency-picker` + `converter` (either order) →
   `rate-history` → `trend-hint` → *(optional)* `footer-sayings`.
5. `rate-history` will need the **range endpoint** (`NBU_Exchange/exchange_site`,
   ADR-0002) — different shape from `lib/nbu/mapRates.ts` (which targets
   `statdirectory/exchange`); plan a `lib/nbu/mapHistory.ts` rather than reusing `mapRates`.

## Notes / decisions

- Theme storage key: `hryvnia:theme:v1`; light = no `data-theme` attribute, dark = `data-theme="dark"`.
- `useSyncExternalStore` in `useThemePreference.ts` avoids setState-in-effect lint; `ThemeScript` handles pre-paint bootstrap.
- **`lib/i18n/uk.ts` is now the single source of every UI string** — any new slice
  adds its copy there, never inline (enforced by review, not yet by lint; a future
  ESLint rule was flagged as optional hardening).
- **`lib/nbu/`** established: `mapRates.ts` (pure, total, sorts by code),
  `kyivDate.ts` (pure, `now` always injected, Europe/Kyiv calendar), `fetchTodayRates.ts`
  (I/O, never throws, `{ noStore? }` toggles cache). Only two call sites permitted:
  `app/page.tsx` (Server Component) and `app/api/rates/route.ts` (Route Handler) —
  NBU is never called from the browser (`TC-DATA-01`).
- **NBU `statdirectory/exchange` endpoint normalizes every currency to per-1 unit**
  (verified live for JPY, KRW — historically per-100 elsewhere). `CurrencyRow` shows
  no unit multiplier, matching the vendored design's own convention (`unit > 1` only).
- **Don't reuse DS `RateRow`** for rows with no real trend data — it forces a `delta`
  prop and would render a fabricated "flat" pill. Reconsider once `trend-hint` exists.
- **Caching:** SSR path uses `next.revalidate: 3600`; the manual-retry Route Handler
  forces `cache: 'no-store'`. Confirmed in the build's own route summary
  (`○ Static, Revalidate 1h` for `/`; `ƒ Dynamic` for `/api/rates`).
- Review suggestions (optional polish, app-shell): `aria-busy` on loading columns;
  Playwright viewport tests deferred to Stage 8. (`suppressHydrationWarning` already applied.)
- Review suggestions (optional polish, i18n): lock the remaining string literals in
  `uk.test.ts` if copy stability becomes load-bearing; consider a Cyrillic-in-JSX lint rule.
- Review suggestions (optional polish, currency-list): fixed-width decimal formatting
  for tighter column alignment; a more distinct retry-button affordance; a one-line
  comment on the Route Handler's 200-with-`ok:false` envelope pattern.
- Requirement IDs touched: **FR-SHELL-01…04** (app-shell); **FR-I18N-01, NFR-I18N-01**
  (i18n); **FR-RATES-01…05, BC-HONESTY-01, NFR-OBS-01, NFR-PERF-01, TC-DATA-01** (currency-list).
