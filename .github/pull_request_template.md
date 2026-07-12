<!-- Домашнє завдання — Agentic Engineering: Greenfield.
     Заповни всі розділи. Стек — будь-який. -->

## Автор
Vitalii Liashenko


## Проєкт
Telegram-бот для обліку витрат (Python 3.10+, LangChain + OpenAI GPT-4o-mini, PostgreSQL, Pydantic v2). Користувач пише вільним українським текстом («купив каву за 50», «на бенз 200грн») — LLM-агент витягує структуровану витрату, rule-based checker валідує, результат зберігається в PostgreSQL, а `/report` показує список + суму. 


## Відео-демо (1–2 хв)
Video: https://drive.google.com/file/d/1no6kbRFtTIuMTJIcAczqfIWM4jAifVOf/view?usp=drive_link


## Які практики Agentic Engineering застосовано

### Контекст-інженерія (статичний vs динамічний контекст)

- **Статичний контекст — [AGENTS.md](AGENTS.md)**: єдиним джерелом правди для агента-парсера. Містить роль, жорстку JSON-схему `Expense`, словник із 8 канонічних категорій, правила виведення datetime (таблиця кейсів), правила confidence-скорингу, few-shot приклади та hard/soft-fail правила валідації. [CLAUDE.md](CLAUDE.md) просто делегує до `AGENTS.md`, щоб уникнути розходжень. Системний промпт у [src/agent.py](src/agent.py) віддзеркалює ці правила.
- **Динамічний контекст**: у кожен LLM-виклик інжектиться receipt timestamp (`Message received at: <ISO 8601>`) — агент ніколи не бере «сьогодні» з тренувальних даних, лише з цього поля. При retry до тексту додається `Validation feedback: ...` від checker'а, тобто контекст наступної спроби збагачується помилкою попередньої.

### Цикли (loop engineering) замість покрокового промптингу

- Замість того, щоб крокувати за підказкою людини («напиши файл X» → «тепер тест» → «теперь запусти»), кожну фічу агент виконував автономним циклом: отримав список задач зі спеки → виконав → перевірив тестами → позначив → наступна. Умовою виходу з циклу був не «здається, готово», а зелені тести (`pytest tests/` + eval pass-rate ≥ 80%) і повністю позначений `tasks.md`.

- Сам реліз MVP теж був циклом, а не одним проходом: спека (PRD від `grilling`) → реалізація → тести → архітектурне рев'ю (`/improve-codebase-architecture`) → нова спека за результатами рев'ю → повторна реалізація. Тобто проміжний рев'ю-прогін увімкнув ще один цикл «знайти борг → задокументувати → виправити» поверх готового коду.

### Maker ≠ Checker

- Код писав maker (Claude Code: реалізація, спеки, тести), але він ніколи не сам сертифікував «працює». Верифікація завжди йшла окремим, незалежним проходом, який maker не міг обійти заявкою: unit-тести й reasoning evals з gate ≥ 80% ([tests/](tests/)) — детермінований checker, що судить роботу агента-автора об'єктивно, а не за його власною впевненістю.
- Окремий прохід на рев'ю: на проміжному етапі запущено скіл `/improve-codebase-architecture` — окремий review-пас, який не писав код, а критикував архітектуру maker'а. Він виявив 4 слабких місця (дубльовані правила валідації, side-effects на імпорті, відсутність testability-seam у storage, retry-логіка, зав'язана на живі залежності). За результатами створено OpenSpec-зміну `arch-review-improvements` (proposal/design/tasks) і реалізовано 4 виправлення. Рев'юер ≠ автор реалізації — різні проходи, як і вимагає принцип.
- OpenSpec як окремий checker для спек: спека (proposal/design) писалась до коду, а її acceptance-критерії в кінці `tasks.md` (`Run pytest and confirm…`, `confirm eval pass rate ≥80%`, `Manually test end-to-end`) — незалежний чекліст, проти якого звірялась реалізація, а не самооцінка імплементатора.

### Верифікація: тести / evals / перевірки замість «здається, працює»

Перевірка функціоналу відбувається тестами, розбитими на шари:

- **Unit-тести (офлайн, без LLM і БД)** через інжектовані фейки:
  - [tests/test_validator.py](tests/test_validator.py) — hard-fail правила на рівні Pydantic-конструкції (amount ≤ 0, null amount/category, інвалідна категорія, future datetime, порожній description) + прийняття всіх 8 категорій.
  - [tests/test_processor.py](tests/test_processor.py) — retry-логіка з `fake_extract`/`fake_validate`: успіх на 2-й спробі, вичерпання 3 спроб, передача feedback після exception. Без LLM/БД.
  - [tests/test_storage.py](tests/test_storage.py) — `ExpenseStore` з `FakeConnection` (без живого PostgreSQL).
  - [tests/test_agent_datetime.py](tests/test_agent_datetime.py) — виведення datetime з `FakeChain` (без LLM).
- **Reasoning evals**: [tests/evals/test_reasoning.py](tests/evals/test_reasoning.py) — 9 golden-кейсів проти реальної моделі + агрегований тест `test_eval_pass_rate` з gate **≥ 80%**.
- **Integration tests**: [tests/test_integration.py](tests/test_integration.py) — E2E `parse → validate` (happy path, hard-fail на vague input, retry, multi-expense split, combined-total).
- **LangSmith evaluators** ([src/evals.py](src/evals.py)): `category_accuracy`, `amount_accuracy` (з tolerance), `confidence_calibration` — оцінка коректності LLM-відповідей поверх референсного датасету [data/eval_reference.json](data/eval_reference.json).
- **LangSmith tracing** ([src/agent.py](src/agent.py)): кожен виклик ланцюга трасується до smith.langchain.com з метаданими (amounts/categories/confidences); `submit_feedback()` дозволяє надсилати корекції для тренування evaluator'ів.

### Специфікації наперед (SDD)

- **MVP**: спочатку PRD ([docs/prd.md](docs/prd.md)), згенерований через скіл **grilling** (Matt Pocock, зафіксовано у [skills-lock.json](skills-lock.json)) — інтерактивний допит виробив spec, далі MVP імплементовано через Claude Code.
- **Наступні фічі** — через **OpenSpec**: 4 заархівовані зміни у [openspec/changes/archive/](openspec/changes/archive/) (`add-langchain`, `multi-expense-split`, `store-purchase-datetime`, `add-langsmith`, `arch-review-improvements`), кожна з `proposal.md` / `design.md` / `tasks.md` / delta-спеками. Поточний стан можливостей — у [openspec/specs/](openspec/specs/) (8 capability specs). Тобто спека пишеться до коду, а не навпаки.

### Інструменти / MCP

- Claude Code + skills: `grilling` (PRD для MVP), `improve-codebase-architecture` (проміжне рев'ю + спека за результатами), OpenSpec (SDD для наступних фіч).
- LangChain (LCEL chain + structured output через Pydantic), LangSmith (tracing + evals), `python-telegram-bot`, PostgreSQL (Docker Compose).
- pytest / black / ruff / mypy — локальні гейт-перевірки.

### Що вирішував я, а що — агент

- **Я**: фінальні архітектурні рішення (валідація в Pydantic, інжектовані seams замість `@patch`, `ExpenseStore` з `conn_factory`), вибір категорій і схеми, прийняття/відхилення пунктів рев'ю, формулювання acceptance criteria у PRD.
- **Агент (Claude Code)**: написання коду й тестів, генерація proposal/design/tasks у OpenSpec, виконання рев'ю архітектури та пропозицій за його результатами, реалізація фіч за спеками.


## (Опційно) Посилання на код
<!-- Проєкт живе в цьому репозиторії, гілка feature. -->


---

### Чекліст
- [x] Вказано справжнє імʼя
- [x] Додано посилання на відео-демо (1–2 хв)
- [x] Описано застосовані практики Agentic Engineering
- [x] Результат робочий і доведений до кінця
