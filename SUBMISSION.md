# Здача домашнього завдання

## Імʼя

Dmitry Remar

## Проєкт

World Cup 2026 Stage Monitor

## Посилання

- Live demo: https://world-cup-2026-stage-monitor.vercel.app
- GitHub repo: https://github.com/DmitryyR/world-cup-2026-stage-monitor
- Demo video: https://www.loom.com/share/cb81485456fb46ed9b47df7ba1e94751

## Що я побудував

Я побудував застосунок для моніторингу стану Чемпіонату світу 2026. Він працює з real provider data, нормалізує матчі, визначає поточну стадію турніру, перевіряє запропонований стан через checker і зберігає тільки accepted state.

У застосунку є:

- Summary dashboard
- Matches page з фільтрами
- Knockout bracket
- Teams і Team Path
- Agent Log
- Run Monitor action
- Data health diagnostics

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

Maker-частина отримує й готує дані. Checker окремо перевіряє бізнес-правила й не дозволяє неконсистентному стану потрапити в базу. UI читає тільки прийняті persisted data, а не live provider response напряму.

## Практики, які я використав

- Context engineering через PRD, SDD, AGENTS, EVALS і DESIGN.
- Loop engineering через ітеративну реалізацію, ревʼю та верифікацію.
- Maker/checker separation.
- Tests і verification commands.
- Provider abstraction із mock і real provider.
- Real provider integration через `worldcup26.ir`.
- Deployment на Vercel із Neon Postgres.
- Custom Codex skill `product-ux-roast-review` для UX/product audit і формування наступних задач.

## Що вирішував я

- Ідею продукту та scope.
- Архітектурні constraints.
- Правило не bypass-ити checker.
- Provider strategy.
- UI direction і acceptance criteria.
- Deployment approach.
- Які результати вважати готовими до здачі.

## Що допоміг зробити Codex / AI

- Реалізувати domain model, schemas і provider adapters.
- Написати stage detector, checker і tests.
- Побудувати monitor loop і persistence flow.
- Реалізувати UI сторінки.
- Підготувати Vercel/Neon deployment.
- Допомогти з documentation, demo script і PR description.
- Провести UX/product review через окремий skill.

## Verification

Фінальна перевірка:

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

## Обмеження

- Provider `worldcup26.ir` не є офіційним FIFA API.
- Дані можуть бути затримані або неповні.
- Run Monitor запускається вручну.
- Bracket visual QA можна покращити через automated screenshots.
