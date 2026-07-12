<!-- Домашнє завдання — Agentic Engineering: Greenfield.
     Заповни всі розділи. Стек — будь-який. -->

## Автор

Serhii Rozum

## Проєкт

**Invoice Maker 2026** — веб-додаток для створення двомовних (українська + англійська) інвойсів для українських ФОП, які виставляють рахунки іноземним клієнтам у **USD** або **EUR**. У браузері зберігаються профіль виконавця та клієнти, на `/invoices/new` заповнюється форма з підбором послуги за NACE 2.1-UA, показується live HTML-превʼю, далі — друк, завантаження HTML або PDF через браузер.

**Стек:** Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS v4, shadcn/ui, Zod, react-hook-form, Vitest, OpenSpec (SDD), Project Factory (quality gates), GitHub Actions CI.

**Репозиторій:** https://github.com/eresemai/2026-fwdays-agentic-greenfield-task-INVOICE-MAKER-2026  
**Гілка здачі:** `fwdays-submission`

## Відео-демо (1–2 хв)

Video: https://www.loom.com/share/01ebc7b3403a4b7da8dc785ef2b8205b

На відео: Settings (профіль ФОП) → Clients (клієнт) → форма інвойсу → live preview → print / download HTML / PDF.

## Які практики Agentic Engineering застосовано

### Специфікації наперед (SDD)

Спочатку — продуктовий brief, `docs/requirements.md` зі стабільними ID (`FR-*`, `NFR-*`, `TC-*`, `BC-*`), потім OpenSpec-спеки по capability. Кожен зріз проходив цикл: **proposal → design → tasks → spec → код → archive**. Заархівовано **10 змін** у `openspec/changes/archive/` (S0 shell → S4b export preview). Авторитетна поведінка — у `openspec/specs/<capability>/spec.md`, порядок і залежності — у `openspec/capability-map.yaml` і `docs/capability.md`.

**Команди OpenSpec / opsx:**
- `/opsx:propose add-<capability>` — дизайн і tasks перед кодом
- `/opsx:apply` — імплементація по tasks.md
- `/opsx:sync` — синхронізація delta → authoritative specs
- `/opsx:archive` — закриття зміни після зелених гейтів
- `npx openspec validate --all --strict` — валідація всіх спек
- `npm run capability:check` / `npm run capability:check -- --capability <id>` — перевірка залежностей зрізу

### Контекст-інженерія (статичний vs динамічний)

**Статичний контекст** (читається агентом на старті сесії): `AGENTS.md`, `CONTEXT.md`, `docs/requirements.md`, `docs/capability.md`, `docs/capabilities/`, `Design.md`, `docs/ARCHITECTURE.md`, `openspec/config.yaml`, skills (`.agents/skills/weg3d-fin-design/`, `vercel-react-best-practices/`), slash-команди `/opsx:*` у Cursor / Claude / Codex / Windsurf / Pi / GitHub Copilot.

**Динамічний контекст** (оновлюється між сесіями): `docs/current-state.md` — handoff «де зупинились, що далі»; `openspec/capability-map.yaml` — статуси shipped/in_progress; Wayfinder map у `.scratch/mvp-spec-coherence/` (14 рішень по домену до коду).

### Цикли (loop engineering) замість покрокового промптингу

На кожну capability — повторюваний цикл, а не один довгий промпт:
1. propose → apply по tasks.md (агент ставить `[x]` у tasks)
2. gates: `npm run test` → `npm run typecheck` → `npm run lint` → `npm run build`
3. `openspec validate <change> --strict`
4. archive + оновлення `docs/current-state.md`

Для закриття S4 `form-input` — окремий **loop close-out** у 4 ticks ([`docs/qa/loop-add-form-input.md`](docs/qa/loop-add-form-input.md)): gates → validate → archive → handoff. У Cursor використовував `/loop` для автоматичного циклу «перевір → виправ → повтори».

Після встановлення **Project Factory** (G0) додано workflow-скрипти: `spec-pipeline`, `review-gate`, `eval-suite`, `trajectory-eval`, `vision-verify`, `uat-triage` у `.claude/workflows/`.

### Верифікація

- **220 unit-тестів** Vitest (`npm run test`) — domain (`invoice-calc`, `nace-catalog`, `banking`), render, storage, validation, export
- **Статичні гейти:** `npm run typecheck`, `npm run lint`, `npm run build` (включно з `template:check` для `docs/invoice-template.html`)
- **CI** (`.github/workflows/ci.yml`) на кожен push у `main`: lint, typecheck, capability:check, traceability, trajectory, factory-integrity, openspec validate, test, build
- **Traceability:** `node scripts/check-traceability.mjs` — ланцюг FR → spec → plan → tests; звіти в `docs/qa/traceability-report.md`
- **Trajectory:** `node scripts/check-trajectory.mjs` — process audit архівованих зрізів
- **Factory integrity:** `node scripts/check-factory-integrity.mjs` + `factory-lock.json`
- Ручний M4 walkthrough + відео Loom

### Maker ≠ checker / суб-агенти / окреме ревʼю

Правило в `AGENTS.md`: той, хто пише код (maker), не є фінальним перевіряючим (checker).

- **CodeRabbit** на fork PR (на mentor PR >150 файлів — review на форку)
- **Cursor subagents:** `code-reviewer`, `bugbot`, `ultracite-reviewer`
- **Wayfinder** (Claude Opus) — планування й adversarial review доменних рішень (NACE effective date, money model, PDF strategy) окремо від імплементації в Cursor
- **Adversarial review** по зрізах — fork PRs [#2](https://github.com/eresemai/2026-fwdays-agentic-greenfield-task-INVOICE-MAKER-2026/pull/2), [#6](https://github.com/eresemai/2026-fwdays-agentic-greenfield-task-INVOICE-MAKER-2026/pull/6), [#7](https://github.com/eresemai/2026-fwdays-agentic-greenfield-task-INVOICE-MAKER-2026/pull/7), [#8](https://github.com/eresemai/2026-fwdays-agentic-greenfield-task-INVOICE-MAKER-2026/pull/8) — знайдені й виправлені баги (hydration, IBAN mod-97, template contract, traceability)
- Checker handoff для S4: [`docs/qa/checker-handoff-form-input.md`](docs/qa/checker-handoff-form-input.md)

### Project Factory

На фінальному етапі встановлено **Project Factory** (`/project-factory:init`, G0):
- `factory-lock.json` — 25 gate-bearing файлів
- `.github/workflows/ci.yml` — адаптований factory CI під browser-first MVP
- gate scripts: `check-traceability`, `check-trajectory`, `check-factory-integrity`, `qa-verify`, `check-acceptance-methods`
- `.claude/agents/` — spec-writer, requirements-analyst, spec-compliance-auditor, code-reviewer тощо
- `.githooks/` — pre-commit + commit-msg (шаблон з `Refs:` / `Slice:`)

### Інструменти, IDE та MCP

| Інструмент | Для чого |
| --- | --- |
| **Cursor** | основний IDE, Composer, `/opsx:*`, `/loop`, subagents |
| **Claude Code** | Wayfinder, adversarial review, Project Factory workflows |
| **OpenSpec CLI** (`@fission-ai/openspec`) | propose, validate, sync, archive |
| **CodeRabbit** | AI code review на fork PR |
| **GitHub Actions** | CI + auto-sync `main` → `fwdays-submission` |
| **MCP Context7** | актуальна документація бібліотек (Next.js, React тощо) |
| **MCP Vercel** | deploy / logs (опційно) |

### Що вирішував я, а що — агент

| Я (людина) | Агент |
| --- | --- |
| Ідея продукту, домен (ФОП, NACE, bilingual, USD/EUR) | Код, тести, UI за OpenSpec tasks |
| Архітектура browser-first MVP (ADR-0002) | OpenSpec proposals, designs, specs |
| Порядок capability-зрізів S0–S4b | Імплементація `src/lib/` і `src/components/` |
| Wayfinder-рішення з ментором (money, numbering, PDF) | Рефакторинг, gate runs, docs sync |
| Запис відео-демо Loom | Factory install, traceability reports |
| Фінальне прийняття MVP, здача курсу | Adversarial fix passes, archive changes |

## (Опційно) Посилання на код

https://github.com/eresemai/2026-fwdays-agentic-greenfield-task-INVOICE-MAKER-2026

---

### Чекліст

- [x] Вказано справжнє імʼя
- [x] Додано посилання на відео-демо (1–2 хв)
- [x] Описано застосовані практики Agentic Engineering
- [x] Результат робочий і доведений до кінця
