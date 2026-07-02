# Здача проєкту — Agentic Engineering

## Автор
Ihor Volchkov

## Проєкт
**Sport & Nutrition Coach** — Telegram-бот особистого тренера з харчування
(TypeScript / Node.js, **без фреймворку** — чистий TS під RAM-обмежений хост · grammY ·
Prisma · PostgreSQL · Anthropic API, Sonnet). Бот онбордить користувача, рахує калораж і
макроси (Mifflin–St Jeor у коді, без LLM), логує їжу текстом **і фото тарілки / етикетки
КБЖУ**, логує метрики тіла та фото прогресу, і генерує денні / тижневі / місячні рев'ю.
**Postgres — джерело істини; Notion — best-effort дзеркало.** Ключові інваріанти жорсткі:
база — це пам'ять (жодного відновлення фактів з історії чату), суми завжди з `SQL SUM`
(LLM пише лише прозу, ніколи числа), зображення **ніколи не зберігаються** (стрімляться в
модель і одразу зникають), **жодного agent-loop** (детермінований одиничний виклик LLM зі
structured-output — інакше вартість × 10–50).

## Відео-демо (1–2 хв)
Video: https://drive.google.com/file/d/1d2JlxrcrmFpL3pKTSxoQbCSdfOUJRxa5/view?usp=sharing

## Які практики Agentic Engineering застосовано

### Контекст-інженерія
**AGENTS.md** — постійний, написаний вручну звід правил, який кожен агент читає першим:
фіксація стеку, конвенції структури (`src/` тримається дисципліною тек, не фреймворком —
модулі малі й одноцільові), і дев'ять **неспростовних правил коректності** (база = пам'ять,
суми з SUM, тег `fact | estimate` на кожен запис їжі, зображення ніколи не на диску, жодного
agent-loop, дзеркалення мови користувача лише в прозі, священні ліміти пам'яті, мультитенантність
по `user_id`, приватність секретів). `CLAUDE.md` не дублює нічого — він лише `@`-імпортує
AGENTS.md, тож джерело істини одне.

Поділ статичного й динамічного контексту зроблено свідомо: постійні правила живуть в AGENTS.md;
усе специфічне для конкретного слайсу — в **OpenSpec change-теках** (`openspec/changes/<id>/`
з `proposal.md` / `design.md` / `tasks.md`), які **архівуються одразу після завершення** (21
заархівованих змін), тож AGENTS.md ніколи не розбухає. **docs/current-state.md** — це динамічний
журнал передачі стану, який оновлюється на кожній віхі за постійним правилом самого AGENTS.md
(«оновлюй, коли стан змінюється — milestone-фліп, фіча приземлилась, рішення чи блокер», без
окремого прохання). Код-конвенції винесені в окремий model-invoked skill
`.claude/skills/backend-conventions/` (guard-clauses, явні return-типи, no-N+1 Prisma), який
підвантажується автоматично й делегує всі поведінкові закони назад до «неспростовних правил».

### Цикли (loop engineering) — не покроковий промптинг
Повторюваний, gate-driven цикл провів **21 слайс** можливостей через вісім віх (M0–M8). Цикл
матеріалізований у власному skill **`/ship-change`** (`.claude/skills/ship-change/`, розбитий на
generic `SKILL.md` + repo-specific `PROFILE.md`) і йде по фіксованому конвеєру воріт **у порядку**:
select → propose (`openspec validate --strict` до коду) → apply → verify (план ⇄ реалізація) →
dup-gate (codebase-wide скан дублікатів) → improve-arch → **review** → tests+static → evals →
docs-sync → commit → archive, потім наступний. Цикл **автономний** — керований воротами, не
апрувами: людський sign-off не блокує; ескалація до людини лише на критичному форку через
`AskUserQuestion`. Failed gate ізолює зміну як `blocked` (+ рядок причини в backlog) і рухає до
наступної готової — цикл не спиняється.

Сам цикл і ролі агентів **не згенеровані готовим фреймворком**. Що саме перевикористано (механізми:
CLI OpenSpec, git-хуки husky, форма CI GitHub Actions), а що написано самостійно (поділ
maker/checker, ворота, model-tiering, що означає «добре» саме для цього бота), зафіксовано в
рішеннях: **ADR-0012** (форма loop-runner), **ADR-0013** (eval-framework — reference-репо
_вивчено, не скопійовано_) і **ADR-0021** (розбиття skill на SKILL/PROFILE + іменовані per-phase
агенти). Кожна фаза делегується своєму агенту в `.claude/agents/` (`ship-maker` / `-verifier` /
`-arch` / `-reviewer` / `-gates` / `-docs`), тож maker ≠ checker — це окремі субагенти, а не
самоогляд.

### Maker ≠ checker
Це **жорсткі ворота, enforced конвенцією**. Код кожного слайсу писав один агент (`ship-maker`,
Opus·high), а перевіряв **інший, який нічого не будував** (`ship-reviewer`, Opus·high) — субагент,
що написав код, **ніколи не апрувить сам себе**. Кожен `tasks.md` несе це фінальним завданням
(`openspec/config.yaml` → `rules.tasks`). Окремо skill `review` ганяє дві осі паралельно —
**Standards** (чи діф слідує конвенціям репо) + **Spec** (чи код відповідає тому, що просив
слайс) — в окремих субагентах.

Незалежний перевіряч зловив **реальні дефекти, яких maker не бачив**:
- **`reviews` (M6):** MAJOR — тижневі/місячні rollup-и генерувались і зберігались, але **ніколи не
  доставлялись** користувачу → виправлено спільним `deliverReview` (daily + кожен rollup на всі три
  поверхні), re-review CONFIRMED.
- **`food-text` (M3):** дві MAJOR-помилки масштабування макросів.
- **`clarify` (M3):** round-1 CRITICAL — багатозбіжна дизамбіґуація губила тег `fact` і
  misroute-ила голе число; root cause — `OpenQuestion` не записував запитаний `unknown`.
- **`photo-label` (M4):** реальний баг — етикетки cream/protein/milk логувались як ±20–30 %
  **estimate**, а «кава + цукор» просто **дропались**; виправлено на label-aware `fact`.
- **`metrics` (M5):** 3 MINOR false-positive парсера (фікс word-boundary).

Model-tiering (**ADR-0018**): кожна reasoning/impl/review-фаза — Opus·high (сильніше й дешевше за
Sonnet 5 на цій роботі), Haiku·low лише на суто механічних кроках (select / test-run / commit /
archive-move).

### Верифікація — тести, evals, перевірки, а не «здається, працює»
**Unit + integration:** **405 тестів на Vitest** у 55 файлах (`test/` дзеркалить `src/`). Критичні
інваріанти покриті **прямо як тести, не evals** (граничне правило ADR-0013: *немає виклику LLM →
це тест, а не eval*): **fs-spy** доводить, що байти зображення ніколи не торкаються диска на всьому
прогоні `logPhoto` (CRITICAL), суми = `SQL SUM` (ніколи hand-summed), Mifflin–St Jeor і trend-diff-и
— чиста математика під тестом на 100 %.

**Eval-framework (ADR-0013, deterministic-first):** домен **інваріант-важкий** (є ground-truth:
клас інтенту, тег `fact|estimate`, розпарсена кількість, back-dated день), тож основа — **dataset
evals з детермінованим грейдером** (`evals/datasets/{router-intent,food-scale,clarify-discrimination}.jsonl`),
а **LLM-judge** (`evals/cases/coach-persona-tone.eval.ts`, рубрика тону RU/UA/EN з CRITICAL-cap +
double-judge на межі) застосований лише там, де правильної відповіді не існує — прозa рев'ю, тон,
чесність оцінки. CI-gate **key-less**: `check:evals` (ратчет `results/latest.json` vs
`quality/eval-baseline.json`) не потребує API-ключа. Живі прогони на реальному LLM — deploy-time
(в пісочниці немає `ANTHROPIC_API_KEY` та egress — чесно логується skip-with-note).

**Docs-sync / трасування:** самописні `scripts/check-docs-sync.mjs` + `scripts/check-eval-ratchet.mjs`
+ `npm run docs:check` (валідує ADR-індекс + що всі npm-скрипти задокументовані) — pre-push/CI-ворота,
що блокують push, якщо документи дрейфують від коду. Git-хуки husky: **pre-commit** (lint-staged) +
**pre-push** (`docs:check` → `npm test`).

**CI-конвеєр як ворота (`.github/workflows/ci.yml`).** Один `quality`-job ганяє **весь ланцюг
воріт у порядку** на кожен PR і push: `lint` → `format:check` → `docs:check` → `typecheck` →
`test` → `check:evals` (key-less eval-ратчет) — червоний будь-який крок валить PR. Окремий
`image`-job збирає Docker-образ на PR і **пушить у GHCR лише на `main`** (збірка off-box, host не
робить `npm install`/`tsc`). Той самий набір воріт локально в husky-хуках — тож CI лише дублює те,
що вже пройшло на машині, а не є єдиним місцем перевірки.

**Fallow (ADR-0011) — whole-program статичний аналіз, report-only.** Dead-code, дублікати,
complexity hotspots, яких per-file ESLint не бачить, ловить крок `Fallow · report-only` у CI
(`npx fallow --ci`, `continue-on-error`). Per **graduation-path** з ADR-0011 він **не блокує** PR —
лише поверхає знахідки; promote до блокуючих воріт (прибрати `continue-on-error`) коли baseline
чистий, тим самим шляхом, що пройшов ESLint. Паралельно codebase-wide dedup робить **dup-gate**
циклу (крок 7, backend-conventions rule #12) — дублікати ловляться на кожному слайсі.

### Специфікації наперед (SDD)
Кожна можливість описана в OpenSpec (`openspec/specs/<capability>/spec.md` — **19 capability-спеків**)
**до написання коду**, і кожна зміна проходить власну change-теку (proposal → design → tasks),
валідовану `openspec validate --strict` як pre-commit-ворота, і **архівується лише після «чистого»
рев'ю** незалежного перевіряча. Acceptance-критерії не дублюються — вони живуть у PRD (user-stories
**US-1…US-10**) і у власних `specs` зміни; backlog (`openspec/backlog.md`) лише посилається на них.
Кожен архітектурний форк фіксується як ADR — **24 записи (ADR-0001…0024)**, серед них: чистий TS
без NestJS (RAM), raw Anthropic API без agent-framework (вартість), Postgres = істина + Notion-дзеркало,
images-never-persisted, long-poll замість webhook (немає валідного TLS), coach-persona (чесний
non-moralizing голос), photo-label = `fact`.

### Власний skill — `/ship-change`
Окремо від самого продукту я написав власний, self-contained skill **`ship-change`**
(`.claude/skills/ship-change/`) — це і є демонстрація агентного підходу поза UI: **оркестратор
всього implementation-loop**. Він розбитий на generic `SKILL.md` (порт у будь-яке репо = переписати
лише один файл) + repo-specific `PROFILE.md` (команди воріт, branch-політика, model-tiering, іменовані
агенти, пастки), `disable-model-invocation: true` (запускається лише вручну `/ship-change`), і
делегує кожну фазу відповідному агенту з `.claude/agents/ship-*.md`. Він — єдиний писар статусу
backlog, enforce-ить maker ≠ checker, спамить окремого reviewer-субагента і proceed-ить автономно
через ворота. Skill підпорядкований тим самим правилам чесності, що й бот: failed gate чесно
позначається `blocked` з причиною, а не ховається; відсутню-але-заплановану команду він
**skip-with-note**, а не фейлить весь цикл.

### Інструменти та MCP
**Claude Code** — основний агентний harness. Власні визначення проєкту: `.claude/agents/ship-*.md`
(шість per-phase ролей) + `.claude/commands/opsx` задають цикл; front-end мислення/тріажу —
matt-pocock skills (`grill-with-docs` → пише ADR перед speccing, `triage`, `improve-codebase-architecture`,
`review`). **Жоден сторонній сервіс рев'ю PR не є частиною самого інженерного циклу** — розділення
maker ≠ checker повністю демонструється власними агентами проєкту (CodeRabbit рев'ює PR вже потім,
як ментор, а не як частина циклу побудови). CI = GitHub Actions → GHCR → Coolify pull: збірка **off-box**
(host RAM-tight, ≤ 512 MB бот / ≤ 256 MB Postgres — `npm install`/`tsc` на сервері заборонені).

### Що вирішував я, а що — агент
Я визначав скоуп, затверджував фреймінг продукту (PRD) і план можливостей (backlog-хвилі), приймав
рішення про бренд/тон (**спокійний, чесний, non-moralizing coach-голос — ADR-0015**), встановлював
демо-постуру (тимчасовий хак «завжди українською» на час демо, чесно позначений `TEMP(demo) — DROP
AFTER DEMO`), і скеровував цикл по одному слайсу, а не давав агенту працювати без нагляду від початку
до кінця. Агент пропонував сценарії кожної специфікації з вимог, писав кожен тест і реалізацію,
запускав обидві ролі перевіряча, **знаходив і виправляв дефекти (зокрема ті, про які я не питав** —
недоставлені rollup-и рев'ю на M6, помилки масштабування макросів, дроп «кава+цукор» на етикетках),
і самостійно підтримував журнал передачі стану (`docs/current-state.md`) та повний набір з 24 ADR за
постійними правилами в AGENTS.md.

## (Опційно) Посилання на код
Проєкт живе в цьому ж репозиторії, на гілці `build/sport-nutrition-coach`.

---

### Чекліст
- [x] Вказано справжнє імʼя
- [x] Додано посилання на відео-демо (1–2 хв)
- [x] Описано застосовані практики Agentic Engineering
- [x] Результат робочий і доведений до кінця
