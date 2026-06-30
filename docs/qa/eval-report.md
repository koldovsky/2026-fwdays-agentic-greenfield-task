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

*Checker #2 only — no source edits made. Failures would return to kurs-maker.*
