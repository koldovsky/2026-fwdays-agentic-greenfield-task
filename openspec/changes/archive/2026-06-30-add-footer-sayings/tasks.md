## 1. Kyiv day-of-year — extend, don't replace (tests first)

- [x] 1.1 Write a test for `kyivDayOfYear` in `lib/nbu/kyivDate.test.ts`
      (`@trace FR-SAYINGS-01`): a known date maps to the correct day-of-year
      (e.g. 2026-01-01 → 1; 2026-12-31 → 365, 2026 is not a leap year);
      confirm existing `kyivDateString`/`isStaleRate`/`kyivYmd`/`addKyivDays`
      tests still pass unmodified. Observe **RED** for the new export.
- [x] 1.2 Extend `lib/nbu/kyivDate.ts` with `kyivDayOfYear`, sharing the
      existing `kyivParts` helper. Run until **GREEN** (all kyivDate tests).

## 2. Sayings corpus + pure selection (tests first)

- [x] 2.1 Add `lib/sayings/sayings.ts` — a fixed array of calm Ukrainian
      money one-liners, no exclamation marks (`BC-BRAND-01`).
- [x] 2.2 Write `lib/sayings/selectSaying.test.ts` against the not-yet-existing
      `./selectSaying` (`@trace FR-SAYINGS-01`): the same date always returns
      the same saying (determinism); different known dates select the
      expected index via `dayOfYear % length`; an empty sayings array returns
      `""` rather than throwing. Observe **RED**.
- [x] 2.3 Add `lib/sayings/selectSaying.ts`. Run until **GREEN**.
- [x] 2.4 Add a brand-voice test asserting every entry in `sayings.ts` is
      non-empty, Ukrainian (Cyrillic), and contains no `!`.

## 3. Thread the saying through the shell (no hydration risk)

- [x] 3.1 `app/page.tsx` — compute `const saying = selectSaying(SAYINGS, new
      Date())` once, server-side (same pattern as `isStaleRate`).
- [x] 3.2 `RatesView.tsx` — new `saying: string` prop; pass `footerSaying={saying}`
      to **both** `<AppShell>` call sites (error and success branches).
- [x] 3.3 `AppShell.tsx` — new `footerSaying?: string` prop, passed to `<AppFooter>`.
- [x] 3.4 `AppFooter.tsx` — renders the saying below the existing provenance line.

## 4. Eval case

- [x] 4.1 Add `evals/cases/footer-sayings.eval.ts` — rubric: calm/dry tone, no
      exclamation marks, money/currency relevance, determinism (same day =
      same saying).

## 5. Verification

- [x] 5.1 `npm run test:run` — all unit tests green.
- [x] 5.2 `npm run verify` — lint + check:trace + spec:validate + build green.
- [x] 5.3 Live-verify in a real browser: footer shows a saying; reload shows
      the same one.
- [x] 5.4 Tick all tasks above; update `docs/current-state.md` for maker handoff.
