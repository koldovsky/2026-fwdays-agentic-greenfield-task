## Context

- Baseline spec: `openspec/specs/converter/spec.md` (FR-CONVERT-01 … FR-CONVERT-05).
- `currency-list` already provides the active currency (`RatesView` selection state)
  and its official NBU rate (`Rate.rate`, per-1 unit — verified live in the
  currency-list slice). This slice consumes that data; no new NBU endpoint.
- `@/components/ds`'s `Converter` already implements the two-field layout, swap
  control, and uk-UA formatting — but its `parseAmount`/`fmt` helpers are inline
  and untested. `AGENTS.md` / `docs/mvp-capability-plan.md` mandate
  `lib/currency/{parseAmount,convert}.ts` as the framework-free home for this
  logic (`TC-PURE-01`).
- `CurrencyFocusPanel` is the deliberate extension point (`currency-list`
  design.md Decision 6): this slice adds the converter beneath the identity
  summary when a currency is selected.

## Goals / Non-Goals

**Goals:**

- Bidirectional UAH ⇄ active-currency conversion at the official rate
  (`FR-CONVERT-01`, `FR-CONVERT-03`).
- Locale-aware parsing: comma decimals, trailing zeros, stray spaces ignored
  (`FR-CONVERT-02`, `NFR-LOCALE-01`).
- Locale-aware output: uk-UA comma decimal, thin-space thousands, ₴ suffix in
  mono tabular figures (`FR-CONVERT-04`).
- Total arithmetic: empty/invalid input → `0`, never `NaN`, never throw
  (`FR-CONVERT-05`, `NFR-OBS-01`).
- All converter copy via `lib/i18n/uk.ts` (`FR-I18N-01`).

**Non-Goals:**

- No currency filter/search (`currency-picker`).
- No history chart or trend sentence (`rate-history`, `trend-hint`).
- No new NBU fetch or Route Handler — rate comes from the already-loaded list.
- No cross-rate conversion (EUR → USD) — only UAH ⇄ the single active currency.

## Decisions

### 1. Pure `lib/currency/` — three total functions

```ts
// lib/currency/parseAmount.ts
/** Parse a locale-aware amount string. Total: never throws; empty/invalid → 0. */
export function parseAmount(raw: unknown): number;

// lib/currency/convert.ts
export type ConvertDirection = "foreign-to-uah" | "uah-to-foreign";

/** Convert `amount` using official `rate` (UAH per 1 foreign unit). Total: never throws. */
export function convert(
  amount: number,
  rate: number,
  direction: ConvertDirection,
): number;
// foreign-to-uah: amount * rate
// uah-to-foreign: rate > 0 ? amount / rate : 0
// non-finite amount/rate → 0

// lib/currency/formatAmount.ts
/** Format a number for uk-UA display (comma decimal, thin-space thousands). */
export function formatAmount(n: number, opts?: { decimals?: number }): string;
// non-finite → "0,00"
// default 2 fractional digits (matches spec scenario 1308.4 → "1 308,40")
```

Colocated `*.test.ts` next to each module. Tests written **first**, observed
**RED**, then implementation to **GREEN**.

### 2. DS `Converter` delegates to `lib/currency/`

Refactor `components/ds/rates/Converter.jsx` to import `parseAmount`, `convert`,
and `formatAmount` instead of inline helpers. Behaviour stays the same; the
component remains the UI shell (Input, IconButton, layout). This keeps one
visual implementation and satisfies `TC-PURE-01`'s "domain logic in `lib/`"
rule without duplicating markup in `components/rates/`.

Update `Converter.d.ts` to document optional `labels` prop:

```ts
labels?: {
  amountInForeign: (code: string) => string;  // "Сума у USD"
  amountInUah: string;                         // "Сума у гривнях"
  resultInUah: string;                         // "Це у гривнях"
  resultInForeign: (code: string) => string;   // "Це у USD"
  swap: string;                                // "Поміняти напрям"
};
```

Defaults preserve current hardcoded strings so the design-system preview keeps
working without `uk.ts`.

### 3. Focus panel embeds `Converter` when a rate is active

`CurrencyFocusPanel` receives the selected `Rate | null` (unchanged prop). When
`rate !== null`:

1. Render the existing identity block (avatar, code, name, official rate).
2. Below it, render `<Converter code={rate.code} rate={rate.rate} labels={…} />`
   with labels from `uk.converter.*`.

When `rate === null`, keep the calm `uk.rates.selectPrompt` — no converter,
no blank crash (`NFR-OBS-01`).

The converter is only visible after selection (`FR-RATES-04` contract from
`currency-list` — "active currency for the converter and history").

### 4. Empty / invalid input surfaces as `0,00`, not an error toast

Per spec scenario "Empty input": result is `0` (formatted `0,00 ₴` or
`0,00 {code}`), never `NaN`, never a thrown error, never a toast. The DS
converter's result field already shows the formatted zero — no separate error
UI needed for bad typing (`NFR-OBS-01`).

### 5. Rate line between fields

Keep the DS convention: `1 {code} = {formatAmount(rate)} ₴` between the swap
control and the result field. Uses the same official rate as the list row —
never a fabricated or cached-differently value (`BC-HONESTY-01`).

### 6. i18n strings

Add to `lib/i18n/uk.ts`:

```ts
converter: {
  amountInForeign: (code: string) => `Сума у ${code}`,
  amountInUah: "Сума у гривнях",
  resultInUah: "Це у гривнях",
  resultInForeign: (code: string) => `Це у ${code}`,
  swap: "Поміняти напрям",
},
```

Voice: calm, no exclamation marks (`BC-BRAND-01`). Functions for code-interpolated
labels keep the table typed and centralised.

## Risks / Trade-offs

| Risk | Mitigation |
| --- | --- |
| Locale parsing edge cases (multiple commas, letters mixed in) | Exhaustive unit tests on `parseAmount`: `"100,50"`, `"1 000,5"`, `""`, `"abc"`, `null`, trailing zeros. |
| DS refactor breaks the design-system preview | Defaults on `labels` prop; run `npm run verify` (build includes DS). |
| `rate === 0` causes division by zero in UAH → foreign | `convert` guards: `rate <= 0` or non-finite → `0`. |
| Converter visible only after selection — user may not discover it | Acceptable for MVP; focus panel already prompts selection; eval case covers discoverability. |
| DS `Converter` uses inline styles, not Tailwind classes | Pre-existing DS pattern; out of scope — reuse as-is per `DESIGN.md`. |

## Migration Plan

1. `lib/currency/parseAmount.test.ts` → `parseAmount.ts` (red → green).
2. `lib/currency/convert.test.ts` → `convert.ts` (red → green).
3. `lib/currency/formatAmount.test.ts` → `formatAmount.ts` (red → green).
4. Refactor `components/ds/rates/Converter.jsx` + `.d.ts` to use `lib/currency/`.
5. Add `uk.converter.*`; wire `CurrencyFocusPanel` → `Converter`.
6. `evals/cases/converter.eval.ts`; `npm run verify` green; hand off to checkers.
7. On archive, sync no delta specs (implementation-only); baseline unchanged.

## Open Questions

- None blocking. Whether to reset the amount field on currency change is deferred
  — default: keep typed amount (DS `Converter` is keyed by `code` prop remount
  if we choose reset later; for MVP, remount on `code` change is acceptable and
  avoids stale-direction confusion).
