# LoopLedger

LoopLedger is a tiny dependency-free Python CLI for recording evidence of an
agentic engineering process. It was built as the fwdays Academy Agentic
Engineering: Greenfield homework project.

The product is intentionally small: it stores context, loops, verification checks,
maker/checker evidence, and spec-first decisions in a JSON ledger, then audits and
renders that evidence as Markdown.

## Quick Start

```bash
PYTHONPATH=src python -m loopledger.cli audit examples/agentic-homework.loopledger.json --strict
PYTHONPATH=src python -m loopledger.cli report examples/agentic-homework.loopledger.json
```

Create a new ledger:

```bash
PYTHONPATH=src python -m loopledger.cli new my-project.loopledger.json \
  --name "My Agentic Project" \
  --problem "Track agentic engineering evidence" \
  --owner "Yaroslav Tanko"
```

Record evidence:

```bash
PYTHONPATH=src python -m loopledger.cli practice my-project.loopledger.json \
  --kind context \
  --evidence "AGENTS.md documents static and dynamic context"

PYTHONPATH=src python -m loopledger.cli cycle my-project.loopledger.json \
  --goal "Build audit command" \
  --maker "Codex implementation pass" \
  --checker "Separate checker review" \
  --verification "python -m unittest discover -s tests"
```

## Verification

```bash
python -m unittest discover -s tests
python evals/evaluate.py
```

## Agentic Engineering Evidence

- Context engineering: `AGENTS.md`
- SDD/specification: `docs/specification.md`
- Course analysis: `docs/course-analysis.md`
- Loop record: `docs/agentic-process-log.md`
- Maker/checker pass: `docs/checker-review.md`
- Verification: `tests/test_loopledger.py` and `evals/evaluate.py`
- Demo plan: `docs/demo-script.md`
- Demo video: `demo/loopledger-demo.mp4`
- Example ledger: `examples/agentic-homework.loopledger.json`

## Project Scope Decision

I chose a Python CLI over a web app because the homework evaluates engineering
evidence, not visual surface area. This keeps the scope small enough to finish and
verify while still demonstrating the course practices.

---

# Original Homework: Agentic Engineering: Greenfield

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
