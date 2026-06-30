# Manual Test Plan — «Поливайко»

> For a non-developer to execute in **Chrome** (latest). Covers the core flows.
> UI copy is Ukrainian; dates are Europe/Kiev and shown as `DD.MM.YYYY`.

## Setup

1. From the project root run `npm run db:seed` to load a realistic demo dataset
   (plants with measurements, waterings, and varied watering statuses).
2. Run `npm run dev` and open `http://localhost:3000` in Chrome.
3. The home screen is the «Поливайко» reminder home (FR-REM-03/04/06).

> If you want a clean run, you can re-seed at any time with `npm run db:seed`.

---

## MTC-01 — Add a plant with a watering interval
**Proves:** FR-PLANT-01, FR-PLANT-02, FR-REM-01 · NFR-USA-01

1. From the home screen click **«Додати рослину»**.
2. Enter a name (e.g. `Фікус`). Leave species blank.
3. Set the watering interval in days (e.g. `5`).
4. Click save («Зберегти»).

**Expected:** Returns to a view showing the new plant. Species defaults to
`Грошове дерево (Crassula ovata)`. The interval is stored. The flow took ≤2
clicks from the home view to the add form (NFR-USA-01).

**Negative:** Clear the name and save → an inline message appears **next to the
name field** in Ukrainian (e.g. «Вкажіть назву рослини»); no raw error page, no
silent save (FR-SHELL-03, eval `empty-plant-name`).

---

## MTC-02 — Log a growth measurement with a decimal comma
**Proves:** FR-GROWTH-01, FR-GROWTH-05 · NFR-USA-03

1. Open a plant's detail page.
2. In the measurements section («Вимірювання росту»), enter height `12,5`
   (with a **comma**), leave the date at its default (today).
3. Click **«Записати»**.

**Expected:** The measurement is saved as `12.5 см`, dated today shown as
`DD.MM.YYYY`, and appears at the **top** of the list (most-recent-first, SC-3).

**Negative:** Enter `-3` or `abc` → inline height-specific message in Ukrainian
(«Вкажіть висоту як додатне число в сантиметрах», example `12,5`), no save
(FR-GROWTH-05, eval `invalid-height`).

---

## MTC-03 — Log a watering with a note
**Proves:** FR-WATER-01, FR-WATER-02, FR-WATER-03 · NFR-USA-01

1. On a plant's detail page, in the waterings section («Поливи»), leave the date
   at today, type a short note (e.g. `Полив відстояною водою`).
2. Click **«Записати»**.

**Expected:** The watering appears at the top of the waterings list, dated
today (`DD.MM.YYYY`), with the note shown.

**Negative:** A note over 500 characters → inline note message naming the
500-char limit; a future date → inline "today or earlier" message (eval
`invalid-watering`, SC-2). Neither saves.

---

## MTC-04 — Reminder home: "water now" decrement + all-done
**Proves:** FR-REM-03, FR-REM-04, FR-REM-05, FR-REM-06

1. On the home screen, read the dark summary card «Сьогодні полити **N**» (count
   of due plants) and the «ПОТРЕБУЮТЬ ПОЛИВУ» section listing due plants, most
   overdue first, each with a due line and a water-drop **«Полити»** action.
2. Click **«Полити»** on one due row.

**Expected:** A watering dated today is logged for that plant; the summary count
decrements by 1; that row's control swaps to a done/confirmation state
(FR-REM-05).

3. Repeat until no plant is due.

**Expected:** The home shows the **all-done** empty state — «Усі политі! 🌱» with
a reassurance line «Сьогодні нічого поливати — ваші рослини доглянуті.»
(FR-REM-06, eval `all-done-empty-state`).

---

## MTC-05 — Charts render and update
**Proves:** FR-CHART-01, FR-CHART-02, FR-CHART-03, FR-CHART-04

1. Open a seeded plant's detail page.

**Expected:** Above the waterings section, the **watering chart**
(«Графік поливів рослини», Y-axis «Поливів за день») renders. Above the
measurements section, the **growth chart** («Графік росту рослини», Y-axis
«Висота (см)») renders. Both show dated X-axes (FR-CHART-01/02).

2. Add a new measurement (MTC-02).

**Expected:** The growth chart gains a point reflecting the new value
(FR-CHART-04).

3. Open a plant with no data (or a fresh plant).

**Expected:** Each chart shows a distinct Ukrainian **empty state** (not a
loading spinner or error), inviting the first entry (FR-CHART-03, eval
`empty-chart-states`).

---

## MTC-06 — Status pills
**Proves:** FR-REM-02, FR-REM-07

1. On the home list and on a plant's detail page, observe the status pill.

**Expected:** Each plant shows one of: green «Здорова» (healthy), brown/clay
«Скоро полив» (soon), coral «Потребує поливу» (overdue/due), each with a colored
dot. Status reflects last watering date + the plant's interval vs today (Kiev); a
never-watered plant reads as due (FR-REM-02).

---

## MTC-07 — Responsive at 360 px
**Proves:** NFR-COMPAT-01

1. Open Chrome DevTools → device toolbar → set width to **360 px**.
2. Load the home screen and a plant detail page.

**Expected:** Single-column layout, no horizontal scroll/overflow, all controls
(add button, summary card, plant cards, action buttons) visible and tappable
within the viewport. Matches clip **responsive-360**.

---

## MTC-08 — Delete safety
**Proves:** FR-PLANT-07, FR-GROWTH-04, FR-WATER-05 · NFR-DATA-02

1. Delete a measurement and a watering on a detail page.

**Expected:** Each delete asks for confirmation and removes **only** that single
row.

2. Delete the plant.

**Expected:** Confirmation step; deleting the plant also removes its
measurements and waterings (cascade), and nothing else (FR-PLANT-07, SC-5).
