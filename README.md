# Agentic Engineering: Greenfield — домашнє завдання

Курс **fwdays Academy · Agentic Engineering: Greenfield**.

Це завдання — **не про розмір продукту, а про процес**: показати, що ти вмієш будувати з нуля, керуючи AI-агентами **інженерно** (контекст, цикли, верифікація, maker ≠ checker), а не «вайбкодити».

> Стек — **будь-який**. Цей репозиторій навмисно майже порожній: він не привʼязаний до жодної технології. Ти приносиш свій проєкт і свій підхід.

## Що зробити

1. **Побудуй невеликий власний проєкт** — будь-який, який тобі цікавий.
   - Стек вільний: Next.js, Python, Go, Rust, мобільний застосунок, CLI, бот — на твій вибір.
   - Масштаб скромний. Краще маленький проєкт, проведений через повний інженерний цикл, ніж великий «наче працює».
2. **Застосуй практики Agentic Engineering** з курсу — стільки, скільки доречно для твого проєкту:
   - контекст-інженерія (правила / `AGENTS.md`, статичний vs динамічний контекст);
   - цикли (loop engineering) замість ручного покрокового промптингу;
   - верифікація: тести / evals / перевірки замість «здається, працює»;
   - maker ≠ checker (окремий агент або прохід на рев'ю);
   - специфікації наперед (SDD), якщо доречно.
   - **Project Factory — за бажанням, не обовʼязково** (хочеш повну фабрику — запусти `/project-factory:init` у себе).
3. **Запиши відео-демо на 1–2 хвилини**: коротко покажи продукт і розкажи, **як саме ти будував(ла) його агентно**.

## Як здати

1. Зроби **fork** цього репозиторію (разом із ним приїдуть конфіг CodeRabbit і шаблон PR).
2. Увімкни **CodeRabbit** на своєму форку (безкоштовно для публічних репо) — він рев'юитиме твій PR як ментор, українською.
3. Поклади свій проєкт у форк на окрему гілку (будь-яким стеком). Якщо зручніше тримати код в окремому репозиторії — додай на нього посилання в описі PR.
4. Відкрий **Pull Request** і заповни шаблон:
   - **Імʼя** (справжнє);
   - **посилання на відео-демо** (1–2 хв);
   - **опис застосованих практик Agentic Engineering** — що саме ти робив(ла) агентно, які інструменти / MCP використав(ла), що вирішував(ла) ти, а що агент.
5. Прочитай фідбек CodeRabbit, поітеруй за потреби — і **надішли посилання на свій PR** як здачу.

## Як оцінюється

Дивимось на **докази процесу**, а не на стек:

- ✅ вказане справжнє імʼя;
- ✅ є відео-демо (1–2 хв);
- ✅ є **змістовний опис** застосованих агентних практик;
- ✅ результат доведено до кінця (а не «згенерував і кинув»).

**Бонус** — видимі артефакти інженерії: правила / `AGENTS.md`, специфікації, тести / evals, сліди верифікації, окреме рев'ю, записи демо.

---

Питання — у каналі курсу. Успіхів, і нехай цикли працюють на тебе 🟢

## Traffic Sign Scanner MCP (Cursor)

This repository includes a stdio MCP server for offline Core detection verification from Cursor.

### Prerequisites

- .NET 10 SDK
- Bundled model at `src/TrafficSignScanner.App/Resources/Raw/model.onnx`
- Cursor MCP config in `.cursor/mcp.json` (server name: `traffic-sign-scanner`)

Reload MCP servers in Cursor after pulling changes (**Settings → MCP → Refresh**).

### Tools

| Tool | Purpose |
| --- | --- |
| `detect_objects(imagePath)` | Run the same Core detector pipeline as the MAUI app on a local image file |
| `get_model_info()` | Return ONNX input/output names, tensor shape, labels, and confidence threshold |

### Example

Ask Cursor to call `detect_objects` with an absolute path to an eval image, for example:

`evals/dataset/stop-sign/stop-sign-01.jpg` (relative to repo root) or the full Windows path.

`get_model_info()` returns metadata aligned with `docs/model-contract.md`.

### Notes

- Only local image files with extensions `.jpg`, `.jpeg`, `.png`, `.webp`, or `.bmp` are accepted.
- Invalid or missing paths return a structured MCP error **before** inference runs.
- Set `TRAFFIC_SIGN_SCANNER_ROOT` if the server cannot locate `TrafficSignScanner.slnx` automatically.
