# Transcript-to-GitBook Publishing Pipeline

## Українська

### Огляд

Проєкт автоматизує перетворення сирих транскриптів відеоуроків із комп’ютерних мереж на структуровані навчальні матеріали для GitBook.

Основна мета — не створити ідеальний матеріал з першої спроби, а значно скоротити час між отриманням транскрипту та публікацією уроку.

[Оригінальна умова домашнього завдання](docs/course-assignment.md)

[PRD](docs/prd.md)

### Залежності

Системні інструменти, потрібні конвеєру. Стек проєкту ще не обрано — цей список стосується зовнішніх утиліт, не бібліотек.

| Інструмент | Навіщо | Пакет | Джерело |
|---|---|---|---|
| `pdftotext` | конвертує PDF (конспекти, слайди) у текст для агента-автора | `poppler` | [poppler.freedesktop.org](https://poppler.freedesktop.org/) · [Arch](https://archlinux.org/packages/extra/x86_64/poppler/) · [Fedora](https://packages.fedoraproject.org/pkgs/poppler/poppler-utils/) · [Debian](https://packages.debian.org/stable/poppler-utils) |
| `pdfimages` | витягує схеми зі слайдів (поза MVP, потрібен пізніше) | `poppler` | те саме |

Перевірити наявність:

```bash
pdftotext -v   # очікується: pdftotext version 26.07.0 або новіша
pdfimages -v
```

Установка:

```bash
sudo pacman -S --needed poppler      # Arch
sudo dnf install poppler-utils       # Fedora, Rocky, AlmaLinux
sudo apt install poppler-utils       # Debian
brew install poppler                 # macOS
```

Якщо `pdftotext` відсутній — конвеєр не має мовчки пропускати PDF. Він зупиняється й повідомляє, якої залежності бракує.

### Вхідні дані

Матеріали одного уроку: субтитри (`.sbv`), PDF-конспект, PDF-презентація, готовий конспект у Markdown. Агент-автор приймає все й сам вирішує, що з цього джерело, а що доповнення.

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

[Original homework assignment](docs/course-assignment.md)

[PRD (Ukrainian)](docs/prd.md)

### Dependencies

System tools the pipeline needs. The project stack is not chosen yet — this list covers external utilities, not libraries.

| Tool | Why | Package | Source |
|---|---|---|---|
| `pdftotext` | converts PDFs (lecture notes, slides) to text for the author agent | `poppler` | [poppler.freedesktop.org](https://poppler.freedesktop.org/) · [Arch](https://archlinux.org/packages/extra/x86_64/poppler/) · [Fedora](https://packages.fedoraproject.org/pkgs/poppler/poppler-utils/) · [Debian](https://packages.debian.org/stable/poppler-utils) |
| `pdfimages` | extracts diagrams from slides (out of MVP scope, needed later) | `poppler` | same |

Check they are present:

```bash
pdftotext -v   # expected: pdftotext version 26.07.0 or newer
pdfimages -v
```

Install:

```bash
sudo pacman -S --needed poppler      # Arch
sudo dnf install poppler-utils       # Fedora, Rocky, AlmaLinux
sudo apt install poppler-utils       # Debian
brew install poppler                 # macOS
```

If `pdftotext` is missing, the pipeline must not silently skip PDFs. It stops and reports the missing dependency.

### Input

The materials of one lesson: captions (`.sbv`), a PDF lecture summary, a PDF slide deck, and an existing Markdown summary. The author agent takes all of them and decides for itself which is source and which is supplement.

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
