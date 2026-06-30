# Product brief — «Гривня» (Hryvnia)

> **Document type:** product brief (the "why" and "for whom").
> The numbered, traceable requirements live in [requirements.md](requirements.md) (Stage 2).
> This brief sets tone, audience, and priorities — not requirement IDs.
> **Last updated:** 2026-06-29 (Europe/Kyiv).

---

## One-liner

**«Гривня»** is a calm, Ukrainian-first web app that answers one practical
question: **"What is the official UAH exchange rate today, what is it in my
money, and which way is it moving?"** — using the National Bank of Ukraine's
public, keyless open data.

## Why this project exists

This is a **course assignment for fwdays Academy · Agentic Engineering:
Greenfield**. The objective is **not** product value — it is to demonstrate, on a
small finished project, as many Agentic Engineering practices as possible:
context engineering (`AGENTS.md`), spec-driven development (OpenSpec),
loop engineering, verification, **maker ≠ checker**, reusable artifacts, and
visible engineering evidence. The domain is deliberately small and honest so the
*engineering* is the star. See
[docs/adr/ADR-0003](adr/ADR-0003-prior-art-reuse-boundary.md) for the engineering
approach (a hand-authored agentic loop).

## Audience

Anyone in Ukraine who wants a quick, trustworthy read on the official NBU rate:
a person planning a purchase, checking "скільки це в гривнях", or watching a
currency's short-term direction. No finance expertise assumed. No account, no
login, no tracking.

## What it does (MVP capabilities)

1. **Rates list** — today's official NBU rates for the major currencies
   (USD, EUR, GBP, PLN, CHF, …), each shown with a mono tabular figure.
2. **Currency picker** — choose the currency to focus on (free-form filter over
   the NBU currency list; inline "не знайдено" when nothing matches).
3. **Converter** — enter an amount in UAH ⇄ foreign currency; see the result at
   the official rate. Locale-aware input (accepts `100,50` and trailing zeros).
4. **Rate history chart** — a ~30-day line of the selected currency's official
   rate (Recharts), so the trend is visible at a glance.
5. **Trend hint** — one calm Ukrainian sentence reading the recent move:
   *"Долар за тиждень зміцнів на 1.2% до гривні."* — number first, then the detail.
6. *(optional flavour)* **Footer one-liners** — deterministic, dry Ukrainian
   money sayings chosen by day-of-year; no API, no tracking.

## What it explicitly does NOT do (YAGNI / out of scope)

- No accounts, auth, database, cookies, analytics, or trackers.
- No real-time/intraday or market (interbank) rates — **official NBU daily rate
  only**, the honest single source.
- No payments, no trading, no advice. It reports an official number; it never
  tells anyone to buy or sell.
- No map. No multi-provider aggregation. No server secrets / API keys.

## Brand & voice (sets up DESIGN.md)

- **Ukrainian-first.** English appears only as tiny system labels.
- **Calm and practical. No exclamation marks. Ever.** Reads like a level-headed
  friend, not a marketer.
- **One number, then the detail.** Lead with the rate/decision, follow with
  evidence: *"41.85 ₴ за долар — за тиждень майже без змін."*
- **Numbers are mono with tabular figures** so columns line up.
- **Honest, never overstated.** When data is stale (weekend/holiday — NBU
  publishes the previous business day), say so plainly.
- The brand decision-of-record is **DESIGN.md** (authored at Stage 2 / §7A from
  the claude-design system); this brief leaves visual identity open until then.

## Hard constraints

- **Keyless & free.** NBU open API only; the app runs with **zero env vars**.
- **Privacy.** No cookies, no analytics, no third-party trackers.
- **Accessibility.** WCAG AA contrast in light + dark; always-visible focus; copy
  respects `prefers-reduced-motion` for any motion.
- **Stack locked** — see [ADR-0001](adr/ADR-0001-stack.md).
- **Data source locked** — see [ADR-0002](adr/ADR-0002-nbu-keyless-api.md).

## Capability areas → requirement-ID prefixes (formalised in Stage 2)

| Area | Prefix (planned) |
|---|---|
| Shell & navigation | `FR-SHELL-*` |
| Currency list | `FR-RATES-*` |
| Currency picker / filter | `FR-PICK-*` |
| Converter | `FR-CONVERT-*` |
| Rate history chart | `FR-HISTORY-*` |
| Trend hint | `FR-TREND-*` |
| Footer one-liners (optional) | `FR-SAYINGS-*` |
| Cross-cutting | `NFR-*`, `TC-*`, `BC-*` |

## Success criteria (for the course)

- Small, **finished**, gate-checked project — not "generated and abandoned".
- Visible engineering evidence: `AGENTS.md`, OpenSpec specs, tests + evals,
  verification traces, a **separate review pass** by two of my own checker agents
  (`kurs-reviewer` + `kurs-eval-judge`),
  demo recordings.
- 1–2 min video demo showing **how it was built agentically**.

## Risks (carried into the plan)

- **Stale-data days** (weekends/holidays): NBU serves the last business day's
  rate — the UI must label this honestly, not pretend it is "today".
- **API downtime / network failure:** must degrade to a visible state, never a
  blank crash or generic 500.
- **History endpoint shape:** the exact NBU range endpoint is verified live
  during the rate-history slice (see ADR-0002).
