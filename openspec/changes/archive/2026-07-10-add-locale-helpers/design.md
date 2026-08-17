## Context

MVP needs Ukrainian amount-in-words and date-in-words for invoice/act templates (`amount-cursive`, `date`, `date-cursive`). Capability `locale-helpers` is phase 1: pure functions, no UI/FS. The repo already has a Next.js App Router scaffold and a legacy script `helpers/chislo-propisom.js` (amount only; uses backtick apostrophes; `main` does not return a value). Product API and golden examples are fixed in DESIGN.md / FR-20 / FR-21 / TC-22 / TC-23.

## Goals / Non-Goals

**Goals:**

- Export `amountToCursive`, `dateToNumeric`, and `dateToCursive` as typed, importable pure functions
- Match PRD golden strings exactly (TC-22, TC-23), including Ukrainian apostrophe in words like `п'ятдесят`
- Unit tests that lock those examples (and minimal extra cases for gender/declension of гривня)
- Module ready for later import from `template-fill`

**Non-Goals:**

- UI, routes, session, or template filling
- Other locales or currencies (BC-10, BC-13)
- Auth / ЕДО / legal compliance (BC-02, BC-03, BC-08)
- Wiring helpers into HTML templates (that is `template-fill`)

## Decisions

### 1. Location and language

- **Choice:** TypeScript module at `lib/locale-helpers.ts` (or `lib/locale/index.ts` if split), exported named functions.
- **Rationale:** Matches App Router conventions; no React dependency; easy to import from server/client later.
- **Alternatives:** Keep/extend `helpers/chislo-propisom.js` as-is — rejected (untyped, wrong apostrophe, incomplete API, not testable as a library). Port logic into TS and leave the old file unused or delete in implementation if nothing imports it.

### 2. Public API

```ts
amountToCursive(n: number): string
dateToNumeric(d: Date | string): string  // → DD.MM.YYYY
dateToCursive(d: Date | string): string  // → "D місяця YYYY р."
```

- **Input for amounts:** `number` in гривні (integer or fractional). Fractional part → two-digit копійки (e.g. `8750` → `00 копійок`; `8750.5` → `50 копійок`). Round to 2 decimal places before splitting.
- **Input for dates:** `Date` or a `DD.MM.YYYY` string (TC-23 uses `15.05.2021`). Invalid input MAY throw; callers in template-fill will pass validated session dates.
- **Rationale:** Matches DESIGN.md / capabilities.md names exactly so template-fill does not need adapters.

### 3. Amount algorithm

- **Choice:** Port the existing Ukrainian number-to-words approach (groups of three, feminine forms for тисячі / гривня) into clean TS; capitalize the first letter; append `гривня|гривні|гривень` + `NN` + `копійка|копійки|копійок`.
- **Apostrophe:** Use U+0027 `'` in word stems (`п'ять`, `п'ятдесят`, …) to match FR-20 / TC-22 — not backtick.
- **Gender fixes:** Keep the known replacements for `Один/Два` → `Одна/Дві` before `гривня/гривні` (as in the legacy script).
- **Alternatives:** npm package for Ukrainian number words — rejected for MVP to avoid dependency risk and to lock exact PRD strings.

### 4. Date algorithm

- **Choice:** Hardcode Ukrainian genitive month names (`січня` … `грудня`); format day without leading zero in cursive (`15`), with zero-padding in numeric (`15.05.2021`); suffix ` р.`
- **Timezone:** For `Date` inputs, use UTC calendar components **or** local — pick **local** getters (`getFullYear`, `getMonth`, `getDate`) so a date constructed as local midnight stays stable for document dates. Prefer parsing `DD.MM.YYYY` strings when the session stores a date string, to avoid TZ drift.
- **Alternatives:** `Intl.DateTimeFormat('uk-UA')` — possible for months, but string shape must still match PRD exactly (`15 травня 2021 р.`), so a small explicit map is clearer and testable.

### 5. Testing

- **Choice:** Add Vitest (or Node’s built-in test runner) + a `test` script; place tests next to the module (`lib/locale-helpers.test.ts`) or under `lib/__tests__/`.
- **Must cover:** TC-22 (`8750` → exact string), TC-23 (`15.05.2021` → numeric + cursive).
- **Should cover:** `0`, `1`/`2` гривня gender, a fractional amount, another month.
- **Rationale:** No test runner in `package.json` yet; this change introduces the minimal harness for pure helpers without waiting on document-session.

## Risks / Trade-offs

- [Legacy script diverges from PRD apostrophe] → Treat PRD/TC as source of truth; rewrite stems in TS; do not call the JS file from production code.
- [Timezone shifts change `dateToCursive(new Date(...))`] → Prefer `DD.MM.YYYY` string input in tests and document that session should store/pass calendar dates as strings or local midnights.
- [Edge amounts (negative, NaN, huge)] → Out of MVP scope; throw or clamp only if needed for type safety; template-fill will pass non-negative totals.
- [Exact spacing/punctuation drift] → Golden-string unit tests; no fuzzy match.

## Migration Plan

1. Implement TS module + tests; add test script/deps.
2. Confirm TC-22/TC-23 pass.
3. Optionally remove or leave `helpers/chislo-propisom.js` unreferenced (no runtime migration).
4. No deploy/rollback concerns — library-only change.

## Open Questions

- None blocking. Test runner choice (Vitest vs `node:test`) can be decided at apply time; prefer Vitest if the team wants watch mode, otherwise `node:test` to avoid a new dependency.
