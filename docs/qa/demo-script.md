# Demo script — «Гривня» (Stage 11, CHECKLIST G6)

> Two scripts: a **narrated walkthrough** (for the human-facing course
> submission recording, Stage 13) and a **per-capability clip list** (for
> the automated headless recordings, also Stage 13 — written here so the
> shot list exists before that stage starts, not improvised then).

---

## Part 1 — Narrated walkthrough (~90 seconds)

For a single continuous screen recording with voiceover or on-screen
captions. Each beat names what to show and the one sentence to say about it.

| # | Time | Action | Say |
|---|---|---|---|
| 1 | 0:00 | Load `localhost:3000` fresh | "«Гривня» — a calm, Ukrainian-first reader for the National Bank of Ukraine's official exchange rates. No login, no key, no tracking." |
| 2 | 0:08 | Point at the date pill | "Every figure is dated honestly — on a weekend or holiday, it says so, never a fake 'today'." |
| 3 | 0:15 | Click USD in the list | "Selecting a currency opens its detail panel: the official rate, a converter, and its recent history." |
| 4 | 0:25 | Type `1000` in the converter, then click swap | "The converter works both directions, locale-aware — comma decimals, never a crash on bad input." |
| 5 | 0:38 | Scroll to the chart, hover a point | "A 30-day history chart with an honest, non-dramatised scale, plus a one-sentence trend summary." |
| 6 | 0:50 | Type `eur` in the search box | "Filtering by code or Ukrainian name." |
| 7 | 0:58 | Clear search, type garbage (`zzz`) | "A clear, calm 'nothing found' message — never a popup, never a crash." |
| 8 | 1:08 | Toggle dark theme | "Full dark mode, WCAG AA contrast-checked in both themes." |
| 9 | 1:18 | Shrink the window to phone width | "Responsive down to mobile, single column, nothing overlapping." |
| 10 | 1:28 | Scroll to footer | "And a small daily Ukrainian saying — deterministic, no tracking, just a calm flourish." |

Total ≈ 90 seconds. Record at 1280×800 or larger so list rows are legible.

---

## Part 2 — Per-capability clip list (for Stage 13's automated headless recordings)

Each clip should be short (5-15s), driven the same way `e2e/*.spec.ts`
drives the app (real `next dev` server, live NBU data, headless Chromium),
and **assert** the FRs it claims to demonstrate before saving the
recording — a clip that doesn't pass its own assertion shouldn't ship.

| Clip | Capability | Shows | Asserts (FRs) |
|---|---|---|---|
| 1 | `app-shell` | Fresh load → header, list, footer all visible | FR-SHELL-01, FR-SHELL-04 |
| 2 | `app-shell` | Theme toggle click, light→dark, no flash | FR-SHELL-03 |
| 3 | `app-shell` | Window resize 1280px → 375px, layout restacks | FR-SHELL-02 |
| 4 | `currency-list` | Select USD, rate + identity render | FR-RATES-01, FR-RATES-02, FR-RATES-04 |
| 5 | `currency-list` (empty/error) | DevTools offline + reload → error state + retry → online + retry recovers | FR-RATES-05, NFR-OBS-01 |
| 6 | `currency-picker` | Type `eur` → list narrows; type garbage → «Нічого не знайдено» | FR-PICK-01, FR-PICK-02, FR-PICK-03 |
| 7 | `converter` | Type `1234,56`, see result; swap direction | FR-CONVERT-01, FR-CONVERT-02, FR-CONVERT-03, FR-CONVERT-04 |
| 8 | `converter` (empty/error) | Type `abc` → result shows `0,00`, no crash | FR-CONVERT-05 |
| 9 | `rate-history` | Chart renders, hover tooltip shows date + rate | FR-HISTORY-01, FR-HISTORY-04 |
| 10 | `rate-history` (empty/error) | Switch currency while offline → chart error + retry | FR-HISTORY-02, FR-HISTORY-03 |
| 11 | `trend-hint` | Trend sentence visible above chart for an active currency | FR-TREND-01, FR-TREND-02, FR-TREND-03 |
| 12 | `footer-sayings` | Footer saying visible; reload shows the same text | FR-SAYINGS-01 |

12 clips, two of which (5, 10) are explicitly the "empty/error states" G6
calls for. Total runtime target: under 4 minutes combined, well within a
single CI artifact upload.

### Recording mechanics (for whoever implements Stage 13)

- Reuse `playwright.config.ts`'s `webServer` (real dev server, live NBU,
  same headless-Chromium setup already proven in `e2e/*.spec.ts`) rather
  than building a second harness.
- Use Playwright's built-in video recording (`use: { video: "on" }` scoped
  to a dedicated `demo` project, not the main `chromium` test project, so
  the e2e suite's pass/fail isn't coupled to recording overhead).
- Each clip's Playwright test **must assert** the FRs in the table above
  before the test ends — the recording is a byproduct of a passing
  assertion, not raw footage with no check behind it. This is the same
  discipline `e2e/*.spec.ts` already follows; Stage 13 extends it, it
  doesn't relax it.
