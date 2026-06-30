---
name: kurs-uah
description: Answers questions about the official UAH exchange rate — convert an amount between a foreign currency and the hryvnia, or read which way a rate is moving — using live data from the National Bank of Ukraine. Self-contained: it fetches the rates itself, needs no app, no setup, no API key. Use whenever the user asks "скільки буде X у гривнях / у валюті", "який курс долара/євро", or "куди рухається курс".
user-invocable: true
---

# Kurs UAH (self-contained)

A portable, zero-dependency skill: one script fetches the official **NBU** exchange
rate; YOU convert and read the move, then answer in Ukrainian. Needs only Node +
internet — no app, no build, no API key. The same folder runs in any harness
(Claude Code, Cursor, Codex).

## Steps

1. **Work out the currencies, amount, and window** from the question:
   - `codes` — ISO codes the user cares about (e.g. `["USD"]`, `["USD","EUR","PLN"]`);
     default a popular basket if none is named.
   - `amount` — the number to convert, if the user gave one.
   - `days` — the trend window if the user asks about movement (default 7).

2. **Run the bundled script** (from this skill's folder — under Claude Code
   `.claude/skills/kurs-uah/run.mjs`):

   ```bash
   node run.mjs '{"codes":["USD","EUR"],"amount":100}'
   ```

   It prints the official rate as of the latest NBU date — one line per currency:
   the rate (`₴ за одиницю`), the `зміна` over the window, and, if you passed an
   `amount`, the conversion both ways.

3. **Answer in Ukrainian**, calmly, **no exclamation marks**, one number then the
   detail. For a conversion, lead with the result («100 USD — це …  ₴»). For a
   movement question, lead with direction and magnitude («Долар за тиждень майже
   без змін»), using `trendTone` logic: a move within ±0.05% reads as flat.

## Rules

- **Use only the numbers from the script output** — never invent or recall a rate.
- It is the **official NBU daily rate**, not a market/cash/interbank rate, and not
  intraday. If the latest date is a weekend or holiday, it is the previous business
  day's figure — say so plainly («курс за DD.MM.YYYY»), do not present it as "today".
- Ukrainian currency names come from NBU; keep ISO codes Latin (USD, EUR).
- If a requested code is not in the NBU list, say so calmly and offer the ones that are.
- This skill only answers (terminal/chat). It does not drive the «Гривня» app.
