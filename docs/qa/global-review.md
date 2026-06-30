# Global maker self-review — «Гривня» (Stage 9, CHECKLIST pre-G7)

> Written by **kurs-maker** (acting in that role) before handing the whole app to
> the global two-checker review (Stage 10). This is a self-audit, not a checker
> pass — maker ≠ checker still holds: Stage 10 must be performed independently,
> not by re-reading this note and rubber-stamping it.

## Scope

Every capability slice built this project (`app-shell`, `i18n`, `currency-list`,
`converter`, `currency-picker`, `rate-history`, `trend-hint`, `footer-sayings`)
plus Stage 8's cross-cutting hardening (integration test, Playwright e2e, axe
a11y fixes). Not yet covered: the QA proof pack (Stage 11) or a vision-judge
pass on the rendered UI (Stage 13) — both out of scope for this note.

## Headline

**All 25 MVP requirements + the 1 Future requirement (`FR-SAYINGS-01`) are
implemented.** Every slice's two-checker review (`kurs-reviewer` +
`kurs-eval-judge`) returned **CLEAN**, one after a blocking defect found during
that review was fixed first (`rate-history`). Stage 8's automated a11y scan
found and fixed three further real defects that no per-slice review had
caught, because no automated a11y tooling existed before Stage 8. While
writing this note I found and fixed one more, smaller instance of the same
defect class (below).

## FR coverage

25/25 MVP FRs cited in exactly one `openspec/specs/` capability
(`npm run check:trace` — green). Per-capability requirement IDs are recorded
in `docs/current-state.md`'s Notes section; not duplicated here.

## What I'd flag to the checkers myself

Consolidated from the eight per-slice `review-findings.md` "Suggestions
(non-blocking)" sections — re-checked against the current code, not just
copied, since some have since been resolved or superseded:

### Already resolved (flagged once, fixed since)

- **`app-shell` suggestion:** `<html>` lacked `suppressHydrationWarning`.
  **Resolved** — both `<html>` and `<body>` carry it now
  (`app/layout.tsx:41,44`), part of the `converter`-slice hydration fixes
  (commit `2ccb87b`).
- **`currency-picker` suggestion:** the search `Input` had no
  `aria-label`/`<label>` association, accessible name from `placeholder`
  alone. **Fixed during this self-review pass** —
  `components/rates/RatesView.tsx` now passes `aria-label={uk.picker.placeholder}`,
  mirroring the same fix Stage 8 applied to the converter's amount field
  (`components/ds/rates/Converter.jsx`). Re-ran `npm run test:run` (117/117)
  and `npm run lint` (clean) after the change.

### Accepted trade-offs (deliberate, still true, not regressions)

- `parseAmount` strips non-digit characters rather than rejecting mixed
  input (`"12abc34"` → `1234`, not `0`). Matches pre-existing DS behaviour;
  `NFR-OBS-01` only requires "never crashes," which holds.
- `convert()` has no runtime guard for an unrecognized `direction` string;
  safe today because the only caller passes one of two typed literals.
- `CurrencyFocusPanel`'s rate-identity display (4 decimals) and the
  converter's rate line (2 decimals, via `formatAmount`) intentionally show
  different precision for the same number — `design.md` Decision 5.
- `weeklyMove` assumes one history point per calendar day (no gap-tolerance
  fallback); true of the only data source that exists (`mapHistory.ts`).
- The `footer-sayings` 12-entry corpus repeats on a ~30-day cycle; accepted
  as flavour text, not a defect.
- `app/page.tsx` calls `new Date()` twice (once for `stale`, once for
  `saying`) instead of once; cosmetic risk only, not fixed, not blocking.

### Still open, genuinely deferred

- **No e2e/automation existed for FR-SHELL-02's responsiveness** at the time
  of the `app-shell` review. **Now covered** — `e2e/responsive.spec.ts`
  (Stage 8) closes this gap; leaving the note here so Stage 10's checkers
  don't have to re-derive that it was closed.
- `TrendHint` renders nothing (not even an `aria-live` announcement) when
  there's insufficient history — a screen-reader user gets no signal a
  trend *could* have appeared. Minor; the surrounding chart/title still
  announce normally.
- `filterRates` does no Unicode normalisation (composed vs. decomposed
  Cyrillic); unlikely to matter for the fixed NBU currency-name set.
- `CurrencyHistory`'s empty and error states share one CSS class
  (`shell-slot-empty`) — wording is correctly distinct, visual treatment is
  not. Cosmetic.
- `app/api/rates/route.ts` returns HTTP 200 with `{ ok: false }` on upstream
  failure rather than a non-2xx status — deliberate envelope pattern, but
  undocumented in code; a one-line comment would help future readers.

## What Stage 8 found that prior reviews didn't

Worth restating here because it's the single most consequential finding of
the whole project, not specific to one slice: **before Stage 8, no automated
a11y scan ever ran against this app.** Eight clean per-slice manual reviews
did not catch three real WCAG defects — two contrast failures spanning
nearly every small-text element in both themes, and one critical missing
accessible name. Full detail in
[`docs/qa/automated-verification-latest.md`](automated-verification-latest.md).
This is a process lesson, not just a code fix: manual review of token *choices*
("uses semantic tokens, not raw hex") does not catch token *values* being
wrong. Recommend Stage 10's checkers re-run `npm run test:e2e` themselves
rather than trusting this note's "all green" claim.

## Self-assessed readiness for Stage 10

- `npm run verify` green, `npm run test:run` green (117/117), `npm run test:e2e`
  green (14/14), lint clean — re-confirmed at the end of this note, after the
  search-input fix above.
- Every per-slice eval case (`evals/cases/*.eval.ts`) exists and traces its FRs;
  `docs/qa/eval-report.md` has one section per slice, all PASS (lowest score
  95/100, `footer-sayings`; no FAILs).
- Known gaps are listed above with severity — none are blocking by my own
  assessment, but that assessment is exactly what Stage 10 exists to
  independently verify, not assume.
