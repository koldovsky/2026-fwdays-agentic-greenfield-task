# Demo Script — «Поливайко»

> The walkthrough narrative the recorded clips follow. Six clips under
> [`demo-recordings/`](./demo-recordings/), produced headless with
> `npm run qa:record-demos`. Each clip = one `.webm` + one settled `.png` + one
> `.md` explainer, indexed by [`manifest.json`](./demo-recordings/manifest.json).
>
> **Recording rule — one clip per viewport.** Content clips record at
> **1280×800**; the responsive clip records at **360×800**. The recorder fixes
> the viewport per context and never resizes mid-clip, so no frame is stretched.
> Responsive proof is therefore a *separate* clip, not a resize.
>
> Every clip is **asserted** (the harness drove + checked the flow) and reviewed
> eyes-on-pixels in [`vision-report.md`](./vision-report.md) — **6/6 met +
> legible**. The eval (`eval-report.md`) decides graded copy; clips illustrate it.

## Clip order & narrative

### 1. `reminder-home` — the headline screen
**Proves FR-REM-03, FR-REM-04, FR-REM-05.** Open «Поливайко» home. The dark-green
summary banner «Сьогодні полити» shows the due count; the «ПОТРЕБУЮТЬ ПОЛИВУ»
section lists due plants (most overdue first) with a due line and a water-drop
«Полити» action. Two "water now" taps log today's waterings and decrement the
count **3 → 1**. The still captures the **AFTER** state (count «1», the remaining
due plant, the matching green «Полити» on its card).
*Caveat (per vision-report):* a single still cannot show the 3→1 transition; the
decrement is proven by the asserted flow + the e2e test `FR-REM-04/05`, not the
frame alone.

### 2. `plant-crud` — add → detail → edit → list
**Proves FR-PLANT-01, FR-PLANT-05, FR-PLANT-06.** Add a plant, open its detail,
edit it, return to «Мої рослини». The settled list shows the created-then-edited
card titled «…(оновлено)» — direct evidence the create+edit round-trip landed and
the user is back on the list. Status pills («Потребує поливу», «Здорова»,
«Скоро полив») are visible. The intermediate add/detail/edit steps are proven by
the e2e `plants` flow, not the single end-frame.

### 3. `growth-and-watering` — log one of each
**Proves FR-GROWTH-01, FR-GROWTH-02, FR-WATER-01, FR-WATER-03.** On a plant
detail, log a growth measurement and a watering. The growth list («Вимірювання
росту») tops with the new «37.3 см — 30.06.2026» entry and its chart plots three
rising points; the watering list («Поливи») tops with the new dated entry and its
chart plots three points. No spinners, no empty states.

### 4. `charts` — Recharts SVGs on a seeded plant
**Proves FR-CHART-01, FR-CHART-02.** The growth chart «Графік росту рослини»
(green rising curve, Y «Висота (см)» 0–40, three points 9/11.5/37.3) and the
watering chart «Графік поливів рослини» (orange line, Y «Поливів за день» 0–4,
three markers at 1) both render, axis labels and dates legible dark-on-cream.

### 5. `design-system` — «Поливайко» paper theme
**Proves FR-DS-01, FR-DS-03, FR-DS-05, FR-DS-06.** The brand wordmark with the
green drop logo (FR-DS-05/DS-01), warm cream paper background with sage-green
striped image placeholders and forest-green accents (FR-DS-03), themed cards, and
distinct status pills with colored dots — green «Здорова», coral «Потребує
поливу», brown «Скоро полив» (FR-DS-06). Strong contrast (white-on-dark-green
banner). *Known minor:* the small gray «.jpg» placeholder filename captions over
the sage stripes are low-contrast — decorative, non-essential labels (see risk
R-06).

### 6. `responsive-360` — mobile layout (separate viewport clip)
**Proves NFR-COMPAT-01.** At 360 px the home renders as a clean single column —
header (logo + «Рослини»), «Мої рослини», «Додати рослину», the «Сьогодні полити»
summary card, and a vertical stack of plant cards — all within the viewport, no
right-edge overflow, no clipping.

## Reviewing the artifacts (not just generating them)

Before any gate counts these as evidence: every final `.png` and the
frame-sensitive moments of every `.webm` were inspected. `check:recordings`
(`recordings-report.md`, **PASS**) enforces each clip is a real artifact (video
≥10 000 B, screenshot present, flow asserted); `vision-report.md` records the
eyes-on-pixels judge verdict (**6/6**). A broken clip is not shipped as proof.
