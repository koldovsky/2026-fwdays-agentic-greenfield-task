# Risk register — «Гривня» (Stage 11, CHECKLIST G6)

> Every known gap, trade-off, and risk across the project, consolidated from
> all eight per-slice `review-findings.md` sections, the maker's
> `global-review.md`, and both Stage 10 global checker passes. Status
> reflects what's true **today**, re-checked while writing this register —
> several items logged as "open" in earlier docs were closed by Stage 10's
> fixes and are marked Resolved here rather than copied forward stale.

## Severity key

- **High** — could mislead a user or misrepresent NBU data (none currently open).
- **Medium** — a real defect or inconsistency, low user impact, no data risk.
- **Low** — cosmetic, structural, or a deliberate accepted trade-off.

---

## Resolved (closed this project, kept for the record)

| ID | Risk | Severity | Resolution |
|---|---|---|---|
| R-01 | Light/dark-theme text contrast (`--text-muted`/`--text-faint`) fell as low as 2.63:1, under WCAG AA's 4.5:1, across nearly every small-text element | Medium | Stage 8: retuned both tokens in both themes, computed via the real relative-luminance formula; live-confirmed via `e2e/a11y.spec.ts` (0 axe violations, both themes) |
| R-02 | `AsOfBadge`'s stale-rate badge hardcoded a light-theme-only color (`--brass-600`), unreadable in dark mode (2.5:1) | Medium | Stage 8: added theme-aware `--accent-strong` semantic alias |
| R-03 | Converter's amount `<input>` had no accessible name (label not linked via `htmlFor`/`id`) | High (a11y) | Stage 8: added `aria-label` |
| R-04 | Search input had the same weak placeholder-only accessible-name pattern | Low | Stage 9 self-review: added `aria-label` |
| R-05 | Converter's rate-quote line ("1 USD = X") was hard-capped to 2 decimals while the list/focus-panel/chart showed up to 4 — a different rounded number for the same currency on the same screen | Medium | Stage 10: `lib/currency/formatRate.ts` is now the single source of truth for rate display; live-verified JPY shows `0,2758` identically everywhere |
| R-06 | History-fetch error state had no retry button, unlike the sibling rates-fetch error | Low | Stage 10: added `uk.history.retry` + retry button in `CurrencyHistory.tsx`, mirroring `RatesView`'s pattern; live-verified by forcing and recovering from a fetch failure |
| R-07 | `convertFlow.integration.test.ts` missing `@trace` annotation (every other test file has one) | Low (hygiene) | Stage 10: added |
| R-08 | `app-shell`'s `<html>` lacked `suppressHydrationWarning`, theoretical hydration-warning risk on repeat visits with a stored dark preference | Low | Resolved during the `converter` slice (commit `2ccb87b`) — both `<html>` and `<body>` carry it now |

---

## Open — accepted trade-offs (deliberate, documented, not regressions)

| ID | Risk | Severity | Why accepted |
|---|---|---|---|
| R-09 | `app/page.tsx` calls `new Date()` twice (once for staleness, once for the footer saying) instead of once and reusing the value | Low | Both calls execute microseconds apart within the same request; a day-boundary mismatch between them is astronomically unlikely and would only affect which footer saying shows — cosmetic, never a correctness issue for rate data. Independently re-confirmed still present and still low-risk by the Stage 10 global checker. |
| R-10 | `parseAmount` strips non-digit characters rather than rejecting mixed input (`"12abc34"` → `1234`, not `0`) | Low | Matches pre-existing DS behaviour; `NFR-OBS-01` only requires "never crashes," which holds. A stricter reading of `FR-CONVERT-05` could want `0` here, but the spec doesn't mandate rejection. |
| R-11 | `convert()` has no runtime guard for an unrecognized `direction` string | Low | Safe today — the only caller (`Converter.jsx`) only ever passes one of two typed literals. Would need a guard if a second caller were added. |
| R-12 | `CurrencyFocusPanel`'s rate-identity hero number and the converter's rate-quote line intentionally show different precision policies in source (both now correctly use `formatRate`, so the *output* is consistent — the design intent itself, "identity vs. quote line," was always a deliberate split, not a bug) | Low | `design.md` Decision 5; the actual bug (R-05) was the converter not following the shared `formatRate` policy, not the existence of two call sites |
| R-13 | `footer-sayings`'s 12-entry corpus repeats on a ~30-day cycle | Low | Accepted as flavour text; would need a longer corpus only if user feedback raises it |
| R-14 | `weeklyMove` assumes one history point per calendar day, no gap-tolerance fallback | Low | True of the only data source that exists (`mapHistory.ts`'s real output, verified live); would need revisiting only if NBU's history endpoint ever returns sparse data |
| R-15 | `filterRates` does no Unicode normalisation (composed vs. decomposed Cyrillic) | Low | Unlikely to matter for the fixed NBU currency-name set, which the app doesn't control the source encoding of in practice |
| R-16 | `CurrencyHistory`'s loading/error/empty states share the `shell-slot-empty` CSS class (wording is distinct, visual treatment is not) | Low | `FR-HISTORY-03` requires distinct *wording*, which holds; a future pass could add a visual differentiator (icon) as polish |
| R-17 | `app/api/rates/route.ts` returns HTTP 200 with `{ ok: false }` on upstream failure rather than a non-2xx status | Low | Deliberate envelope pattern — the client branches on `result.ok`, never on HTTP status. Undocumented in code; a one-line comment would help future readers, not currently a defect. |
| R-18 | `TrendHint` renders nothing (not even an `aria-live` announcement) when there's insufficient history | Low | The surrounding chart/title still announce normally; a screen-reader user gets no explicit "no trend available" signal, but isn't misled either |

---

## Open — process / operational risks (not code defects)

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| R-19 | `e2e/*.spec.ts` and the manual test plan hit **live NBU data**, not a fixture — a slow or flaky NBU response could make a CI run or manual test flaky, and test assertions describe *shape* (a number, a date) rather than exact values that would break on every real rate change | Low-Medium | Deliberate choice, consistent with how every slice was verified throughout the project (ADR-0002/TC-DATA-01); `playwright.config.ts` sets generous timeouts (15s) on chart-dependent assertions specifically because of this |
| R-20 | No automated **vision check** of the rendered UI exists yet — axe (`e2e/a11y.spec.ts`) catches WCAG-detectable issues only (contrast, missing labels, ARIA misuse); it is blind to layout overlap, visually-dead controls, or general polish that only a human or vision-model pass would catch | Medium | Flagged since the `rate-history` slice; explicitly scoped into **Stage 13** (recorded demo), not silently dropped |
| R-21 | This project targets **Next.js 16.2**, which `AGENTS.md` itself warns may differ from any AI assistant's training data ("This is NOT the Next.js you know") | Low | `node_modules/next/dist/docs/` was read before any framework-surface change throughout the project; ADR-0001 records the locked stack version |
| R-22 | Project-local Claude Code subagent types (`kurs-maker`/`kurs-reviewer`/`kurs-eval-judge` defined in `.claude/agents/*.md`) are **not dispatchable as named subagent types** in the current harness — the maker≠checker separation for the Stage 10 global review was achieved by embedding the role definitions into generic subagent prompts instead | Low | Functionally equivalent independence (fresh context, no build memory) was preserved; noted in `current-state.md` as worth re-checking after a session/environment reload |
| R-23 | A browser extension (`fdprocessedid` DOM attribute injection) produces benign hydration-mismatch console noise on every page load in manual browser verification, unrelated to app code | Low (cosmetic, dev-environment only) | Documented and re-confirmed unrelated to app code at every slice where it appeared (`review-findings.md`); does not occur in headless Playwright/CI runs (no extensions loaded there) |

---

## Acceptance note

**No High-severity risk is currently open.** The two Medium-severity items
that were open before Stage 10 (R-05, R-06) are now Resolved. The remaining
open items are either deliberate, documented trade-offs (R-09…R-18) or
process risks with an existing mitigation or an explicit downstream stage
already scoped to address them (R-19…R-23). Nothing in this register blocks
moving to Stage 12 (PR) by this assessment — see
[acceptance-report.md](acceptance-report.md) for the formal sign-off.
