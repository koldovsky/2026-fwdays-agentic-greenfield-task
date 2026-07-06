# Здача домашнього завдання

## Імʼя

Dmitry Remarenko

## Проєкт

World Cup 2026 Stage Monitor

## Посилання

- Live demo: https://world-cup-2026-stage-monitor.vercel.app
- GitHub repo: https://github.com/DmitryyR/world-cup-2026-stage-monitor
- Demo video: https://www.loom.com/share/cb81485456fb46ed9b47df7ba1e94751

## Proof of completion

- Справжнє імʼя вказано: Dmitry Remarenko.
- Demo video додано. Тривалість відео: приблизно 1–2 хвилини.
- Проєкт задеплоєний і доступний у live demo.
- Код доступний в окремому GitHub repo.
- Фінальна перевірка виконана:
  - `npm run test` — passed
  - `npm run typecheck` — passed
  - `npm run lint` — passed
  - `npm run build` — passed

## Що я побудував

Я побудував застосунок для моніторингу стану Чемпіонату світу 2026. Він працює з real provider data, нормалізує матчі, визначає поточну стадію турніру, перевіряє запропонований стан через checker і зберігає тільки accepted state.

У застосунку є Summary dashboard, Matches page, Knockout bracket, Teams і Team Path, Agent Log, Run Monitor action та Data health diagnostics.

## Як це демонструє Agentic Engineering

Проєкт побудований через maker/checker pipeline:

```text
Fetcher Agent
-> Normalizer Agent
-> Stage Detector Agent
-> Checker Agent
-> Persistence
-> AgentRun Log
```

Maker-частина отримує й готує дані: Fetcher Agent отримує сирі дані, Normalizer Agent приводить provider payload до внутрішньої моделі, Stage Detector Agent визначає поточну стадію турніру.

Checker Agent окремо перевіряє бізнес-правила: scheduled matches не мають переможців, finished matches мають рахунок, champion не може зʼявитися до завершеного фіналу, а неконсистентний стан не потрапляє в базу.

UI читає тільки accepted persisted data, а не live provider response напряму.

## Конкретні agentic artifacts

У проєкті використані:

- `docs/PRD.md`
- `docs/PRD-v2.md`
- `docs/SDD.md`
- `docs/AGENTS.md`
- `docs/EVALS.md`
- `docs/DESIGN.md`
- `docs/ADR-001-real-data-provider.md`
- `skills/product-ux-roast-review/SKILL.md`

## Практики, які я використав

- Context engineering: PRD, SDD, AGENTS, EVALS, DESIGN і ADR docs.
- Loop engineering: ітеративна реалізація, review, verification і наступні задачі.
- Maker/checker separation: maker agents пропонують стан, checker валідовує.
- Verification: tests, typecheck, lint і production build.
- Provider abstraction: mock provider для локальних перевірок і real provider для production.
- Real-data-first architecture: UI не читає provider напряму.
- Deployment verification: Vercel + Neon Postgres.
- UX/product review loop: custom Codex skill `product-ux-roast-review`.

## Що вирішував я

Я визначав ідею продукту, scope, архітектурні constraints, provider strategy, UI acceptance criteria, deployment approach і критерії готовності до здачі.

## Що допоміг зробити Codex / AI

Codex допоміг реалізувати domain model, schemas, provider adapters, stage detector, checker tests, monitor loop, persistence flow, UI сторінки, deployment fixes, documentation, demo script і UX/product review skill.

## Verification

Фінальна перевірка:

- `npm run test` — passed
- `npm run typecheck` — passed
- `npm run lint` — passed
- `npm run build` — passed

## Обмеження

- Provider `worldcup26.ir` не є офіційним FIFA API.
- Дані можуть бути затримані або неповні.
- Run Monitor запускається вручну.
- Bracket visual QA можна покращити через automated screenshots.
