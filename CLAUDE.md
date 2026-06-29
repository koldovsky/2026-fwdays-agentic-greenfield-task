# CLAUDE.md

Контекст проєкту для Claude Code. Стан: дизайн, дизайн-система й план готові; код ще не написано.

## Що це

**Bookshelf** — локальний застосунок для нотаток по книжках. Прочитав книжку →
виписав кольорові нотатки (цитата + рефлексія) → зв'язав із іншими
книжками/нотатками → поставив оцінку (1–10) → написав самарі. Кожна книжка має
свою сторінку; головна сторінка групує книжки у «полиці» за тегами.

## Документи (читати перед роботою)

- **`docs/current-state.md`** — стан останньої роботи (читати ПЕРШИМ; вести за правилом нижче).
- `docs/product-brief.md` — навіщо/для кого, цінності, скоуп.
- `docs/requirements.md` — функціональні/нефункціональні вимоги, **модель даних**,
  **capabilities + залежності + власність над вимогами** (§5).
- `DESIGN.md` — опис **поточної дизайн-системи** (палітра, типографіка, компоненти).
- `docs/superpowers/plans/2026-06-27-bookshelf.md` — покроковий план реалізації (TDD).
- **`docs/design-system/`** — згенерована в claude.ai/design дизайн-система:
  **джерело істини для UI** (компоненти, токени, візуальна мова). Почати з
  `docs/design-system/readme.md`.

## Ключові рішення

- **Один користувач, один пристрій, локально.** БЕЗ авторизації, БД, хмари,
  повнотекстового пошуку. (YAGNI — не додавати без явного запиту.)
- **Сховище = файлова система.** Дані — звичайні Markdown + YAML frontmatter.
  Застосунок не має бути єдиним способом їх прочитати.
- **Стек:** Next.js (App Router) + React + TypeScript, `gray-matter`,
  `remark`/`remark-html`. Тести: Vitest + `@testing-library/react`.
- **Редагування повністю в застосунку** — UI пише `.md` файли через Server Actions.
- **UI — English**, sentence case ("Add book", не "Add Book"). Голос: «начитаний
  друг», 2-га особа ("your shelf"). Без емодзі. Деталі — `docs/design-system/readme.md`.
- **UI будуємо поверх `docs/design-system/`**, не з нуля: реальні компоненти
  (`BookCard`, `NoteCard`, `Rating`, `HighlighterPicker`, `core/*`, `Tabs`) і токени.

## Модель даних

```
content/books/<slug>/
  book.md            # frontmatter: title, author, cover|coverColor, status,
                     #             dateRead, rating(1-10), tags[], summary
  cover.<ext>        # обкладинка-зображення (опц.; інакше generated coverColor)
  notes/<note-id>.md # frontmatter: id, color, page?, excerpt?, links[]
                     # body = твоя рефлексія (markdown)
```

- **book.status:** `reading` | `finished` | `toread` (назви з дизайн-системи).
- **book.cover:** ім'я файлу-зображення; якщо нема — `coverColor` для генерованої
  обкладинки: `blue|coral|teal|purple|amber|green|ink`.
- **note.color:** `HighlighterKey` — один із **8 хайлайтерів** із закріпленим
  значенням:

  | колір | значення | колір | значення |
  |-------|----------|-------|----------|
  | yellow | idea | purple | theme/motif |
  | amber | question | blue | fact |
  | coral | disagree | teal | term/vocab |
  | pink | resonates | green | quote |

- **note.excerpt:** процитований уривок (фарбується кольором хайлайтера); **body** = рефлексія.
- **note.page:** номер сторінки (опц.).
- **link формати:** `book:<slug>` та `note:<slug>/<note-id>`.
- **tags:** хештеги — lowercase, без пробілів (`#philosophy`, `#re-read`).
- **slug:** авто-транслітерація з назви з можливістю ручної правки; колізії → `-2`, `-3`…
- Шлях до даних: `BOOKSHELF_CONTENT_DIR` (інакше `<cwd>/content`).

## Архітектура та межі

- **Лише `lib/content/*` і Server Actions торкаються файлової системи.** UI-компоненти
  отримують типізовані об'єкти (`Book`, `Note`), а не сирий текст чи `fs`.
- Шари: `lib/content/{paths,fs-utils,slug,books,notes,links,queries,index-data}`,
  `lib/markdown`, `app/actions.ts`, `components/*` (адаптери над дизайн-системою),
  `app/**` (сторінки).
- Усі записи файлів **атомарні** (temp + rename).
- Биті frontmatter → книжка позначається `malformed`, сторінка не падає.
- Посилання на неіснуючу ціль → визначається через `isBrokenLink`.

## Дизайн-система (`docs/design-system/`)

- **Токени** (`tokens/*.css`) + `styles.css` — підключати як основу стилів.
  Палітра: warm **paper** (`--paper-*`) + **ink** (`--ink-*`), одна акцентна
  ballpoint-blue (`--accent`), 8 хайлайтерів (`--hl-*` / `--hl-*-mark`).
  Семантичні аліаси (`--text-*`, `--surface-*`, `--accent*`) — використовувати їх,
  не сирі шкали. Темна тема: `data-theme="dark"` на `<html>`.
- **Шрифти** (Google Fonts CDN, див. `tokens/fonts.css`): Newsreader (serif,
  заголовки/цитати), Hanken Grotesk (UI), Spline Sans Mono (числа: `9/10`, `p.88`).
- **Іконки:** Lucide (2px stroke), із CDN.
- **Компоненти** (`components/<group>/`): `core/` (Button, IconButton, Input,
  Textarea, Select, Switch, Checkbox), `navigation/` (Tabs), `display/` (Tag, Badge,
  Avatar, Card), `book/` (Rating 1–10, HighlighterPicker, NoteCard, BookCard).
  Кожен має `.d.ts` (API) і `.prompt.md` (як використовувати).
- **`ui_kits/bookshelf/`** — готові сторінки-прототипи (HomeShelf, BookPage,
  NoteEditor, Sidebar) — референс для реалізації екранів.
- Синхронізація з claude.ai/design: проєкт `Bookshelf Design System`
  (`18192e51-5d02-4b2e-b59e-b966fbef3af1`).

## Конвенції розробки

- **TDD:** спершу падаючий тест, потім мінімальна реалізація. Кожна lib-функція
  покрита unit-тестами проти тимчасової теки (`BOOKSHELF_CONTENT_DIR`).
- **Git.** Репозиторій ініціалізовано; гілка роботи — `2026-ai-bookshelf`,
  remote `origin` → github.com/atovstonog/2026-fwdays-agentic-greenfield-task.
  Комітити осмисленими порціями (напр. по capability). Push — лише з дозволу.
- DRY, YAGNI. Малі файли з однією відповідальністю.
- **UI-тексти — English**; перед стилізацією читати токени/компоненти дизайн-системи.

## Команди

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # vitest run
npm run build
```

## Журнал стану — `docs/current-state.md` (ОБОВ'ЯЗКОВО)

**Правило:** наприкінці кожної значущої дії/сесії агент **мусить оновити**
`docs/current-state.md`. Це «жива» нотатка про останній стан роботи для наступної
сесії. Файл має містити:

- **Timestamp** останньої дії (абсолютний, локальний час — отримати через `date`).
- **Що зроблено останнього разу** — короткий опис (1–5 пунктів).
- **Поточна фаза/статус** проєкту (напр. «дизайн готовий, код не почато»).
- **Наступний крок** — що робити далі (з посиланням на задачу плану).
- **Відкриті питання / блокери**, якщо є.
- **Змінені файли** за останню дію (опц.).

Оновлювати файл **перед завершенням відповіді**, якщо щось змінилося в проєкті.
Не дублювати туди вміст інших доків — лише стан і вказівники.

## Поточний стан

Актуальний стан — у `docs/current-state.md` (єдине джерело). Тут лише вказівник.
