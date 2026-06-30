# Current state — agent handoff

> Living log of the last agent session. Update at the end of every meaningful run.
> Sources of truth: [product-brief.md](product-brief.md), [requirements.md](requirements.md) (Stage 2, pending),
> and [docs/adr/](adr/).

## Last updated

`2026-06-30T15:05:00+03:00` (Europe/Kyiv)

## Phase

**Stage 5 — Per-slice build:** **`app-shell`** and **`i18n`** done, reviewed, archived;
next slice **`currency-list`**.

## Last action

**`i18n` slice — full loop run in one session** (subagents not yet registered this
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

- **Working:** full app shell (header · two-column main · footer), theme toggle with no-flash bootstrap, loading skeletons, placeholder slots. Vitest wired (`test:run`).
- **Done (this slice):** FR-SHELL-01 … FR-SHELL-04 implemented, reviewed, archived.
- **In progress:** — (await commit for app-shell slice)
- **Blocked:** —

## Next steps

1. **Commit** the `i18n` slice (`lib/i18n/uk.ts` + migration + QA reports) with
   `Slice:`/`Refs:` trailers — still uncommitted on top of `54290cf`.
2. **Reload the session** before the next slice so `kurs-maker`/`kurs-reviewer`/
   `kurs-eval-judge` register as real isolated Task-tool subagents.
3. **`/propose-slice currency-list`** then `kurs-maker` — first slice touching the
   live NBU API (`lib/nbu/` fetch wrapper + mapper); reuse the endpoint shapes
   already verified by the `kurs-uah` skill (today + dated archive).
4. Remaining build order: `currency-list` → `converter` → `rate-history` →
   `trend-hint` → `currency-picker` → *(optional)* `footer-sayings`.

## Notes / decisions

- Theme storage key: `hryvnia:theme:v1`; light = no `data-theme` attribute, dark = `data-theme="dark"`.
- `useSyncExternalStore` in `useThemePreference.ts` avoids setState-in-effect lint; `ThemeScript` handles pre-paint bootstrap.
- Footer interim copy: «Дані: відкритий API НБУ · без кук і трекерів» (no fake date until `currency-list`).
- **`lib/i18n/uk.ts` is now the single source of every UI string** — any new slice
  adds its copy there, never inline (enforced by review, not yet by lint; a future
  ESLint rule was flagged as optional hardening in the eval report).
- Review suggestions (optional polish, app-shell): `aria-busy` on loading columns;
  Playwright viewport tests deferred to Stage 8. (`suppressHydrationWarning` already applied.)
- Review suggestions (optional polish, i18n): lock the remaining 6 string literals
  in `uk.test.ts` if copy stability becomes load-bearing; consider a Cyrillic-in-JSX
  lint rule once more slices land.
- Requirement IDs touched: **FR-SHELL-01…04** (app-shell), **FR-I18N-01, NFR-I18N-01** (i18n).
