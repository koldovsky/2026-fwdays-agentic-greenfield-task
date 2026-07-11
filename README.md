fwdays Academy - Agentic Engineering: Greenfield. Homework-1: An agentic pipeline that turns video transcripts into polished articles, extracts networking terms, creates simple linked glossary cards, and prepares everything for human-reviewed GitBook publication.

# Transcript-to-GitBook Publishing Pipeline

## Українська

### Огляд

Проєкт автоматизує перетворення сирих транскриптів відеоуроків із комп’ютерних мереж на структуровані навчальні матеріали для GitBook.

Основна мета — не створити ідеальний матеріал з першої спроби, а значно скоротити час між отриманням транскрипту та публікацією уроку.

### Вхідні дані

Текстовий файл із транскриптом відеоуроку.

### Результат

* структурована стаття у форматі Markdown;
* виправлений і спрощений текст уроку;
* список технічних термінів;
* окремі Markdown-картки для термінів;
* короткі пояснення для людей без технічного бекграунду;
* зв’язки між пов’язаними картками;
* посилання на україномовну Вікіпедію;
* матеріали, підготовлені для публікації у GitBook.

### Процес

1. Отримати сирий транскрипт.
2. Прибрати повтори, зайві фрази та очевидні помилки транскрибування.
3. Перетворити текст на читабельну структуровану статтю.
4. Зберегти статтю у форматі Markdown.
5. Знаходити технічні терміни у порядку їх появи в матеріалі.
6. Створювати картку для кожного нового терміна.
7. Додавати коротке та просте пояснення терміна.
8. Посилатися на пов’язані картки або україномовну Вікіпедію.
9. Перевіряти структуру, посилання та узгодженість матеріалів.
10. Передавати результат людині-оркестратору на вичитку.
11. Публікувати схвалені матеріали у GitBook.

### OpenSpec-based SDD

Розробка та автоматизація процесу будуватимуться навколо OpenSpec-based Specification-Driven Development.

Специфікації мають бути основним джерелом вимог до:

* структури статей;
* формату карток термінів;
* правил пошуку та пояснення термінів;
* зв’язків між матеріалами;
* перевірок якості;
* агентів та їхніх обов’язків;
* процесу ручного погодження;
* публікації у GitBook.

Кожна зміна повинна спочатку описуватися як специфікація, потім розкладатися на задачі, реалізовуватися та перевірятися.

### Людина в процесі

Людина-оркестратор відповідає за:

* фактичну точність;
* якість української мови;
* зрозумілість пояснень;
* пропущені або зайві терміни;
* фінальне погодження;
* публікацію.

### MVP

Перша версія повинна обробляти один транскрипт і створювати:

* одну Markdown-статтю;
* набір карток термінів;
* внутрішні та зовнішні посилання;
* звіт про виконані перевірки;
* матеріали для ручного погодження.

### Критерій успіху

Проєкт успішний, якщо він скорочує час підготовки уроку до публікації та залишає фінальний контроль за людиною.

---

## English

### Overview

This project automates the transformation of raw computer networking lesson transcripts into structured educational materials for GitBook.

The goal is not to produce perfect content on the first pass. The goal is to reduce the time between receiving a transcript and publishing a reviewed lesson.

### Input

A plain-text transcript of a video lesson.

### Output

* A structured Markdown article
* Cleaned and simplified lesson content
* A list of technical terms
* Separate Markdown glossary cards
* Short explanations for non-technical readers
* Links between related glossary cards
* Links to Ukrainian Wikipedia
* GitBook-ready materials

### Workflow

1. Receive the raw transcript.
2. Remove repetition, filler, and obvious transcription errors.
3. Transform the content into a readable structured article.
4. Save the article as Markdown.
5. Extract technical terms in the order they appear.
6. Create a glossary card for each new term.
7. Add a short and simple explanation.
8. Link related cards or Ukrainian Wikipedia pages.
9. Validate structure, links, and content consistency.
10. Send the result to a human orchestrator for review.
11. Publish the approved materials to GitBook.

### OpenSpec-based SDD

Development and workflow automation will be built around OpenSpec-based Specification-Driven Development.

Specifications will define:

* article structure;
* glossary card format;
* term extraction and explanation rules;
* links between materials;
* quality checks;
* agent roles and responsibilities;
* human approval workflow;
* GitBook publication process.

Each change should first be described as a specification, then converted into tasks, implemented, and validated.

### Human in the Loop

The human orchestrator remains responsible for:

* factual accuracy;
* Ukrainian language quality;
* clarity of explanations;
* missing or unnecessary terms;
* final approval;
* publication.

### MVP

The first version should process one transcript and produce:

* one Markdown article;
* a set of glossary cards;
* internal and external links;
* a validation report;
* materials ready for human review.

### Success Criteria

The project is successful when it reduces lesson preparation time while keeping final control and publication approval in human hands.

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
