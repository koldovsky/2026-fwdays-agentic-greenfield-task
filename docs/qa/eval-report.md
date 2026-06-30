# Eval reports — «Гривня»

Structured output from **kurs-eval-judge** (Checker #2: quality). One section per
slice, appended in build order. The maker fixes failures; kurs-reviewer
(Checker #1) judges spec compliance + correctness separately.

---

## Slice: `app-shell` — 2026-06-30

**Judge:** kurs-eval-judge (Checker #2)  
**Date:** 2026-06-30 (Europe/Kyiv)  
**Capability:** `app-shell`  
**Traces:** FR-SHELL-01, FR-SHELL-04  
**Sources graded:** `AppHeader.tsx`, `AppFooter.tsx`, `AppShell.tsx`, `ShellSkeleton.tsx`, `ThemeScript.tsx`, `useThemePreference.ts`, `app/page.tsx`, `app/globals.css`, `app/layout.tsx`, `lib/theme/theme.ts`

---

## Overall verdict

| | |
|---|---|
| **Verdict** | **PASS** |
| **Total score** | **96 / 100** |
| **Automatic fails** | None |

The app-shell slice delivers calm Ukrainian-first copy, an accessible theme toggle with flash-free persistence, honest footer provenance, and skeleton loading that respects reduced motion. No exclamation marks, fake dates, or alarming empty states were found in user-facing strings.

---

## Rubric scores

### 1. `lockup-readable` — **97 / 100** — **PASS** (weight 25 → 24.3)

**Criterion:** The «Гривня» lockup and «Офіційний курс НБУ» subtitle are readable in Ukrainian, calm serif/mono pairing, no exclamation marks.

| Check | Result |
|---|---|
| Title «Гривня» in serif | ✓ `font-family: var(--font-serif)`, weight 600 |
| Subtitle «Офіційний курс НБУ» in mono | ✓ `font-family: var(--font-mono)`, uppercase, muted |
| Ukrainian, calm tone | ✓ |
| No exclamation marks | ✓ |

**Evidence:**

```23:24:components/app-shell/AppHeader.tsx
            <span className="app-header__title">Гривня</span>
            <span className="app-header__subtitle">Офіційний курс НБУ</span>
```

**Deduction (−3):** Logo mark uses `alt=""` (acceptable as decorative when adjacent text names the brand), but the subtitle is very small (`--text-2xs`) — still readable at desktop sizes; worth watching on narrow viewports.

---

### 2. `theme-discoverable` — **96 / 100** — **PASS** (weight 20 → 19.2)

**Criterion:** The theme toggle (Switch) is visible in the header with an accessible label; switching to dark applies `data-theme` without a flash on reload.

| Check | Result |
|---|---|
| Switch visible in header | ✓ Right-aligned in `app-header__inner` |
| Accessible label | ✓ `label="Темна тема"` + `aria-label` on `role="switch"` |
| `data-theme="dark"` applied | ✓ via `useThemePreference` → `document.documentElement.dataset.theme` |
| No flash on reload | ✓ Blocking `ThemeScript` in `layout.tsx` reads `localStorage` before paint |

**Evidence:**

```27:31:components/app-shell/AppHeader.tsx
        <Switch
          checked={dark}
          onChange={setDark}
          label="Темна тема"
        />
```

```24:26:lib/theme/theme.ts
export function themeBootstrapScript(): string {
  return `(function(){try{var r=localStorage.getItem("${THEME_STORAGE_KEY}");var t=r==="dark"?"dark":"";if(t)document.documentElement.dataset.theme=t;else delete document.documentElement.dataset.theme;}catch(e){}})();`;
}
```

**Deduction (−4):** Label describes the option («Темна тема») rather than current state («Увімкнено» / «Вимкнено»); still meets accessible-label requirement via `aria-checked`.

---

### 3. `skeleton-calm` — **92 / 100** — **PASS** (weight 25 → 23.0)

**Criterion:** While loading, skeleton placeholders occupy comparable footprint to content — the page never feels blank or crashed; pulse respects `prefers-reduced-motion`.

| Check | Result |
|---|---|
| Skeleton in both columns while loading | ✓ `AppShell` `loading={true}` for ~600 ms in `page.tsx` |
| Comparable footprint | ✓ Hero 10 rem + two 3 rem rows ≈ panel height |
| Not blank / crashed | ✓ Sticky header + footer always visible |
| `prefers-reduced-motion` | ✓ Pulse gated behind `@media (prefers-reduced-motion: no-preference)` |

**Evidence:**

```184:188:app/globals.css
@media (prefers-reduced-motion: no-preference) {
  .shell-skeleton__block {
    animation: shell-pulse var(--dur-slow) var(--ease-soft) infinite alternate;
  }
}
```

**Deduction (−8):** Skeleton blocks are generic rectangles — adequate footprint but do not mirror the eventual list-row / detail-panel structure; screen readers get `aria-hidden` skeleton with no `aria-busy` on columns (minor a11y gap, not an automatic fail).

---

### 4. `footer-provenance` — **100 / 100** — **PASS** (weight 15 → 15.0)

**Criterion:** Footer provenance line is honest and calm («Дані: відкритий API НБУ · без кук і трекерів»); no fake «станом на» date; no exclamation marks.

| Check | Result |
|---|---|
| Exact honest provenance copy | ✓ Matches rubric exemplar |
| No fake date | ✓ No «станом на» or «сьогодні» |
| Calm mono styling | ✓ `--text-2xs`, `--text-muted` |
| No exclamation marks | ✓ |

**Evidence:**

```6:8:components/app-shell/AppFooter.tsx
        <p className="app-footer__provenance">
          Дані: відкритий API НБУ · без кук і трекерів
        </p>
```

---

### 5. `empty-honest` — **94 / 100** — **PASS** (weight 15 → 14.1)

**Criterion:** Optional empty-slot copy, if shown, is a calm Ukrainian sentence — not alarming, not a toast, no exclamation marks.

| Check | Result |
|---|---|
| Empty-slot mechanism | ✓ `shell-slot-empty` with `role="status"`, inline (not toast) |
| Placeholder copy after load | ✓ Forward-looking hints, not error tone |
| No exclamation marks | ✓ |
| Not alarming | ✓ |

**Evidence (placeholder hints on `/`):**

```35:42:app/page.tsx
          title="Список курсів"
          hint="Тут з'явиться офіційний перелік валют НБУ."
        />
      }
      right={
        <PlaceholderPanel
          title="Обрана валюта"
          hint="Тут буде курс, конвертер і динаміка обраної валюти."
```

**Evidence (empty-slot path, unused on home but implemented):**

```31:35:components/app-shell/AppShell.tsx
  if (emptyMessage) {
    return (
      <p className="shell-slot-empty" role="status">
        {emptyMessage}
      </p>
```

**Deduction (−6):** Placeholder panels are slightly more prominent than a minimal empty slot — acceptable for a shell preview, but copy could be tighter once real data loads (out of scope for this slice).

---

## Scenario checks

| Scenario | Description | Verdict | Notes |
|---|---|---|---|
| `initial-load` | Header lockup + theme toggle, two-column main at 1200 px, footer | **PASS** | Grid splits at `min-width: 1100px`; header sticky, footer bordered |
| `loading-skeleton` | First ~600 ms both columns show skeletons | **PASS** | `useState(true)` + `setTimeout(600)` drives `loading` prop |
| `theme-toggle` | Toggle to dark; reload preserves choice without flash | **PASS** | `ThemeScript` + `hryvnia:theme:v1` localStorage key |

---

## Automatic-fail audit

| Trigger | Result |
|---|---|
| Exclamation marks in user copy | **None found** |
| Fake «станом на» / today dates | **None found** |
| Alarming empty states / toasts | **None found** |
| Missing accessible theme label | **Present:** «Темна тема» |

---

## Weighted total

| Criterion | Weight | Score | Weighted |
|---|---|---:|---:|
| `lockup-readable` | 25 | 97 | 24.3 |
| `theme-discoverable` | 20 | 96 | 19.2 |
| `skeleton-calm` | 25 | 92 | 23.0 |
| `footer-provenance` | 15 | 100 | 15.0 |
| `empty-honest` | 15 | 94 | 14.1 |
| **Total** | **100** | | **96 / 100** |

---

## Fixes for maker (optional polish — not blocking)

1. **Skeleton a11y:** Consider `aria-busy="true"` on loading columns or a visually hidden «Завантаження…» status — skeleton is `aria-hidden`.
2. **Theme label:** Optionally reflect state («Темна тема увімкнена») for clearer screen-reader feedback.
3. **Skeleton shape:** When rate-list ships, align skeleton blocks with row/card geometry for tighter footprint match.

---

## Slice: `i18n` — 2026-06-30

**Judge:** kurs-eval-judge (Checker #2)
**Date:** 2026-06-30 (Europe/Kyiv)
**Capability:** `i18n`
**Traces:** FR-I18N-01, NFR-I18N-01
**Sources graded:** `lib/i18n/uk.ts`, `lib/i18n/uk.test.ts`, `AppHeader.tsx`, `AppFooter.tsx`, `AppShell.tsx`, `app/page.tsx`, `app/layout.tsx`

---

### Overall verdict

| | |
|---|---|
| **Verdict** | **PASS** |
| **Total score** | **98 / 100** |
| **Automatic fails** | None |

The migration centralises every user-facing string into one typed table,
fixes a pre-existing duplication (the two column labels), preserves the brand
voice exactly, and changes no rendered output.

---

### Rubric scores

#### 1. `copy-centralised` — **100 / 100** — **PASS** (weight 35 → 35.0)

**Criterion:** No component or page under `app/` or `components/` contains an
inline Ukrainian (or metadata) string literal — every user-facing string is
read from `lib/i18n/uk.ts`.

| Check | Result |
|---|---|
| `AppHeader.tsx` reads `uk.shell.*` | ✓ lines 24-25, 31 |
| `AppFooter.tsx` reads `uk.shell.footerProvenance` | ✓ line 8 |
| `AppShell.tsx` reads `uk.shell.*ColumnLabel` | ✓ lines 57, 68 |
| `app/page.tsx` reads `uk.shell.*` / `uk.home.*` | ✓ lines 36-37, 42-43 |
| `app/layout.tsx` metadata reads `uk.meta.*` | ✓ lines 31-32 |
| Independent recursive scan for stray Cyrillic literals | ✓ zero matches outside `lib/i18n/uk.ts` |

**Evidence:**

```24:25:components/app-shell/AppHeader.tsx
            <span className="app-header__title">{uk.shell.brandTitle}</span>
            <span className="app-header__subtitle">{uk.shell.brandSubtitle}</span>
```

---

#### 2. `voice-consistent` — **100 / 100** — **PASS** (weight 25 → 25.0)

**Criterion:** Every string in the table reads Ukrainian-first, calm, and
consistent with the brand voice (`BC-BRAND-01`) — no exclamation marks anywhere.

| Check | Result |
|---|---|
| All 9 leaves read calm, plain Ukrainian | ✓ manual read |
| No exclamation marks anywhere in the table | ✓ confirmed by inspection and `uk.test.ts:30-34` |
| Currency/system codes stay Latin where present | ✓ (none yet introduced in this slice) |

**Evidence:**

```13:18:lib/i18n/uk.ts
    brandTitle: "Гривня",
    brandSubtitle: "Офіційний курс НБУ",
    themeToggleLabel: "Темна тема",
    ratesColumnLabel: "Список курсів",
    focusColumnLabel: "Обрана валюта",
    footerProvenance: "Дані: відкритий API НБУ · без кук і трекерів",
```

---

#### 3. `labels-deduplicated` — **96 / 100** — **PASS** (weight 20 → 19.2)

**Criterion:** The rates/focus column labels are defined exactly once in
`uk.shell` and reused verbatim by both the shell's `aria-label`s and the page's
visible placeholder titles — not two separate literals that happen to match.

| Check | Result |
|---|---|
| `AppShell.tsx` `aria-label`s read `uk.shell.ratesColumnLabel`/`focusColumnLabel` | ✓ |
| `app/page.tsx` titles read the same two properties | ✓ |
| Single definition site (not two matching literals) | ✓ `lib/i18n/uk.ts:16-17` |

**Deduction (−4):** the reuse is correct and verified, but nothing in the type
system *prevents* a future call site from re-introducing a parallel literal
that happens to match — this is a process discipline win (caught by review),
not a structurally enforced one. Acceptable for a string table without a
lint rule; noted for awareness only.

---

#### 4. `zero-behaviour-change` — **96 / 100** — **PASS** (weight 20 → 19.2)

**Criterion:** The migration is purely structural: rendered text, metadata
title/description, and `aria-label`s are byte-identical to the `app-shell`
slice before this change.

| Check | Result |
|---|---|
| Brand title/subtitle unchanged | ✓ |
| Footer provenance unchanged | ✓ |
| Metadata title (em-dash preserved) unchanged | ✓ |
| Placeholder hint (curly apostrophe preserved) unchanged | ✓ |

**Deduction (−4):** verified by targeted spot-checks (the two non-ASCII
punctuation marks) and full-text comparison of the nine migrated strings
against their pre-migration source, not by an automated byte-diff against the
prior commit. Low residual risk, not a fail — `kurs-reviewer` independently
confirmed the same two non-ASCII cases.

---

### Automatic-fail audit

| Trigger | Result |
|---|---|
| Exclamation marks in user copy | **None found** |
| Fake «станом на» / today dates | **N/A — not introduced by this slice** |
| Alarming empty states / toasts | **N/A — not introduced by this slice** |
| `NaN` / raw error in user-facing copy | **None found** |

---

### Weighted total

| Criterion | Weight | Score | Weighted |
|---|---:|---:|---:|
| `copy-centralised` | 35 | 100 | 35.0 |
| `voice-consistent` | 25 | 100 | 25.0 |
| `labels-deduplicated` | 20 | 96 | 19.2 |
| `zero-behaviour-change` | 20 | 96 | 19.2 |
| **Total** | **100** | | **98 / 100** |

---

### Fixes for maker (optional polish — not blocking)

1. None blocking. Optional future hardening: an ESLint rule (e.g. a custom
   `no-restricted-syntax` matching Cyrillic in JSX text/string literals) would
   make `copy-centralised` structurally enforced rather than review-enforced —
   worth considering once more slices land and the surface area grows.

---

## Slice: `currency-list` — 2026-06-30

**Judge:** kurs-eval-judge (Checker #2)
**Date:** 2026-06-30 (Europe/Kyiv)
**Capability:** `currency-list`
**Traces:** FR-RATES-03, FR-RATES-05, BC-HONESTY-01, NFR-OBS-01
**Sources graded:** `RatesView.tsx`, `CurrencyRow.tsx`, `CurrencyFocusPanel.tsx`, `app/page.tsx`, `app/api/rates/route.ts`, `lib/i18n/uk.ts` (`rates.*`), the live-rendered `.next/server/app/index.html`

---

### Overall verdict

| | |
|---|---|
| **Verdict** | **PASS** |
| **Total score** | **95 / 100** |
| **Automatic fails** | None |

Graded against the live-rendered output, not just source: the build actually
hit NBU and rendered real rates, so this is the first slice judged partly on
genuine production data rather than a description of intended behaviour.

---

### Rubric scores

#### 1. `stale-date-honest` — **94 / 100** — **PASS** (weight 30 → 28.2)

**Criterion:** When the official rate is from a previous business day, the
`AsOfBadge` shows that real date plainly («Курс за DD.MM.YYYY») — never
relabelled as today, never alarming.

| Check | Result |
|---|---|
| Stale flag computed from real NBU `exchangedate`, not a guess | ✓ `lib/nbu/kyivDate.ts` — pure, tested |
| Computed server-side for first load (no hydration mismatch) | ✓ `app/page.tsx:8` |
| `AsOfBadge` receives both `date` and `stale` | ✓ `RatesView.tsx:70-74` |
| Live build rendered the **non-stale** "Станом на" label | ✓ confirmed in `.next/server/app/index.html` — today's Kyiv date matched NBU's published date at build time |

**Deduction (−6):** the weekend/holiday-stale branch ("Курс за …") was
verified by unit test and code inspection, but not observed live in this
session's build (the build happened to run on a day NBU's rate was current).
Genuinely untestable on demand without mocking the system clock or waiting
for a weekend build — not a defect, just an evidence gap for *this specific
grading session*.

---

#### 2. `error-calm-inline` — **96 / 100** — **PASS** (weight 30 → 28.8)

**Criterion:** On fetch failure, the error message is calm, specific, inline
(not a toast), and offers a clear retry action; no exclamation marks, no
stack trace, no raw error text.

| Check | Result |
|---|---|
| Inline placement (replaces the list, not an overlay/toast) | ✓ `RatesView.tsx:46-60` |
| `role="status"` (accessible, non-intrusive) | ✓ |
| Calm wording, no exclamation marks | ✓ `uk.rates.loadError`: "Не вдалося завантажити курс. Спробуйте ще раз." |
| Retry action present and labelled | ✓ `uk.rates.retry`: "Спробувати ще раз" |
| No raw error / stack trace ever reaches the UI | ✓ every catch path in `fetchTodayRates.ts` swallows the underlying error and returns `{ ok: false }` |

**Deduction (−4):** the retry button reuses the DS `Button`'s `outline`
variant — calm, but visually similar to a generic secondary action; a future
slice could give retry a slightly more distinct affordance once more error
states exist to compare against. Polish, not a defect.

---

#### 3. `rate-readability` — **96 / 100** — **PASS** (weight 25 → 24.0)

**Criterion:** Every rate is rendered in mono tabular figures, uk-UA
formatted (comma decimal), with the ₴ unit clearly attached.

| Check | Result |
|---|---|
| `toLocaleString('uk-UA', …)` used for every displayed rate | ✓ `CurrencyRow.tsx:24-27`, `CurrencyFocusPanel.tsx:21-24` |
| Mono + tabular-nums styling | ✓ `.currency-row__rate`, `.currency-focus__rate` (`font-family: var(--font-mono); font-variant-numeric: tabular-nums`) |
| ₴ attached, visually de-emphasised vs. the number | ✓ `.currency-row__unit`/`.currency-focus__unit` (smaller, `--text-faint`/`--accent`) |
| Live-rendered output confirms real formatted numbers | ✓ build HTML contains live USD/EUR rates in this format |

**Deduction (−4):** `maximumFractionDigits: 4` on the list row vs. the focus
panel's same setting is consistent, but neither pads to a fixed decimal
width — columns with mixed 2-vs-4-decimal rates (e.g. `44,92` next to
`0,2775`) won't align as a perfectly ruled ledger. Acceptable for a first
data slice; a fixed-width formatting pass could tighten this later.

---

#### 4. `no-fabricated-trend` — **100 / 100** — **PASS** (weight 15 → 15.0)

**Criterion:** Currency rows show no trend/delta indicator — this slice has
no real day-over-day data, and a fabricated flat pill would be dishonest.

| Check | Result |
|---|---|
| `CurrencyRow` renders no `TrendBadge` | ✓ |
| Vendored `RateRow` (which forces a `delta`) is not used | ✓ confirmed by reviewer (Checker #1) and independently by reading `CurrencyRow.tsx` |

**Evidence:**

```12:39:components/rates/CurrencyRow.tsx
export function CurrencyRow({
  rate,
  selected,
  onSelect,
}: {
  rate: Rate;
  selected: boolean;
  onSelect: (code: string) => void;
}) {
  …
  return (
    <button …>
      <CurrencyAvatar code={rate.code} size="md" />
      <span className="currency-row__identity">…</span>
      <span className="currency-row__rate">…</span>
    </button>
  );
}
```

No trend element anywhere in the row.

---

### Automatic-fail audit

| Trigger | Result |
|---|---|
| Exclamation marks in user copy | **None found** |
| Fake «станом на» / today dates on a stale rate | **None found** — `AsOfBadge` always receives the real `exchangedate` |
| Alarming empty states / toasts | **None found** — error is inline, `role="status"`, calm wording |
| `NaN` / raw error in user-facing copy | **None found** — every NBU failure path resolves to the fixed `uk.rates.loadError` string, never the underlying error |

---

### Weighted total

| Criterion | Weight | Score | Weighted |
|---|---:|---:|---:|
| `stale-date-honest` | 30 | 94 | 28.2 |
| `error-calm-inline` | 30 | 96 | 28.8 |
| `rate-readability` | 25 | 96 | 24.0 |
| `no-fabricated-trend` | 15 | 100 | 15.0 |
| **Total** | **100** | | **95 / 100** |

---

### Fixes for maker (optional polish — not blocking)

1. None blocking. Optional: fixed-width / padded decimal formatting so mixed
   2-and-4-decimal rates align as a stricter ledger column.
2. Optional: a visually distinct retry affordance (vs. generic `outline`
   button) once more error states exist across the app to compare against.

---

## Slice: `converter` — 2026-06-30

**Judge:** kurs-eval-judge (Checker #2)  
**Date:** 2026-06-30 (Europe/Kyiv)  
**Capability:** `converter`  
**Traces:** FR-CONVERT-01, FR-CONVERT-02, FR-CONVERT-03, FR-CONVERT-04, FR-CONVERT-05, NFR-LOCALE-01, NFR-OBS-01  
**Sources graded:** `components/ds/rates/Converter.jsx`, `components/rates/CurrencyFocusPanel.tsx`, `lib/i18n/uk.ts` (`converter.*`), `lib/currency/{parseAmount,formatAmount,convert}.ts`

---

### Overall verdict

| | |
|---|---|
| **Verdict** | **PASS** |
| **Total score** | **95 / 100** |
| **Automatic fails** | None |
| **Pass threshold** | Each rubric criterion ≥ 70 |

The converter slice delivers calm Ukrainian labels, locale-aware parsing without alarming error UI, uk-UA mono tabular results with correct unit suffixes, and a direction swap that flips labels while keeping the official rate line visible. No exclamation marks, `NaN`, toasts, or crash paths appear in user-facing copy.

---

### Rubric scores

#### 1. `locale-input-clarity` — **94 / 100** — **PASS** (weight 30 → 28.2)

**Criterion:** The amount field accepts comma decimals («100,50») and ignores stray spaces without alarming errors, toasts, or crashes on garbage input.

| Check | Result |
|---|---|
| Comma decimal parsed (`100,50` → 100.5) | ✓ `parseAmount.ts:8-13` + unit tests |
| Stray spaces ignored (`1 000,50`) | ✓ strips `\s` before parse |
| Trailing zeros accepted (`100,500`) | ✓ |
| Garbage / empty → 0, never throws | ✓ no error toast or inline alarm |
| `inputMode="decimal"` on amount field | ✓ mobile keyboard hint |

**Evidence:**

```46:51:components/ds/rates/Converter.jsx
        <Input
          mono align="right" size="lg" suffix={fromUnit}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
        />
```

**Deduction (−6):** invalid characters (e.g. «abc») remain visible in the input while the result calmly shows «0,00» — correct per NFR-OBS-01, but a sighted user gets no gentle hint that the typed characters were ignored (not alarming, slightly opaque).

---

#### 2. `result-formatting` — **97 / 100** — **PASS** (weight 30 → 29.1)

**Criterion:** Conversion results render in mono tabular figures with uk-UA formatting (comma decimal, grouped thousands) and the correct unit suffix (₴ or ISO code).

| Check | Result |
|---|---|
| `toLocaleString('uk-UA', …)` via `formatAmount` | ✓ comma decimal + thin-space thousands |
| Tabular mono on result | ✓ `fontFamily: var(--font-mono)`, `fontVariantNumeric: tabular-nums` |
| Unit suffix matches direction | ✓ `toUnit` is `₴` (foreign→UAH) or ISO code (UAH→foreign) |
| Official rate line between fields | ✓ `1 {code} = {formatAmount(rate)} ₴` |
| Non-finite guard → «0,00» | ✓ `formatAmount.ts:10` |

**Evidence:**

```76:84:components/ds/rates/Converter.jsx
          <span style={{
            fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
            fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-lg)', color: 'var(--brand)',
          }}>
            {formatAmount(result)}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--brand)', opacity: 0.7 }}>
            {toUnit}
          </span>
```

**Deduction (−3):** ₴ sits in a separate span rather than a single «1 308,40 ₴» string — visually correct and matches the focus-panel hero pattern, but the number and unit are two nodes (minor consistency nit vs. spec exemplar wording).

---

#### 3. `swap-discoverability` — **94 / 100** — **PASS** (weight 25 → 23.5)

**Criterion:** The swap control has a calm Ukrainian label; activating it visibly flips direction and recalculates the result — no exclamation marks.

| Check | Result |
|---|---|
| Calm Ukrainian label | ✓ `uk.converter.swap`: «Поміняти напрям» |
| No exclamation marks | ✓ confirmed in `uk.ts` and `uk.test.ts:31-34` |
| Direction flip on activate | ✓ toggles `foreign-to-uah` ↔ `uah-to-foreign` |
| Field labels flip with direction | ✓ `amountInForeign`/`amountInUah`, `resultInUah`/`resultInForeign` |
| Rate line stays visible | ✓ unchanged `1 {code} = … ₴` row |
| Accessible name + tooltip | ✓ `IconButton` `aria-label` + `title={label}` |

**Evidence:**

```55:63:components/ds/rates/Converter.jsx
        <IconButton
          icon="arrow-down-up"
          label={labels.swap}
          variant="soft"
          onClick={() => setDirection((d) => d === 'foreign-to-uah' ? 'uah-to-foreign' : 'foreign-to-uah')}
        />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          1 {code} = <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{formatAmount(rate)} ₴</span>
        </span>
```

**Deduction (−6):** label is icon-only with tooltip/`aria-label` per DS `IconButton` convention — meets «has a calm Ukrainian label», but sighted users who never hover may rely on the arrow icon alone for discoverability.

---

#### 4. `empty-input-calmness` — **100 / 100** — **PASS** (weight 15 → 15.0)

**Criterion:** Clearing the amount field shows «0,00» in the result — never NaN, never a blank crash, never a toast.

| Check | Result |
|---|---|
| Empty string → parseAmount 0 | ✓ |
| convert(0, …) → 0 | ✓ `convert.ts:13` |
| formatAmount(0) → «0,00» | ✓ unit test |
| No error UI on clear | ✓ no conditional error branch in Converter |
| No toast | ✓ |

**Evidence:**

```33:35:components/ds/rates/Converter.jsx
  const value = parseAmount(amount);
  const fromForeign = direction === 'foreign-to-uah';
  const result = convert(value, rate, direction);
```

Clearing the field yields `formatAmount(0)` → «0,00» with no auxiliary error surface.

---

### Scenario checks

| Scenario | Description | Verdict | Notes |
|---|---|---|---|
| `comma-decimal-conversion` | USD, enter «100,50» → uk-UA mono result with ₴ | **PASS** | `parseAmount` + `formatAmount` pipeline; amount field `mono` + suffix |
| `swap-direction` | Activate «Поміняти напрям» — labels/units flip; rate line stays | **PASS** | Direction state drives labels and `toUnit`; rate row unchanged |
| `empty-input` | Clear amount → «0,00» calmly; no error UI | **PASS** | Total parse/convert/format chain |
| `currency-change-reset` | New currency remounts fresh direction/amount | **PASS** | `CurrencyFocusPanel` `key={rate.code}` on `<Converter>` |

---

### Automatic-fail audit

| Trigger | Result |
|---|---|
| Exclamation marks in user copy | **None found** — `uk.converter.*` and defaults clean |
| Fake «станом на» / today dates | **None found** — rate line is unit quote only |
| Alarming empty states / toasts | **None found** |
| `NaN` / raw error in user-facing copy | **None found** — `formatAmount` guards non-finite |

---

### Weighted total

| Criterion | Weight | Score | Weighted |
|---|---:|---:|---:|
| `locale-input-clarity` | 30 | 94 | 28.2 |
| `result-formatting` | 30 | 97 | 29.1 |
| `swap-discoverability` | 25 | 94 | 23.5 |
| `empty-input-calmness` | 15 | 100 | 15.0 |
| **Total** | **100** | | **95 / 100** |

---

### Fixes for maker (optional polish — not blocking)

1. **Invalid-input hint:** Optionally strip or softly highlight non-numeric characters on blur — keep calm, no toast (would tighten `locale-input-clarity` evidence).
2. **Swap discoverability:** Optional visible text adjacent to the icon («Поміняти напрям») for sighted users who do not hover — only if DESIGN approves departing from icon-only `IconButton`.
3. **Label voice:** «Це у гривнях» / «Це у {code}» are calm; a future polish could align result captions with «one number then detail» if a copy pass lands.

---

## Slice: `currency-picker` — 2026-06-30

**Judge:** kurs-eval-judge (Checker #2)
**Date:** 2026-06-30 (Europe/Kyiv)
**Capability:** `currency-picker`
**Traces:** FR-PICK-01, FR-PICK-02, FR-PICK-03
**Sources graded:** `components/rates/RatesView.tsx`, `lib/currency/filterRates.ts`, `lib/i18n/uk.ts` (`picker.*`)

---

### Overall verdict

| | |
|---|---|
| **Verdict** | **PASS** |
| **Total score** | **97 / 100** |
| **Automatic fails** | None |

A small, focused slice that does exactly what its spec asks, reuses the
already-established `CurrencyRow` (no fabricated trend reintroduced), and
gets the empty-query-vs-no-match distinction right — the easiest place for
this kind of filter to get subtly wrong.

---

### Rubric scores

#### 1. `filter-correctness` — **97 / 100** — **PASS** (weight 35 → 34.0)

**Criterion:** Typing an ISO code or a Ukrainian-name substring narrows the
rendered rows to exactly the matching currencies, case-insensitive; clearing
the field restores the full list.

| Check | Result |
|---|---|
| Code match, case-insensitive | ✓ `filterRates.test.ts` (`"usd"`, `"UsD"`) |
| Name match, case-insensitive substring | ✓ (`"дол"` → USD, `"ЄВРО"` → EUR) |
| Clearing the field restores the full list | ✓ empty query short-circuits to `rates` unchanged |
| Live build renders the search input with the locked placeholder | ✓ confirmed in `.next/server/app/index.html` |

**Deduction (−3):** no debounce — fine at ~45 rows (explicitly a documented
non-goal), but the rubric can't fully verify perceived snappiness without
a live interaction, only the absence of any artificial delay in the code.

---

#### 2. `empty-result-calm` — **98 / 100** — **PASS** (weight 35 → 34.3)

**Criterion:** A non-matching query shows the exact «Нічого не знайдено»
wording inline, in place of the rows — never a toast, never an alarming tone,
never the `AsOfBadge` disappearing too.

| Check | Result |
|---|---|
| Exact wording, locked by test | ✓ `uk.picker.noMatch === "Нічого не знайдено"` |
| `role="status"`, inline (reuses `.shell-slot-empty`) | ✓ |
| No exclamation marks | ✓ |
| `AsOfBadge` stays visible during a no-match filter | ✓ confirmed by reading render order, outside the conditional |

**Deduction (−2):** the empty message and the `AsOfBadge` are visually
adjacent with the same body text size — a slightly stronger visual
separation (e.g. more vertical space) would make the "list is filtered, not
broken" read even faster at a glance. Cosmetic.

---

#### 3. `selection-still-works` — **96 / 100** — **PASS** (weight 30 → 28.8)

**Criterion:** Selecting a currency from a filtered (narrowed) result list
correctly sets the active currency and updates the focus/converter panel,
identically to selecting from the unfiltered list.

| Check | Result |
|---|---|
| Filtered rows use the same `onSelect={setActiveCode}` | ✓ no parallel selection path |
| Active selection persists if its row is later filtered out of view | ✓ verified deliberate (Checker #1) — `activeRate` reads from the full list |
| Focus panel / converter unaffected by filter state | ✓ `right={<CurrencyFocusPanel rate={activeRate} />}` doesn't depend on `query` |

**Deduction (−4):** the "selection persists while filtered out of view" choice
is correct and intentional, but there's no visible affordance (like a chip or
a "clear filter" link) telling the user their selection is still active when
its row isn't shown — a minor discoverability gap, not a correctness issue.

---

### Automatic-fail audit

| Trigger | Result |
|---|---|
| Exclamation marks in user copy | **None found** |
| Wrong/paraphrased empty-result wording | **None found** — exact match, test-locked |
| Toast used for the empty state | **None found** — inline, `role="status"` |
| Selection broken after filtering | **None found** |

---

### Weighted total

| Criterion | Weight | Score | Weighted |
|---|---:|---:|---:|
| `filter-correctness` | 35 | 97 | 34.0 |
| `empty-result-calm` | 35 | 98 | 34.3 |
| `selection-still-works` | 30 | 96 | 28.8 |
| **Total** | **100** | | **97 / 100** |

---

### Fixes for maker (optional polish — not blocking)

1. None blocking. Optional: a small "selected currency" indicator near the
   filter input when the active selection is filtered out of the visible rows.

---

## Slice: `rate-history` — 2026-06-30

**Judge:** kurs-eval-judge (Checker #2)
**Date:** 2026-06-30 (Europe/Kyiv)
**Capability:** `rate-history`
**Traces:** FR-HISTORY-01, FR-HISTORY-03, FR-HISTORY-04, NFR-OBS-01
**Sources graded:** `components/rates/HistoryChart.tsx`, `components/rates/CurrencyHistory.tsx`, `lib/i18n/uk.ts` (`history.*`), live `/api/history` responses

**Note:** graded after Checker #1's fix (empty vs. error distinction in
`fetchHistory.ts`) was already applied — this grading reflects the corrected
behaviour, not the original defect.

---

### Overall verdict

| | |
|---|---|
| **Verdict** | **PASS** |
| **Total score** | **94 / 100** |
| **Automatic fails** | None |

A real, reliably-rendering chart (verified against live data, not just a
description of intent) with calm empty/error states that are now genuinely
distinct, not just textually different on paper.

---

### Rubric scores

#### 1. `chart-readability` — **93 / 100** — **PASS** (weight 30 → 27.9)

**Criterion:** The chart reads calmly: brand-coloured area with a soft
gradient, mono tabular axis ticks and tooltip values, no theatrical
animation.

| Check | Result |
|---|---|
| Gradient area, brand colour | ✓ `HistoryChart.tsx:67-70` (`hryv-history-fill`, matches vendored design) |
| Mono tabular axis ticks | ✓ `axisTick` uses `var(--font-mono)` |
| Mono tabular tooltip value | ✓ `HistoryTooltip` formats via `toLocaleString('uk-UA', …)` |
| No animation | ✓ `isAnimationActive={false}` on `<Area>` |
| Real recharts import, not UMD (ADR-0004) | ✓ confirmed no `window.Recharts` reference anywhere in this slice |

**Deduction (−7):** the chart was visually verified only via the live JSON
API response and code reading, not an actual rendered-pixel screenshot in
this grading pass — a genuine vision check (Stage 8/13 demo recordings) is
the appropriate place to confirm the rendered gradient/grid/tooltip actually
look calm, not just that the code requests them to.

---

#### 2. `honest-y-domain` — **95 / 100** — **PASS** (weight 25 → 23.8)

**Criterion:** Small day-to-day moves render as a roughly flat line, not an
exaggerated swing — the y-domain is padded around the actual data range.

| Check | Result |
|---|---|
| Same padding formula as the vendored, brand-approved design | ✓ `pad = max((max-min)*0.35, max*0.004)` |
| Live USD data (44.27–44.98 over 30 days, ~1.6% range) confirms a genuinely small move | ✓ — exactly the case this requirement exists for |

**Deduction (−5):** the 0.35/0.004 constants are carried over verbatim from
the vendored `RateChart.jsx` without independent justification recorded
anywhere — reasonable (it's the brand-approved formula), but if a future
currency has much larger swings (e.g. a volatile period), no test currently
locks the padding behaviour at the extremes.

---

#### 3. `calm-empty-error` — **96 / 100** — **PASS** (weight 25 → 24.0)

**Criterion:** Empty and error states are calm, inline, and distinct from
each other — the user can tell "no data published" apart from "fetch
failed."

| Check | Result |
|---|---|
| Distinct copy: `uk.history.empty` vs. `uk.history.loadError` | ✓ genuinely different wording |
| Both reachable in practice | ✓ **only after Checker #1's fix** — verified live (`?code=ZZZ` → empty path) |
| `role="status"`, inline, no toast | ✓ |
| No raw error text ever surfaces | ✓ |

**Deduction (−4):** both states reuse the identical `shell-slot-empty` CSS
class (Checker #1 already flagged this) — correct wording, generic styling.

---

#### 4. `loading-never-blank` — **94 / 100** — **PASS** (weight 20 → 18.8)

**Criterion:** While history is loading, a skeleton of comparable footprint
to the eventual chart is shown.

| Check | Result |
|---|---|
| Skeleton block sized to match the chart (240px) | ✓ `.currency-history__skeleton { height: 240px }` matches `HistoryChart`'s default `height` prop exactly |
| `aria-hidden` on the skeleton wrapper | ✓ |

**Deduction (−6):** the loading skeleton is a single static block (reuses
`ShellSkeleton`'s pulse styling), not shaped like a chart silhouette — honest
and adequate, but a more chart-like skeleton (e.g. a faint flat line) would
read even calmer. Cosmetic.

---

### Automatic-fail audit

| Trigger | Result |
|---|---|
| Exclamation marks in user copy | **None found** |
| Empty state indistinguishable from error (would be a fail) | **Was true before the fix — now correctly distinct** |
| Toast for empty/error | **None found** — both inline, `role="status"` |
| Raw error text in user-facing copy | **None found** |

---

### Weighted total

| Criterion | Weight | Score | Weighted |
|---|---:|---:|---:|
| `chart-readability` | 30 | 93 | 27.9 |
| `honest-y-domain` | 25 | 95 | 23.8 |
| `calm-empty-error` | 25 | 96 | 24.0 |
| `loading-never-blank` | 20 | 94 | 18.8 |
| **Total** | **100** | | **94 / 100** |

---

### Fixes for maker (optional polish — not blocking)

1. None blocking — the one defect this rubric would have automatically
   failed on (`calm-empty-error`'s reachability) was already caught and
   fixed by Checker #1 before this grading pass.
2. Optional: a chart-shaped loading skeleton instead of a flat block.
3. Optional: visually differentiate the empty vs. error inline states.

---

## Slice: `trend-hint` — 2026-06-30

**Judge:** kurs-eval-judge (Checker #2)
**Date:** 2026-06-30 (Europe/Kyiv)
**Capability:** `trend-hint`
**Traces:** FR-TREND-01, FR-TREND-02, FR-TREND-03, BC-BRAND-01
**Sources graded:** `components/rates/TrendHint.tsx`, `lib/currency/{weeklyMove,trendSentence}.ts`, `lib/i18n/uk.ts` (`trend.*`), three live-rendered sentences (EGP/XDR/LBP)

---

### Overall verdict

| | |
|---|---|
| **Verdict** | **PASS** |
| **Total score** | **98 / 100** |
| **Automatic fails** | None |

The strongest result this session: all three classification branches
(strengthen/weaken/flat) were exercised against **real, live NBU data** —
not synthetic fixtures chosen to hit each branch — and every one produced
calm, correctly-toned, grammatically-sound Ukrainian.

---

### Rubric scores

#### 1. `calm-phrasing` — **98 / 100** — **PASS** (weight 35 → 34.3)

**Criterion:** No exclamation marks, no hype, no alarm, regardless of
direction.

| Check | Result |
|---|---|
| Live "up" sentence calm | ✓ «EGP за тиждень зміцнів на 0,92% до гривні.» |
| Live "down" sentence calm, even on a large move | ✓ «XAG за тиждень послабшав на 12,46% до гривні.» — no alarm despite the size of the move |
| Live "flat" sentence calm | ✓ «LBP за тиждень майже без змін до гривні.» |
| Test-locked exclamation-free for all three tones | ✓ `trendSentence.test.ts`, `uk.test.ts` |

**Deduction (−2):** a 12.46% weekly move (XAG/silver) is genuinely large, and
the sentence treats it with exactly the same calm register as a 0.28% move —
arguably *correct* per the brand voice ("honest, never overstated," never
alarmist), but worth a human gut-check on whether a very large move should
still read identically calm. Judged as intentional, not a defect.

---

#### 2. `correct-direction-wording` — **100 / 100** — **PASS** (weight 35 → 35.0)

**Criterion:** Wording matches the actual sign/magnitude, sourced from the
single `trendTone` classifier.

| Check | Result |
|---|---|
| `tone="up"` → «зміцнів» | ✓ live: EGP |
| `tone="down"` → «послабшав» | ✓ live: XDR, XAG |
| `tone="flat"` (±0.05%) → «майже без змін» | ✓ live: LBP at exactly 0.000% |
| Classification comes from the *same* `trendTone` as `TrendBadge`, not a duplicate | ✓ confirmed by Checker #1 |

No deductions — independently re-verified all three by recomputing the
percentage from raw `/api/history` JSON and confirming it matched the
rendered sentence exactly.

---

#### 3. `number-then-detail` — **96 / 100** — **PASS** (weight 30 → 28.8)

**Criterion:** Leads with the currency and magnitude before the qualitative
read.

| Check | Result |
|---|---|
| Code leads every sentence | ✓ "EGP за тиждень…", "XDR за тиждень…" |
| Magnitude stated plainly, not buried | ✓ "…на 0,92% до гривні." |

**Deduction (−4):** this is Decision 1's accepted trade-off (code-as-subject
instead of the declined Ukrainian name) — reads slightly more like a ticker
than the spec's own prose example («Долар за тиждень…»). Documented and
justified in design.md, not an oversight, so the deduction is small and
expected, not a flag for the maker.

---

### Automatic-fail audit

| Trigger | Result |
|---|---|
| Exclamation marks | **None found** (live, 3/3 tones) |
| Wrong direction word for the actual sign | **None found** — independently recomputed |
| Hardcoded/inline Ukrainian string outside `uk.ts` | **None found** — `trendSentence.ts` reads only `uk.trend.*` |
| Hint shown with insufficient history | **N/A this grading pass** — not specifically forced, but `weeklyMovePct`'s `null` contract is unit-tested |

---

### Weighted total

| Criterion | Weight | Score | Weighted |
|---|---:|---:|---:|
| `calm-phrasing` | 35 | 98 | 34.3 |
| `correct-direction-wording` | 35 | 100 | 35.0 |
| `number-then-detail` | 30 | 96 | 28.8 |
| **Total** | **100** | | **98 / 100** |

---

### Fixes for maker (optional polish — not blocking)

None blocking. The code-as-subject trade-off (Decision 1) is the only thing
keeping this from a perfect score, and it's a deliberate, documented,
proportionate scope cut — not something to "fix" without a real declension
budget.

---

*Checker #2 only — no source edits made. Failures would return to kurs-maker.*
