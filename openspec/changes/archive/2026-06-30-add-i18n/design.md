## Context

- Baseline spec: `openspec/specs/i18n/spec.md` (FR-I18N-01, NFR-I18N-01).
- Current state: Ukrainian literals are inline in `components/app-shell/*`,
  `app/page.tsx`, and `app/layout.tsx` (metadata) — six distinct strings, two of
  which (`Список курсів`, `Обрана валюта`) currently appear **twice**, once as an
  `aria-label` in `AppShell.tsx` and once as a visible title in `app/page.tsx`.
- This slice does not add a runtime i18n library (`NFR-I18N-01` forbids one) and
  does not add an `en.ts` fallback (the brief marks that Future).

## Goals / Non-Goals

**Goals:**

- One typed table, `lib/i18n/uk.ts`, as the single source of every user-facing
  Ukrainian string shipped so far.
- No component contains an inline Ukrainian (or copy) string literal.
- Shared concepts (the two column labels) are defined once and reused — fixing
  the existing duplication, not just relocating it.
- Zero behavioural change: the rendered text is byte-identical to today.

**Non-Goals:**

- No runtime i18n library, no language switcher, no `en.ts` fallback (Future).
- No new copy — this slice only relocates strings already shipped in `app-shell`.

## Decisions

### 1. Table shape — typed object, not a `t(key)` function

```ts
// lib/i18n/uk.ts
export const uk = {
  shell: {
    brandTitle: "Гривня",
    brandSubtitle: "Офіційний курс НБУ",
    themeToggleLabel: "Темна тема",
    ratesColumnLabel: "Список курсів",
    focusColumnLabel: "Обрана валюта",
    footerProvenance: "Дані: відкритий API НБУ · без кук і трекерів",
  },
  home: {
    ratesPlaceholderHint: "Тут з'явиться офіційний перелік валют НБУ.",
    focusPlaceholderHint: "Тут буде курс, конвертер і динаміка обраної валюти.",
  },
  meta: {
    title: "Гривня — офіційний курс НБУ",
    description:
      "Офіційний курс гривні до іноземних валют за даними Національного банку України: курс, конвертер і динаміка.",
  },
} as const;
```

**Chosen:** a plain `as const` nested object, imported and read by dotted path
(`uk.shell.brandTitle`). This **is** the "typed accessor" the spec requires:
TypeScript narrows every leaf to its literal string type, so a typo in a call
site (`uk.shell.brandTitel`) is a compile error, not a silent runtime miss —
with **zero runtime cost** and no library (`NFR-I18N-01`).

**Rejected:** a `t(key: string)` lookup function. It would re-introduce exactly
the runtime indirection `NFR-I18N-01` forbids, and string-keyed lookup is
*less* typed than direct property access (typos are only caught if every call
site is also unit-tested).

### 2. Deduplicating the column labels

`ratesColumnLabel` / `focusColumnLabel` are defined once in `uk.shell` and
imported by **both** `AppShell.tsx` (as `aria-label`) and `app/page.tsx` (as the
placeholder title) — removing the pre-existing duplication, not just moving it.

### 3. Verification — content tests on the table itself

Because `uk.ts` is pure data, its tests assert the table's own properties
(traceable to FR-I18N-01 / the brand-voice scenario), not component rendering:

- every leaf is a non-empty string;
- no leaf contains `!` (`BC-BRAND-01` — no exclamation marks, enforced here so a
  future edit to the table cannot silently violate the brand voice);
- the known brand strings match their exact expected value (locks the copy).

### 4. Migration plan

1. Add `lib/i18n/uk.ts` + `lib/i18n/uk.test.ts` (red → green: write the test
   against a not-yet-existing module first, confirm it fails to resolve, then
   create the module).
2. Update `AppHeader.tsx`, `AppFooter.tsx`, `AppShell.tsx`, `app/page.tsx`,
   `app/layout.tsx` to import from `uk` instead of inline literals.
3. Run `npm run test:run` + visually confirm rendered text is unchanged.
4. `npm run verify` green; hand off to checkers.
5. On archive, sync no delta specs (implementation-only); baseline unchanged.

## Risks / Trade-offs

| Risk | Mitigation |
| --- | --- |
| A copy-paste during migration silently changes wording | Table values copied verbatim from the current source files; `uk.test.ts` locks the two brand strings exactly. |
| Grep misses an inline literal | `grep` for Cyrillic ranges across `app/` and `components/` before and after migration (zero matches after). |
| Over-engineering (adding a lookup function) | Explicitly rejected in Decision 1 — direct property access is simpler and more typed. |

## Open Questions

- None blocking. `en.ts` fallback structure (Future, `NFR-I18N-01`) is left for
  a later change — `uk.ts`'s shape (flat-ish nested object) is fallback-ready
  without rework.
