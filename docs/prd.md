# PRD — «Неділя на вагах» (Sunday Weigh-in Telegram Bot)

Last updated: 2026-07-04

This document is the **single source of truth** for what the product does and
what constraints govern it. Every requirement has a stable ID. Specs, tests,
PRs, and demo recordings reference these IDs to keep traceability intact.

Refer to [`docs/product-overview.md`](product-overview.md) for narrative context.

## ID conventions

| Prefix  | Meaning                    | Example                                      |
| ------- | -------------------------- | -------------------------------------------- |
| `FR-*`  | Functional Requirement     | `FR-LOG-01` — user logs four scale metrics   |
| `NFR-*` | Non-Functional Requirement | `NFR-I18N-01` — Ukrainian user-facing text   |
| `TC-*`  | Technical Constraint       | `TC-STACK-01` — Python Telegram bot          |
| `BC-*`  | Business / UX Constraint   | `BC-TONE-01` — supportive, non-judgmental    |

Status values: `proposed` · `accepted` · `shipped` · `dropped`.

---

## Functional requirements

### Onboarding (capability `onboarding`)

| ID          | Description                                                                                    | Status   |
| ----------- | ---------------------------------------------------------------------------------------------- | -------- |
| FR-ONB-01   | `/start` runs a one-time two-step setup: (1) Sunday reminder time, (2) optional first weigh-in | shipped |
| FR-ONB-02   | Reminder time step offers presets, custom time entry, and **Skip** → default `09:00`           | shipped |
| FR-ONB-03   | First weigh-in step offers **Now** (log immediately) or **Later** (use `/вага` when ready)     | shipped |
| FR-ONB-04   | On setup complete, `display_name` is set to **`Оленка`** (no name prompt during onboarding)    | shipped |
| FR-ONB-05   | Skipping or dismissing setup applies defaults: name `Оленка`, reminder `09:00`, tz `Europe/Kyiv` | shipped |

### Weigh-in logging (capability `weigh-in`)

| ID          | Description                                                                                    | Status   |
| ----------- | ---------------------------------------------------------------------------------------------- | -------- |
| FR-LOG-01   | `/вага` accepts **four numbers** in one message: weight (kg), fat (%), muscle (%), BMI           | shipped |
| FR-LOG-02   | Numbers may be separated by spaces and/or newlines; input is trimmed before parsing              | shipped |
| FR-LOG-03   | Decimal separator **`.` and `,`** are both accepted; normalized internally                      | shipped |
| FR-LOG-04   | On invalid input, reply in Ukrainian with a **clear example** (e.g. `72,4 28,5 32,1 24,8`)     | shipped |
| FR-LOG-05   | `/вага` shows an input **hint** before or with the prompt (format + example)                   | shipped |
| FR-LOG-06   | Successful log persists: `recorded_at`, weight_kg, fat_pct, muscle_pct, bmi                      | shipped |
| FR-LOG-07   | `/скасувати` removes the **most recent** entry and confirms in Ukrainian                       | shipped |
| FR-LOG-08   | Logging is allowed **any day**; Sunday reminder is a nudge, not a hard gate                    | shipped |

### Comparisons (capability `compare`)

| ID          | Description                                                                                    | Status   |
| ----------- | ---------------------------------------------------------------------------------------------- | -------- |
| FR-CMP-01   | After each log, show per-metric delta vs **previous entry** (if any)                             | shipped |
| FR-CMP-02   | After each log, show **weight delta vs first entry** («від старту») when ≥ 2 entries exist       | shipped |
| FR-CMP-03   | First entry shows no «vs previous» deltas; confirm as baseline («стартова точка»)              | shipped |
| FR-CMP-04   | Delta formatting uses Ukrainian decimal comma in display (e.g. `−0,6`)                          | shipped |

### Progress & history views (capability `history`)

| ID          | Description                                                                                    | Status   |
| ----------- | ---------------------------------------------------------------------------------------------- | -------- |
| FR-HIST-01  | `/історія` lists the **last 8** entries: date, weight, fat %, muscle %, BMI (compact table)     | shipped |
| FR-HIST-02  | `/прогрес` shows the latest entry, deltas vs previous and vs start, plus trend labels          | shipped |
| FR-HIST-03  | `/місяць` shows **current calendar month** (Europe/Kyiv): entry count, first→latest per metric   | shipped |
| FR-HIST-04  | `/місяць` includes a **one-line** previous-month weight delta when data exists                   | shipped |
| FR-HIST-05  | `/місяць` if only one entry in month: show values + «ще мало даних для порівняння в місяці»      | shipped |
| FR-HIST-06  | Month baseline uses first in-month entry; if none on the 1st, **carry over** last pre-month entry as start when first in-month entry is logged | shipped |
| FR-HIST-07  | `/весь_час` shows first→latest for all metrics, total entry count, and date of first entry     | shipped |
| FR-HIST-08  | `/весь_час` shows **best month** by largest weight loss when ≥ 2 entries exist in that month   | shipped |
| FR-HIST-09  | `/весь_час` omits «best month» line when insufficient data                                      | shipped |

### Trend labels (capability `trends`)

| ID          | Description                                                                                    | Status   |
| ----------- | ---------------------------------------------------------------------------------------------- | -------- |
| FR-TREND-01 | Weight, fat %, BMI: decrease → label **прогрес**; increase → **коливання**; \|Δ\| < threshold → **без змін** | shipped |
| FR-TREND-02 | Muscle %: increase → **прогрес**; decrease → **коливання**; \|Δ\| < threshold → **без змін**   | shipped |
| FR-TREND-03 | Stable threshold: **0.2** in the metric’s unit (kg or percentage points) unless changed in code  | shipped |

### Messaging & personalization (capability `messaging`)

| ID          | Description                                                                                    | Status   |
| ----------- | ---------------------------------------------------------------------------------------------- | -------- |
| FR-MSG-01   | When `display_name` is set, prefix key user messages with the name (e.g. «Оленка, …»)          | shipped |
| FR-MSG-02   | When `display_name` is cleared in settings, use **general** messages without a name              | shipped |
| FR-MSG-03   | After `/вага` and on `/прогрес`, append **one** supportive Ukrainian line based on **weight** Δ  | shipped |
| FR-MSG-04   | Supportive copy for **коливання** and **без змін** is motivating, not blaming (see BC-TONE-01)   | shipped |
| FR-MSG-05   | `/місяць` may append one trend-support line based on month weight change                         | shipped |
| FR-MSG-06   | `/історія` is factual only — no supportive paragraphs                                          | shipped |
| FR-MSG-07   | Message pool: **≥ 3 variants** per category; pick randomly to reduce repetition                | shipped |
| FR-MSG-08   | `/допомога` lists commands and the weigh-in input format with example                            | shipped |

### Reminders (capability `reminders`)

| ID          | Description                                                                                    | Status   |
| ----------- | ---------------------------------------------------------------------------------------------- | -------- |
| FR-REM-01   | Send a Sunday reminder at the user’s configured local time (default `09:00`)                   | shipped |
| FR-REM-02   | Reminder timezone is **Europe/Kyiv** in v1                                                       | shipped |
| FR-REM-03   | Reminder text uses display name when set; nudges user to `/вага`                                | shipped |

### Settings (capability `settings`)

| ID          | Description                                                                                    | Status   |
| ----------- | ---------------------------------------------------------------------------------------------- | -------- |
| FR-SET-01   | `/налаштування` shows current name and reminder time; allows changing reminder time            | shipped |
| FR-SET-02   | `/налаштування` allows changing `display_name` or **clearing** it (revert to general messages) | shipped |
| FR-SET-03   | Name validation: trim whitespace, reject empty string, max length 40 characters                  | shipped |

### Access control (capability `security`)

| ID          | Description                                                                                    | Status   |
| ----------- | ---------------------------------------------------------------------------------------------- | -------- |
| FR-SEC-01   | Only Telegram user IDs on an **allowlist** (env config) may use the bot                        | shipped |
| FR-SEC-02   | Non-allowlisted users receive a neutral Ukrainian refusal; no data leakage                     | shipped |

### Commands (capability `commands`)

| ID          | Description                                                                                    | Status   |
| ----------- | ---------------------------------------------------------------------------------------------- | -------- |
| FR-CMD-01   | Bot implements: `/start`, `/вага`, `/прогрес`, `/історія`, `/місяць`, `/весь_час`, `/налаштування`, `/скасувати`, `/допомога` | shipped |
| FR-CMD-02   | Completed onboarding: `/start` shows short help instead of re-running setup                      | shipped |

---

## Non-functional requirements

| ID           | Description                                                                                   | Status   |
| ------------ | --------------------------------------------------------------------------------------------- | -------- |
| NFR-I18N-01  | All user-facing bot text is **Ukrainian**                                                     | shipped |
| NFR-TZ-01    | Calendar month and reminders use **Europe/Kyiv**                                              | shipped |
| NFR-REL-01   | Weigh-in data persists across bot restarts (durable storage)                                  | shipped |
| NFR-TEST-01  | Pure logic (parse, compare, month stats, trend labels, messages selection) has **unit tests**  | shipped |
| NFR-OPS-01   | Secrets (`BOT_TOKEN`, allowlist) load from environment; `.env.example` documents required vars | shipped |

---

## Technical constraints

| ID          | Description                                                                                    | Status   |
| ----------- | ---------------------------------------------------------------------------------------------- | -------- |
| TC-STACK-01 | Bot implemented in **Python 3.11+** with `python-telegram-bot`                                   | shipped |
| TC-STACK-02 | Persistence via **SQLite** (single-file DB acceptable for v1)                                  | shipped |
| TC-STACK-03 | Project lives under repo path `nedilya-na-vagakh/` (bot root, tests, `requirements.txt`)       | shipped |
| TC-DEPLOY-01| Bot runs via long polling or webhook; deployment target is operator’s choice (Railway, VPS, etc.) | shipped |
| TC-DEPLOY-02| Project provides a **`Dockerfile`** (and optional **`docker-compose.yml`**) under `nedilya-na-vagakh/` for long-polling deployment; secrets via environment (`BOT_TOKEN`, `ALLOWED_USER_IDS`); SQLite at `DATABASE_PATH` on a **mounted volume** so data survives container restarts (NFR-REL-01); README documents build and run (including ARM64 for home-router hosts) | shipped |

---

## Business & UX constraints

| ID           | Description                                                                                  | Status   |
| ------------ | -------------------------------------------------------------------------------------------- | -------- |
| BC-TONE-01   | Supportive tone on plateau and weight gain; avoid shame, medical claims, and «регрес» label    | shipped |
| BC-PRIVACY-01| No analytics, no third-party tracking, no sharing data outside the bot’s database            | shipped |
| BC-SCOPE-01  | v1 is **single-user** (wife only); no husband read-only access                               | shipped |
| BC-SCOPE-02  | Photo OCR and LLM insights are **out of scope** for v1                                       | shipped |

---

## Data model (informative)

### `user_settings`

| Field               | Type    | Notes                                      |
| ------------------- | ------- | ------------------------------------------ |
| `telegram_user_id`  | INTEGER | Primary key                                |
| `display_name`      | TEXT    | Default `Оленка`; NULL = general messages  |
| `reminder_time`     | TEXT    | `HH:MM`, default `09:00`                   |
| `reminder_timezone` | TEXT    | Default `Europe/Kyiv`                      |
| `reminder_weekday`  | INTEGER | `6` = Sunday (fixed v1)                    |
| `setup_completed_at`| TEXT    | ISO timestamp                              |

### `weigh_ins`

| Field          | Type    | Notes                |
| -------------- | ------- | -------------------- |
| `id`           | INTEGER | Primary key          |
| `user_id`      | INTEGER | FK → settings        |
| `recorded_at`  | TEXT    | ISO timestamp        |
| `weight_kg`    | REAL    |                      |
| `fat_pct`      | REAL    |                      |
| `muscle_pct`   | REAL    |                      |
| `bmi`          | REAL    |                      |

---

## Out of scope (v1)

- Photo → OCR extraction from scale display
- LLM-generated coaching
- Weight goal / target tracking
- Charts and graph images
- CSV export
- Multi-user / family read-only access
- Native mobile app or web dashboard

---

## Traceability notes for homework PR

When implementing, reference requirement IDs in commit messages and tests where
practical (e.g. `test_parse_decimal_comma` → FR-LOG-03). The demo video should
show at least: onboarding, `/вага` with comma decimals, `/прогрес`, `/місяць`,
and `/налаштування`.
