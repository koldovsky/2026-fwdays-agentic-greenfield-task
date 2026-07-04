# Capability plan — OpenSpec implementation breakdown

Last updated: 2026-07-04

This document splits [`docs/prd.md`](prd.md) into capabilities to be implemented
as OpenSpec changes, and defines the order of implementation. Each capability
maps to stable PRD requirement IDs. The PRD stays the single source of truth;
this file only organizes delivery.

Capability **status** mirrors the PRD lifecycle for that capability's requirements:
`proposed` · `accepted` · `shipped` · `dropped`.

## Capability map

| # | Capability      | Suggested change name        | PRD requirements                          | Depends on  | Status   |
| - | --------------- | ---------------------------- | ----------------------------------------- | ----------- | -------- |
| 1 | `foundation`    | `add-bot-foundation`         | TC-STACK-01..03, TC-DEPLOY-01, NFR-OPS-01, NFR-REL-01, FR-SEC-01, FR-SEC-02 | —           | shipped  |
| 2 | `weigh-in`      | `add-weigh-in-logging`       | FR-LOG-01..08                             | foundation  | shipped  |
| 3 | `compare`       | `add-entry-comparisons`      | FR-CMP-01..04                             | weigh-in    | shipped  |
| 4 | `trends`        | `add-trend-labels`           | FR-TREND-01..03                           | compare     | shipped  |
| 5 | `messaging`     | `add-supportive-messaging`   | FR-MSG-01..08, BC-TONE-01                 | trends      | shipped  |
| 6 | `history`       | `add-history-views`          | FR-HIST-01..09, NFR-TZ-01                 | trends, messaging | shipped |
| 7 | `settings`      | `add-settings-command`       | FR-SET-01..03                             | foundation  | shipped  |
| 8 | `onboarding`    | `add-onboarding-flow`        | FR-ONB-01..05, FR-CMD-02                  | settings, weigh-in | shipped |
| 9 | `reminders`     | `add-sunday-reminders`       | FR-REM-01..03, NFR-TZ-01                  | settings, onboarding | shipped |
| 10 | `commands`     | `add-command-surface-polish` | FR-CMD-01                                 | all above   | shipped  |
| 11 | `docker-deploy` | `add-docker-deployment`      | TC-DEPLOY-02, NFR-OPS-01, NFR-REL-01      | foundation  | shipped  |

Note: the PRD's `security` capability (FR-SEC-01/02) is folded into
`foundation` — the allowlist middleware is small, gates every handler, and must
exist before any other command ships.

## Capability scope

### 1. `foundation` — project scaffold, storage, access control

- Project skeleton under `nedilya-na-vagakh/` with `requirements.txt`,
  `pytest` setup, and `.env.example` (TC-STACK-01..03, NFR-OPS-01).
- SQLite schema and repository layer for `user_settings` and `weigh_ins`
  (NFR-REL-01, data model section of the PRD).
- Bot bootstrap with long polling (TC-DEPLOY-01), config loading from env.
- Allowlist middleware: only configured Telegram user IDs pass; others get a
  neutral Ukrainian refusal (FR-SEC-01, FR-SEC-02).

### 2. `weigh-in` — core logging (`/вага`, `/скасувати`)

- Parse four numbers with spaces/newlines, dot or comma decimals
  (FR-LOG-01..03) — pure functions with unit tests (NFR-TEST-01).
- Ukrainian error message with a clear example on invalid input (FR-LOG-04),
  input hint with the prompt (FR-LOG-05).
- Persist entries (FR-LOG-06); `/скасувати` removes the latest entry
  (FR-LOG-07); logging allowed any day (FR-LOG-08).

### 3. `compare` — deltas after each log

- Per-metric delta vs previous entry (FR-CMP-01) and weight delta vs first
  entry (FR-CMP-02).
- Baseline handling for the very first entry (FR-CMP-03).
- Ukrainian decimal-comma display formatting (FR-CMP-04).

### 4. `trends` — trend labels

- «прогрес» / «коливання» / «без змін» labels with the 0.2 threshold and
  inverted muscle % direction (FR-TREND-01..03). Pure logic, unit-tested.

### 5. `messaging` — personalization and supportive copy

- Name-prefixed vs general messages (FR-MSG-01, FR-MSG-02).
- One supportive Ukrainian line after `/вага` and on `/прогрес`, driven by
  weight delta (FR-MSG-03), non-blaming copy for коливання/без змін
  (FR-MSG-04, BC-TONE-01).
- Message pool with ≥ 3 variants per category, random selection (FR-MSG-07).
- `/допомога` command listing commands and input format (FR-MSG-08).
- History stays factual (FR-MSG-06); month support line hook (FR-MSG-05)
  lands with `history`.

### 6. `history` — progress and history views

- `/історія` — last 8 entries table (FR-HIST-01).
- `/прогрес` — latest entry, deltas, trend labels (FR-HIST-02).
- `/місяць` — current calendar month in Europe/Kyiv, previous-month delta,
  single-entry fallback, carry-over baseline (FR-HIST-03..06, NFR-TZ-01,
  FR-MSG-05).
- `/весь_час` — all-time summary and best month (FR-HIST-07..09).

### 7. `settings` — `/налаштування`

- Show and change reminder time, change or clear `display_name`
  (FR-SET-01, FR-SET-02).
- Name validation: trim, non-empty, max 40 chars (FR-SET-03).

### 8. `onboarding` — `/start` setup flow

- Two-step setup: reminder time (presets / custom / skip → 09:00), optional
  first weigh-in (Now / Later) (FR-ONB-01..03).
- Defaults on completion or skip: name `Оленка`, `09:00`, `Europe/Kyiv`
  (FR-ONB-04, FR-ONB-05).
- Repeated `/start` after completed onboarding shows short help (FR-CMD-02).

### 9. `reminders` — Sunday nudge

- Scheduled Sunday reminder at the configured local time in Europe/Kyiv
  (FR-REM-01, FR-REM-02, NFR-TZ-01).
- Reminder text uses display name when set, nudges to `/вага` (FR-REM-03).

### 10. `commands` — final command surface check

- Verify the full roster `/start`, `/вага`, `/прогрес`, `/історія`,
  `/місяць`, `/весь_час`, `/налаштування`, `/скасувати`, `/допомога`
  is registered and listed in Telegram command menu (FR-CMD-01).
- Mostly an integration/polish pass; may be folded into `reminders` or the
  last shipped capability if nothing remains.

### 11. `docker-deploy` — container packaging for always-on hosts

- `Dockerfile` under `nedilya-na-vagakh/` (Python 3.11 slim, `python -m bot`
  entrypoint) (TC-DEPLOY-02, TC-STACK-01).
- Optional `docker-compose.yml` with `env_file`, volume for `./data` →
  `DATABASE_PATH`, and `restart: unless-stopped` (TC-DEPLOY-02, NFR-REL-01).
- `.dockerignore` excluding `.venv`, local DB, and dev artifacts.
- README section: build, run, ARM64 note for home-router hosts, volume backup
  (TC-DEPLOY-02, NFR-OPS-01).
- **Non-goals:** webhook mode, Kubernetes manifests, CI Docker build job,
  changes to bot handlers or SQLite schema.

## Implementation order and rationale

```
foundation → weigh-in → compare → trends → messaging → history
                                                          ↓
                              settings → onboarding → reminders → commands
                                                                          ↓
                                                              docker-deploy
```

1. **foundation** — nothing runs without the scaffold, storage, and the
   allowlist; access control must precede any user-facing command.
2. **weigh-in** — the core value loop; everything else reads its data.
3. **compare** — first consumer of stored entries; defines delta formatting
   reused everywhere.
4. **trends** — pure logic layered on deltas; needed by messaging and views.
5. **messaging** — supportive copy and `/допомога`; needed before views so
   `/прогрес` and `/місяць` can attach support lines.
6. **history** — the four read views; depends on all logic above.
7. **settings** — needs only `user_settings` storage; scheduled here so
   onboarding can reuse its time-input and name-validation logic.
8. **onboarding** — orchestrates settings defaults and the first weigh-in;
   done late so both building blocks already exist.
9. **reminders** — needs reminder time from onboarding/settings; scheduler is
   independent of the read views.
10. **commands** — final sweep to confirm the roster and command menu.
11. **docker-deploy** — post-v1 ops capability; packages the shipped bot for
    always-on deployment without changing product behavior. Depends only on
    `foundation` (runtime + config + storage paths).

Capabilities 2–6 form the sequential core loop. Capability 7 (`settings`) only
depends on `foundation` and can be developed in parallel with 2–6 if desired;
the linear order above is the safe default for a single agent.

## Cross-cutting requirements

These apply to every capability and are not separate changes:

- **NFR-I18N-01** — all user-facing text Ukrainian.
- **NFR-TEST-01** — unit tests for pure logic (parse, compare, month stats,
  trend labels, message selection).
- **BC-TONE-01** — supportive tone, no «регрес», no shaming.
- **BC-PRIVACY-01** — no analytics or third-party tracking.
- **BC-SCOPE-01/02** — single user; no OCR/LLM/charts (see PRD out of scope).

## Workflow

For each capability, in order:

1. `/opsx:propose <suggested change name>` — generate proposal, design, tasks.
2. `/opsx:apply` — implement tasks; run `pytest` from `nedilya-na-vagakh/`.
3. `/opsx:apply` — verify each covered requirement against code/tests per
   `AGENTS.md` (tests green, behavior mapped to PRD IDs).
4. `/opsx:archive` — sync specs, archive the change, then flip covered PRD
   statuses `accepted` → `shipped` before starting the next capability.

For `docker-deploy`, flip `TC-DEPLOY-02` and capability status from
`accepted` → `shipped` only in the archive step after manual container smoke
verification.
