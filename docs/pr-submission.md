# PR submission — Vitalii Yurkov

> Ready-to-paste body for the homework PR on
> [arabuga/2026-fwdays-agentic-greenfield-task](https://github.com/arabuga/2026-fwdays-agentic-greenfield-task).
> Add video URL before opening the PR.

## Автор

Vitalii Yurkov

## Проєкт

**Weather Explorer** — україномовний веб-застосунок для планування вихідних за погодою.
Стек: Next.js 16, React 19, TypeScript, Tailwind 4, Open-Meteo, Leaflet/OSM.
Допомагає обрати місто, побачити 7-денний прогноз, comfort score на вихідні,
порівняти до 3 міст на карті — без акаунтів, cookies і платних API.

Live demo: https://2026-fwdays-agentic-greenfield-task.vercel.app

## Відео-демо (1–2 хв)

Video: https://github.com/arabuga/2026-fwdays-agentic-greenfield-task/blob/homework/submission/docs/homework-demo/homework-demo-final.mp4

## Які практики Agentic Engineering застосовано

### Контекст-інженерія

- `AGENTS.md` — канонічні правила для всіх агентів (стек, коректність, валідація).
- **Статичний контекст:** `.cursor/rules/` (project-factory, memory-bank, docs-maintenance).
- **Динамічний контекст:** skills (`project-factory`, `vercel-react-best-practices`), OpenSpec specs,
  Memory Bank (`docs/memory/`) — підвантажуються за потреби.
- `docs/current-state.md` + Memory Bank — handoff між сесіями агентів.

### Цикли (loop engineering)

- **Project Factory** — детермінований цикл: propose → test-first → implement → review gate → archive.
- 9 capability slices (`add-shell` … `add-weekend-compare`) з OpenSpec контрактами.
- `scripts/check-*` + git hooks + CI — автоматичні гейти замість ручного промптингу.

### Maker ≠ checker

- Окремі суб-агенти: code-reviewer, spec-compliance-auditor, security-reviewer, eval-judge.
- Review findings у `openspec/changes/archive/*/review-findings.json`.
- Trajectory check (`check-trajectory.mjs`) — свіжий суддя, не той самий агент що писав код.

### Верифікація

- **50 unit-тестів** Vitest з `@trace FR-*`.
- **OpenSpec** `validate --strict`.
- **QA proof pack:** traceability matrix, manual test plan, 9 Playwright demo clips.
- **Output evals** (`evals/cases/`) — якість comfort rationale.
- `npm run check:trace`, `check:recordings`, `check:trajectory`.

### SDD (специфікації наперед)

- `docs/requirements.md` (32 FR) → `openspec/specs/` → slice deltas → archive.
- Тести зі сценаріїв spec спочатку (red → green).

### Інструменти

- **Cursor** Agent mode, суб-агенти, MCP (browser smoke, Context7 для Next.js 16).
- **Playwright** — demo recordings як артефакт верифікації.

### Що робив я, що — агент

- **Я (Vitalii):** вибір продукту, scope, архітектурні рішення, фінальний sign-off, відео.
- **Агент:** scaffold, імплементація слайсів за spec, тести, review passes, QA pack, Memory Bank.

## (Опційно) Посилання на код

https://github.com/arabuga/2026-fwdays-agentic-greenfield-task

---

### Чекліст

- [x] Вказано справжнє імʼя
- [x] Додано посилання на відео-демо (1–2 хв)
- [x] Описано застосовані практики Agentic Engineering
- [x] Результат робочий і доведений до кінця
