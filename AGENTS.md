# AGENTS.md

Настанови для агентів (і людей), що працюють у цьому репозиторії.

## Що це

askdocs — локальний RAG-інструмент «чат з документацією». Відповідає на питання
по корпусу `.md`, спираючись **тільки** на нього, з посиланням на джерело.
Продуктова мапа — [docs/prd.md](docs/prd.md), контекст проєкту —
[openspec/project.md](openspec/project.md).

## Золоті правила

1. **Реалізуй тільки вимоги зі статусом `accepted`.** Вимоги зі статусом
   `proposed` в [docs/prd.md](docs/prd.md) — записані, але не чіпаються, поки
   власник продукту вручну не перемкне статус. `dropped` — не реалізуються.
2. **Усе — в Docker.** У системний Python хоста нічого не встановлюється.
   Будь-який запуск (`ingest`, `cli`, `sync`, `pytest`, `eval`) — у контейнері,
   напр. `docker compose run --rm app pytest`.
3. **Готовність = зелені тести**, не «здається працює». Критерій завершення
   capability — зелена батарея pytest у контейнері.
4. **Відповідь без джерела = баг.** «Немає в корпусі» — валідна відповідь, не
   помилка.
5. **Не порушуй межі інтерфейсів.** Код над `DocSource` / `Retriever` /
   `LLMProvider` не знає про конкретну реалізацію. Один embedding-провайдер,
   один vector store, одна LLM у v1.
6. **Vector store — окремий сервіс** у docker-compose (не embedded). Тести
   ідемпотентності ganяються проти чистого стану store (фікстура `clean_store`
   дропає колекцію перед кожним тестом).

## Робочий процес (OpenSpec)

Передумова: встанови OpenSpec CLI (`brew install openspec` або
`npm install -g openspec`) і згенеруй воркфлоу під свій AI-тул:
`openspec init --tools <claude|cursor|codex|…>`. Це створює slash-команди/скіли
в `.claude/` (чи теці твого тула) — вони згенеровані й не комітяться. Самі
специфікації (`openspec/specs`, `openspec/changes`) — у репозиторії.

Кожен capability проводиться окремим OpenSpec change через цикл:

```text
/opsx:propose <name>   # proposal.md + design.md + specs + tasks.md
/opsx:apply <name>     # реалізація по tasks, зелені тести
/opsx:sync <name>      # delta spec -> openspec/specs/<capability>/spec.md
/opsx:archive <name>   # у openspec/changes/archive/
```

Після archive — перемкни відповідні FR у [docs/prd.md](docs/prd.md) на `shipped`
і закомить capability окремим комітом.

## Рев'ю-гейт (перед push)

`maker ≠ checker`: код, що його написав автор, не пушиться без окремої перевірки.
Гейт стоїть між `apply` і `push`:

```text
propose → apply (код + зелені тести) → РЕВ'Ю-ГЕЙТ → sync → archive → push → CodeRabbit (backstop)
```

Два шари:

1. **Механічний (автоматика).** `pytest` + `markdownlint` — локально pre-push
   hook (`git config core.hooksPath .githooks`) і в CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)).
   Ловить клас «тести/лінтер/формат», тож він не доходить до PR. Обхід для WIP —
   `git push --no-verify`.
2. **Рев'ювер-пас (судження).** Перед комітом — `/code-review` по diff'у (або
   окремий рев'ювер-субагент для суворішого `maker ≠ checker`) на баги
   коректності; для SDD — звірка коду зі сценаріями спеки.

CodeRabbit у PR — **backstop**, а не перший рецензент. Кожна його знахідка, що
просочилась, стає новою автоматичною перевіркою (тест / lint-правило / пункт
рев'ю-чекліста), щоб цей клас не повторювався.

Markdownlint свідомо охоплює лише рукописні доки; OpenSpec-артефакти під
`openspec/**` перевіряються через `openspec validate` (їхній формат стартує з
`##`, що конфліктує з дефолтними правилами markdownlint).

## Структура коду

```text
askdocs/
  sources.py     # DocSource + LocalMarkdownSource
  chunking.py    # structure-aware розбиття markdown (блоки не ріжуться)
  embeddings.py  # EmbeddingProvider + SentenceTransformersProvider
  store.py       # VectorStore + QdrantStore
  retriever.py   # Retriever + VectorRetriever
  llm.py         # LLMProvider + OpenAICompatibleProvider
  answer.py      # конвеєр відповіді з цитуванням / чесна відмова
  cli.py         # термінальний інтерфейс
  sync.py        # безперервна синхронізація корпусу
  eval.py        # golden set + метрики
tests/           # pytest; tests/corpus — фікстурний ГущоЛіт, tests/golden.yaml
corpus/          # користувацький корпус, монтується у /corpus при `docker compose up`
```

## Команди

```bash
docker compose up                                      # qdrant + sync watcher над ./corpus
docker compose run --rm app pytest                     # уся батарея
docker compose run --rm app python -m askdocs.cli "…"  # питання
docker compose run --rm app python -m askdocs.eval     # звіт метрик
docker compose run --rm app python -m askdocs.ingest <dir>   # ручний ingest
```
