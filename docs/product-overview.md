# Product Overview — «Неділя на вагах»

> Static context for agents and humans. For implementable requirements and
> stable IDs, see [`docs/prd.md`](prd.md).

Last updated: 2026-07-04

## What this is

«Неділя на вагах» is a private Ukrainian-language Telegram bot that helps one
person track body-composition weigh-ins over months. She logs four numbers from
her home scale — weight, body fat %, muscle %, and BMI — and the bot stores
history, compares each entry with the previous one and with the starting point,
and surfaces calm weekly, monthly, and all-time summaries.

There are no accounts, no web dashboard, and no third-party analytics. The bot
speaks to her by name (default **Оленка**, changeable in settings) with warm,
supportive copy — especially when weight fluctuates or stays flat.

## Who it is for

The single user is **Оленка** — one Telegram account on an allowlist. The bot is
built for a couple's personal use at home; no husband read-only access in v1.

## The pain it addresses

Today, progress is tracked by photographing the scale every Sunday and manually
comparing screenshots. That is slow, easy to lose, and discouraging when the
numbers move in the wrong direction.

The bot replaces screenshots with:

- a **10-second log** (four numbers in one message);
- **instant comparison** with the last entry and with the start;
- **long-term views** (recent log, current month, all time) without opening old
  photos;
- **supportive Ukrainian messages** on progress, plateau, and normal weekly
  fluctuation.

## End-to-end usage

1. **First launch (`/start`).** A short two-step setup runs once: choose a
   Sunday reminder time (or skip → 09:00 Kyiv), then optionally log the first
   weigh-in or defer to `/вага`. Display name is preset to **Оленка** — no name
   question during onboarding (FR-ONB-01…04).
2. **Weekly weigh-in (`/вага`).** She sends four numbers from the scale, using
   either a dot or comma as the decimal separator, e.g. `72,4 28,5 32,1 24,8`.
   The bot confirms, shows deltas, and adds one supportive line (FR-LOG-01…03,
   FR-MSG-03…07).
3. **Quick check (`/прогрес`).** Latest entry with comparison vs previous and
   vs first entry, plus a supportive line driven by weight change (FR-CMP-01/02).
4. **Recent log (`/історія`).** Last eight entries in a compact table — enough
   for roughly two months of Sundays (FR-HIST-01).
5. **Month view (`/місяць`).** Current calendar month: first → latest values,
   progress labels, and a one-line summary of the previous month’s weight change
   (FR-HIST-02/03).
6. **All time (`/весь_час`).** From first entry to latest: totals, entry count,
   and best month by weight loss when enough data exists (FR-HIST-04/05).
7. **Settings (`/налаштування`).** Change display name or clear it (general
   messages), and change Sunday reminder time (FR-SET-01/02).
8. **Sunday reminder.** Each Sunday at the configured time (Europe/Kyiv), the
   bot nudges her to weigh in. Logging remains allowed any day (FR-REM-01).

## Tone and messaging

- All user-facing text is **Ukrainian** (NFR-I18N-01).
- Calm and supportive — no guilt, no lectures, no exclamation-heavy hype.
- Metric labels for trends:
  - weight / fat / BMI down → **прогрес**;
  - weight / fat / BMI up → **коливання** (not «регрес»);
  - change under threshold → **без змін**.
- Muscle % is inverted (gain → progress). One short supportive sentence after
  weigh-in and progress views; history tables stay factual (FR-MSG-03…07,
  BC-TONE-01).

## What is out of scope for v1

- Photo OCR from scale display (AI nice-to-have later).
- AI-generated weekly insights.
- Charts / PNG graphs, CSV export, target weight goals.
- Second user or read-only family access.
- Mobile app or web UI beyond Telegram.

## Technical direction (non-binding)

Python, `python-telegram-bot`, and SQLite — chosen for speed of delivery,
testability, and simple deployment. See `TC-*` rows in [`prd.md`](prd.md).

### Deployment

The bot is a **long-running process** (long polling + Sunday reminder scheduler).
For local development, run Python directly; for **always-on** use (e.g. when the
developer's laptop is off on weekends), the operator may run it in **Docker** on a
home router, VPS, or similar host (`TC-DEPLOY-02`).

Container deployment expectations:

- **Long polling** — outbound HTTPS only; no inbound ports or webhook URL required.
- **Secrets** — `BOT_TOKEN` and allowlist via environment, not baked into the image
  (`NFR-OPS-01`).
- **Persistence** — SQLite file on a mounted volume at `DATABASE_PATH` so weigh-in
  history survives container rebuilds (`NFR-REL-01`).
- **Home ARM hosts** — images should support `linux/arm64` (e.g. Xiaomi BE7000 with
  USB-backed storage for `data/bot.db`).
