<!-- Paste into PR: mbugaiov:colibri-book-mvp → koldovsky:main -->
<!-- https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task/compare/main...mbugaiov:2026-fwdays-agentic-greenfield-task:colibri-book-mvp -->

## Автор
Max Bugaiov

## Проєкт
**Colibri Book** — booking concierge для outdoor-обʼєктів Mahogany HOA (MVP: теніс).  
Стек: **Next.js 16**, TypeScript, **Playwright** (live scrape + submit), Python **ddddocr** (captcha OCR), OpenSpec, Playwright E2E.

Користувач описує бронювання природною мовою → система парсить intent, показує доступність кортів, проходить captcha на mahoganyhoa.com і підтверджує бронювання. Є черга scheduled bookings (поза 7-day вікном MHOA), cron-runner, список confirmed bookings.

**Live STG:** http://colibri.64.225.115.88.nip.io

## Відео-демо (1–2 хв)
Video (~48 с, stub walkthrough — Book / Scheduled / My bookings):  
https://github.com/mbugaiov/2026-fwdays-agentic-greenfield-task/blob/colibri-book-mvp/docs/demo-video/colibri-homework-demo.mp4

## Які практики Agentic Engineering застосовано

### Контекст-інженерія
- **PRD** `docs/requirements.md` — єдине джерело `FR-*` / `NFR-*` вимог
- **Cursor rules** (`.cursor/rules/`) — OpenSpec-first, тести на кожен spec-сценарій, QA two-pass browser
- **OpenSpec changes** (`openspec/changes/`) — proposal / design / spec delta / tasks на кожну фічу
- **Skills** — playwright-ui-validation, openspec-apply/archive
- Статичний контекст: PRD + specs; динамічний: agent читає change spec перед змінами в `src/**`

### Spec-driven development (SDD)
- Поведінкові зміни лише після `npx openspec validate <change> --strict`
- 15+ change folders (intake, wizard, availability, scheduled, confirmed, captcha, hardening, …)
- Traceability: `tasks.md` + PRD IDs (`FR-SCHED-*`, `FR-AVAIL-*`, …)

### Loop engineering
- Ітерації **deploy → smoke-stg (15 checks, live availability) → fix → redeploy**
- Scheduled runner: cron кожні 10 хв + conditional skip коли черга порожня
- Availability hardening після 502 на STG (prefetch, retry UI, single calendar nav)

### Maker ≠ checker
- **CodeRabbit** на форку (`.coderabbit.yaml`)
- Окремі QA rules (two-pass browser: real input vs MCP automation)
- Unit tests (60) + Playwright E2E + shell cron-wrapper tests

### Верифікація
- `npm test` — parsers, tennis window, MHOA approval, schedule runner, cron skip logic
- `npm run test:e2e` — wizard, scheduled page, bookings, a11y
- `scripts/smoke-stg.sh` — post-deploy health, auth, live Playwright availability scrape
- `scripts/test-cron-wrapper.sh` — no API call when queue empty

### Інструменти / MCP
- Cursor Agent + OpenSpec CLI
- Playwright (scrape MHOA calendar, form submit)
- Python ddddocr для captcha
- Browser MCP для exploratory QA (не замість E2E)
- DigitalOcean deploy (`scripts/deploy-do.sh`)

### Студент vs агент
| Студент | Агент |
|--------|--------|
| Продуктовий scope (теніс MVP, household residents) | Implementation за OpenSpec tasks |
| STG droplet, deploy credentials | Код, тести, deploy script, smoke |
| MHOA business rules validation | Playwright scraper, captcha pipeline |
| Homework PR / video | Specs, refactors, bug fixes у loops |

### Доведено до кінця
- Live booking на MHOA (confirmed slots на STG)
- Повний flow: login → Book → availability → submit / schedule → My bookings / Scheduled
- `COLIBRI_SUBMIT_MODE=live` на STG, не лише stub

## (Опційно) Посилання на код
https://github.com/mbugaiov/2026-fwdays-agentic-greenfield-task/tree/colibri-book-mvp

---

### Чекліст
- [x] Вказано справжнє імʼя
- [x] Додано посилання на відео-демо (1–2 хв)
- [x] Описано застосовані практики Agentic Engineering
- [x] Результат робочий і доведений до кінця (STG + tests)
