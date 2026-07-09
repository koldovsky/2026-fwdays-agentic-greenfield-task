# Здача — Agentic Engineering: Greenfield

## Автор

Максим Доронцев

## Відео-демо (1–2 хв)

<https://youtu.be/iX3Ne4QrYEU>

## Проєкт

**askdocs** — локальний RAG-інструмент «чат з документацією» на Python.
Відповідає на питання по корпусу локальних `.md`, спираючись лише на нього, з
посиланням на джерело; якщо відповіді в корпусі немає — чесно каже про це. Уся
система в Docker (docker-compose): qdrant як окремий vector store, локальний
embedding (`sentence-transformers`), LLM через OpenAI-сумісний API (LM Studio на
хості). Синтетичний домен ГущоЛіт робить перевірку чесності однозначною.

## Застосовані практики Agentic Engineering

- **Специфікації наперед (SDD).** Кожен capability (ingest, retrieve, answer,
  cli, eval, sync, docs) — окремий OpenSpec change через цикл
  propose → apply → sync → archive, з proposal/design/specs/tasks. Див.
  `openspec/` і `docs/prd.md`.
- **Контекст-інженерія.** Статичний контекст у `AGENTS.md`/`CLAUDE.md`,
  `openspec/project.md`, і продуктова мапа `docs/prd.md` зі статусами вимог
  (`accepted`/`proposed`/`shipped`/`dropped`): агент реалізує лише `accepted`.
- **Цикли (loop engineering).** Усі capability проведено автономним циклом
  (реалізація → тести → sync spec → archive → окремий git-коміт), а не
  покроковим ручним промптингом.
- **maker ≠ checker.** Рев'ю-гейт перед push: механічний шар (pytest +
  markdownlint у pre-push hook і CI, `.github/workflows/ci.yml`) плюс рев'ювер-пас
  по diff'у; CodeRabbit у PR — backstop. Опис у `AGENTS.md`.
- **Верифікація замість «здається працює».** pytest у контейнері (44 тести);
  eval з golden set по ГущоЛіт: retrieval hit-rate і anti-hallucination
  refusal-rate (`askdocs/eval.py`, `tests/golden.yaml`).
- **Архітектурні межі.** Три інтерфейси (`DocSource`, `Retriever`,
  `LLMProvider`), над якими код не залежить від реалізації.
- **Інструменти / MCP.** Claude Code, OpenSpec CLI, Docker/qdrant, LM Studio,
  CodeRabbit.

## Що вирішував студент, а що агент

- **Студент (я):** продуктові рішення — синтетичний домен і контракт чесності,
  вибір локальної LLM (LM Studio), які вимоги переводити в `accepted` vs
  лишати в backlog, коли фіксити терміново, а коли backfill'ити спекою, обсяг
  рев'ю-гейта, і оскарження порад рецензента (напр. відмова перетворювати збій
  LLM на фейкову відмову — це зламало б контракт чесності).
- **Агент:** реалізація коду, специфікацій і тестів у межах прийнятих рішень;
  прогін циклів; підготовка артефактів.

## Докази готовності

- `docker compose run --rm app pytest` — 44 тести зелені (LLM-залежні
  пропускаються без ендпоінта, не падають).
- `docker compose up` піднімає всю систему; CLI повертає відповідь із джерелом.
- CI (`.github/workflows/ci.yml`) ганяє тести + markdownlint на кожен push/PR.
