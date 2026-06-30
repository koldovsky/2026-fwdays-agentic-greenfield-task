## 1. String table (tests first)

- [x] 1.1 Write `lib/i18n/uk.test.ts` against the not-yet-existing `./uk` module
      (`@trace FR-I18N-01`): no leaf contains `!`; no empty leaf; `uk.shell.brandTitle`
      === "Гривня"; `uk.shell.brandSubtitle` === "Офіційний курс НБУ". Observe **RED**
      (module not found).
- [x] 1.2 Add `lib/i18n/uk.ts` — `export const uk = {...} as const` with `shell`,
      `home`, `meta` groups, copied verbatim from the current inline strings (see
      design.md Decision 1). Run tests until **GREEN**.

## 2. Migrate app-shell components

- [x] 2.1 `AppHeader.tsx` — replace `"Гривня"`, `"Офіційний курс НБУ"`,
      `"Темна тема"` with `uk.shell.brandTitle` / `brandSubtitle` / `themeToggleLabel`.
- [x] 2.2 `AppFooter.tsx` — replace the provenance literal with `uk.shell.footerProvenance`.
- [x] 2.3 `AppShell.tsx` — replace the two `aria-label` literals with
      `uk.shell.ratesColumnLabel` / `uk.shell.focusColumnLabel`.

## 3. Migrate the page and metadata

- [x] 3.1 `app/page.tsx` — `PlaceholderPanel` titles read the same
      `uk.shell.ratesColumnLabel` / `focusColumnLabel` (no duplicate string); hints
      read `uk.home.ratesPlaceholderHint` / `focusPlaceholderHint`.
- [x] 3.2 `app/layout.tsx` — `metadata.title` / `metadata.description` read
      `uk.meta.title` / `uk.meta.description`.

## 4. Eval case

- [x] 4.1 Add `evals/cases/i18n.eval.ts` with rubric: copy is centralised (no
      inline literals remain); brand voice is consistent across the migrated
      strings; no exclamation marks; column labels match exactly between the
      shell's `aria-label`s and the page's visible titles.

## 5. Verification

- [x] 5.1 `grep` for Cyrillic literals across `app/` and `components/` outside
      `lib/i18n/uk.ts` — zero matches.
- [x] 5.2 `npm run test:run` — all unit tests green (including the new `uk.test.ts`).
- [x] 5.3 `npm run verify` — lint + check:trace + spec:validate + build green.
- [x] 5.4 Tick all tasks above; update `docs/current-state.md` for maker handoff.
