# Manual test plan — «Гривня» (Stage 11, CHECKLIST G6)

> Written for a non-developer tester. No code, no terminal beyond the one
> startup command. Every step says exactly what to click and what you should
> see. Ukrainian UI text is quoted exactly so you can match it without
> needing to read Ukrainian.

## Setup (one-time)

1. Open a terminal in the project folder.
2. Run `npm install` (only needed once).
3. Run `npm run dev`.
4. Open **http://localhost:3000** in a Chrome or Edge browser. (If port 3000
   is busy, the terminal will print the port it actually used — use that
   instead.)
5. You need an internet connection — the app calls the real National Bank of
   Ukraine (NBU) data feed live; there is no offline/demo mode.

If the page doesn't load at all, stop and report it — that alone is a failure
of FR-RATES-01.

---

## Test 1 — First load (FR-SHELL-01, FR-RATES-01, FR-RATES-02, FR-RATES-03)

1. Load the page fresh (hard refresh: Ctrl+Shift+R / Cmd+Shift+R).
2. **Expect:** within a couple of seconds you see:
   - A header with a coin logo, the word **"Гривня"**, and underneath it
     **"ОФІЦІЙНИЙ КУРС НБУ"**.
   - A pill near the top-left reading either **"Станом на DD.MM.YYYY"**
     (today's date) or **"Курс за DD.MM.YYYY · офіційний курс НБУ"** (a past
     date — this is normal on weekends/holidays, when NBU doesn't publish a
     new rate).
   - A long list of currencies below, each row showing a 2-3 letter code
     (USD, EUR, …), a Ukrainian name, and a number ending in **"₴"**.
3. **Expect:** the numbers use a **comma** for the decimal point (e.g.
   `44,85`), not a period, and are in a monospace/tabular font (digits line
   up in neat columns if you scroll).
4. **Pass/fail:** fail if the page is blank, shows a raw error message/stack
   trace, or any number contains "NaN" or "undefined".

## Test 2 — Selecting a currency (FR-RATES-04)

1. Click any currency row, e.g. **USD**.
2. **Expect:** the right-hand panel (or, if your window is narrow, the area
   below the list) now shows that currency's code, full Ukrainian name, and
   the rate in large type, plus a converter and a chart underneath.
3. Click a different currency, e.g. **EUR**.
4. **Expect:** the right panel updates to EUR — the old USD content is
   completely replaced, not stacked underneath it.

## Test 3 — Converter (FR-CONVERT-01 … FR-CONVERT-05)

With a currency selected from Test 2:

1. Find the top input box, labelled **"СУМА У [code]"** (e.g. "СУМА У USD").
   It should already contain `100`.
2. **Expect:** directly below, a green box labelled **"ЦЕ У ГРИВНЯХ"** shows
   that amount converted to hryvnias.
3. Clear the box and type `1234,56` (use a **comma**, not a period).
4. **Expect:** the converted result updates correctly (no need to do the
   math yourself — just confirm it changes and isn't `0,00` or blank).
5. Clear the box and type letters only, e.g. `abc`.
6. **Expect:** the result shows `0,00` — calmly, no red error banner, no
   crash, no "NaN".
7. Click the swap icon (the up/down arrows button between the two amounts).
8. **Expect:** the labels flip — the top box now says **"СУМА У ГРИВНЯХ"**
   and the result box says **"ЦЕ У [code]"**. Type an amount and confirm it
   converts the other direction.

## Test 4 — Filtering the list (FR-PICK-01, FR-PICK-02, FR-PICK-03)

1. Find the search box above the currency list (placeholder text **"Пошук
   за кодом або назвою"**).
2. Type `eur`.
3. **Expect:** the list narrows to just EUR (and anything else containing
   "eur"). Try the Ukrainian name too, e.g. type part of a currency's
   Ukrainian name you saw earlier.
4. Clear the box and type something nonsensical, e.g. `zzzqqq123`.
5. **Expect:** the list area shows **"Нічого не знайдено"** — calm text, no
   red banner, no popup/toast.
6. Clear the search box.
7. **Expect:** the full list returns.

## Test 5 — Rate history chart and trend (FR-HISTORY-01 … FR-HISTORY-04, FR-TREND-01 … FR-TREND-03)

With a currency selected:

1. Scroll down past the converter.
2. **Expect:** a line chart titled **"Динаміка за останній місяць"** showing
   roughly the last 30 days, with a date axis along the bottom and rate
   values along the left.
3. **Expect:** directly above the chart, one short sentence in Ukrainian
   stating whether the currency strengthened, weakened, or stayed flat over
   the last week, with a percentage — e.g. *"USD за тиждень зміцнів на
   1,20% до гривні."* It should **not** end with an exclamation mark.
4. Hover your mouse over a point on the chart line.
5. **Expect:** a small tooltip appears showing the exact date and rate for
   that point.

## Test 6 — Footer (FR-SAYINGS-01)

1. Scroll to the very bottom of the page.
2. **Expect:** a line crediting NBU as the data source (mentions "НБУ"), and
   directly below it, one short calm Ukrainian sentence (not the same as the
   trend sentence) — this is the "saying of the day".
3. Reload the page (don't change the date/time on your computer).
4. **Expect:** the same saying appears — it only changes once per calendar
   day, not on every reload.

## Test 7 — Theme toggle (FR-SHELL-03)

1. Find the switch in the top-right labelled **"Темна тема"**.
2. Click it.
3. **Expect:** the whole page switches to a dark background with light
   text, instantly, with no flash of the wrong theme.
4. Reload the page.
5. **Expect:** it stays dark (your choice was remembered).
6. Click the switch again to return to light, for the rest of these tests.

## Test 8 — Responsive layout (FR-SHELL-02)

1. With the browser window wide (more than half your screen), confirm the
   currency list and the detail panel sit **side by side**.
2. Slowly shrink the browser window narrower (or open DevTools, click the
   phone/tablet icon, and pick a phone size like "iPhone 12").
3. **Expect:** somewhere around a narrow width, the layout switches to a
   **single column** — the detail panel moves below the list instead of
   beside it. Nothing should overlap or get cut off.

## Test 9 — Honest failure states (FR-RATES-05, FR-HISTORY-03, NFR-OBS-01)

This test needs Chrome/Edge DevTools (F12).

1. Open DevTools (F12), go to the **Network** tab, and set the throttling
   dropdown to **Offline**.
2. Reload the page.
3. **Expect:** instead of a blank page or crash, you see a calm message
   (mentions failing to load the rate) with a **"Спробувати ще раз"** retry
   button.
4. Set the Network tab back to **Online**, then click that retry button.
5. **Expect:** the page recovers and shows the real currency list.
6. Select a currency so its detail panel and chart are showing.
7. Set Network back to **Offline** again, then click the swap/refresh
   button is not needed — instead, switch to a *different* currency in the
   list (this triggers a fresh history fetch for the new currency, which
   will fail while offline).
8. **Expect:** the chart area shows a calm failure message (not the chart)
   with its own **"Спробувати ще раз"** button — separate from the rates-list
   error in step 3.
9. Set Network back to **Online** and click that retry button.
10. **Expect:** the chart and trend sentence load normally.
11. While in DevTools, check the **Console** tab throughout all of the above.
    **Expect:** no red error messages during normal (non-offline) use.

## Test 10 — Accessibility spot-check (NFR-A11Y-01, NFR-A11Y-02)

1. Click into the search box, then press **Tab** repeatedly to move focus
   through the page using only the keyboard.
2. **Expect:** at every step, you can see a clear highlighted outline/ring
   around whichever element is focused — never invisible.
3. With the dark theme on (Test 7), repeat steps 1-2.
4. **Expect:** focus is still clearly visible, and all text is comfortably
   readable against its background (no light-grey-on-white or
   dark-grey-on-black text that's hard to read).

---

## Pass criteria

All 10 tests pass with no blank screens, no raw error text, no exclamation
marks in app copy, no `NaN`, and the dark theme/keyboard focus checks hold.
Report any deviation with which test number, what you did, what you expected
(quoted above), and what you actually saw — ideally with a screenshot.
