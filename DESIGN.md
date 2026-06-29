# Bookshelf — Design

_Дата: 2026-06-27_

Опис **поточної дизайн-системи** Bookshelf. Це короткий, читабельний дайджест
того, що живе у `docs/design-system/` (згенеровано в claude.ai/design, проєкт
`Bookshelf Design System`). Першоджерела: `docs/design-system/readme.md`,
`styles.css`, `tokens/*.css`, `components/**`, `guidelines/foundations/*`.

> Capability-розбивка, залежності й власність над вимогами — **не тут**, а в
> `docs/requirements.md` §5. Тут — лише дизайн.

## Бренд-ідея

**Ручка й жменя маркерів на теплому папері.** Один колір дії (кулькова синя),
повний спектр маркерів — виключно для нотаток, літературний serif для всього, що
«читається як книжка», і текстури зошита (лінійки, точкова сітка) як сполучна
тканина. Настрій: грайливо, тепло, по-читацькому — не корпоративно, не мило.

## Голос і тексти

- **English, sentence case** скрізь («Add book», не «Add Book»). Єдиний all-caps —
  моно-eyebrow, зрідка.
- Голос — **начитаний друг**: тепло, просто, трохи літературно. Друга особа
  («your shelf», «future-you»). Короткі речення.
- **Числа — моно й конкретні:** `9/10`, `p.88`, дати `2026·03·14`.
- **Теги — хештеги:** lowercase, без пробілів (`#philosophy`, `#re-read`).
- **Без емодзі.** Особистість дають колір, шрифт і текстура.

## Кольори (`tokens/colors.css`)

Працювати через **семантичні аліаси**, не через сирі шкали.

- **Paper** (теплі нейтральні поверхні): `--paper-0 #fff` … `--paper-1 #faf6ec`
  (сторінка, тепла кремова) … `--paper-4`. Аліаси: `--surface-page/card/sunken/inset`.
- **Ink** (теплий майже-чорний текст/лінії): `--ink-0 #17130c` … `--ink-6`.
  Аліаси: `--text-primary/secondary/muted/faint/inverse`.
- **Brand — кулькова синя:** шкала `--blue-50…900`, основна `--blue-500 #3a4fe0`.
  Аліаси: `--accent`, `--accent-hover/pressed/soft/on`. **Один сильний акцент на екран.**
- **Highlighter spectrum (кольори нотаток), 8 шт.** — кожен має насичений `--hl-*`
  (спайн/крапка) і напівпрозорий `--hl-*-mark` (маркер поверх тексту):

  | key | `--hl-*` | key | `--hl-*` |
  |-----|----------|-----|----------|
  | yellow | `#ffd84d` | purple | `#b083f5` |
  | amber | `#ffaf45` | blue | `#5ab2ff` |
  | coral | `#ff6f5e` | teal | `#3ccfbf` |
  | pink | `#ff7fb8` | green | `#7fd96f` |

  Зарезервовані майже виключно для нотаток, крапок-полиць і генерованих обкладинок —
  **ніколи для chrome.**
- **Semantic status:** `--success` (green), `--warning` (amber), `--danger` (red)
  + `*-soft` фони. Тільки для статусів.
- **Focus ring:** `--focus-ring` (3px blue).
- **Dark mode** («reading lamp»): `data-theme="dark"` (або `.dark`) на `<html>` —
  глибокий теплий ink-ґрунт (`--paper-1 #1a1610`), paper інвертується, хайлайтери
  трохи приглушені, синій яскравішає.

## Типографіка (`tokens/typography.css`)

- **Display — Newsreader** (serif): заголовки, обкладинки, цитати, уривки нотаток
  (часто *italic*). Роль `--font-title`.
- **UI — Hanken Grotesk** (гуманістичний sans): body, лейбли, контроли. `--font-body`.
- **Meta — Spline Sans Mono**: **лише числа** (оцінки, сторінки, дати, лічильники).
  `--font-meta`.
- **Шкала:** `--text-xs 12` … `--text-base 15` (UI body) … `--text-md 17`
  (reading body) … `--text-5xl 62`.
- **Ваги:** `--weight-regular 400` … `--weight-extra 800`.
- **Інтерліньяж:** `--leading-tight 1.08` … `--leading-relaxed 1.65` (читання — 17px/1.6).
- **Трекінг:** display щільний (`--tracking-tight -0.02em`); eyebrow caps `0.08em`.
- Шрифти — з **Google Fonts CDN** (`tokens/fonts.css`), не self-hosted.

## Простір і розкладка (`tokens/spacing.css`)

- **База 4px:** `--space-1 4` … `--space-24 96`.
- **Layout:** `--container-max 1180px`, `--reading-max 680px` (колонка самарі/нотаток),
  `--sidebar-w 264px` (фіксований лівий сайдбар), `--header-h 60px`.
- **Ритм лінійок зошита:** `--rule-height 32px`.

## Форма, тіні, рух (`tokens/effects.css`)

- **Радіуси (дружні, «зошитові»):** контроли `--radius-sm 8` / `--radius-md 12`,
  картки `--radius-lg 16`, модалки `--radius-xl 22`, пігулки `--radius-full`.
- **Межі:** `--border-w 1px`; теплі hairlines (`--border-default`).
- **Тіні — теплі, низькі, паперові:** `--shadow-xs … --shadow-xl`; ніколи холодний
  сірий чи неоновий glow. У темній темі — чорна alpha.
- **Рух — швидкий, легко пружинистий:** `--dur-fast 120ms`, `--dur-base 180ms`;
  `--ease-out` для кольору/прозорості, `--ease-spring` для тоглів і вибору свотча
  (легкий overshoot). Без довгих фейдів і нескінченних декоративних циклів.
- **Текстури (як background):** `--texture-rule` (лінійки, ритм 32px) на поверхнях
  для письма (самарі, тіло нотатки); `--texture-dot` (точкова сітка). Текстура
  сигналізує «тут пишуть».
- **Прозорість/blur** — лише в одному місці: scrim модалки редактора нотатки.

## Картки й нотатки

Картки — **білий папір на кремовому** з 1px теплим hairline (`--border-default`) і
низькою теплою тінню (`--shadow-sm`). Нотатки (і деякі картки) мають **4px лівий
кольоровий спайн** у кольорі свого хайлайтера — спайн завжди кодує *реальний*
колір нотатки, не декорація. `interactive`-картки підіймаються на `-3px` при hover.

## Іконографіка

**Lucide** (2px stroke, із CDN): `<i data-lucide="name">` + `lucide.createIcons()`
або як ноди в `Button`/`IconButton`. Stroke, не fill; без емодзі-іконок. Гліфи:
`library`, `book-open`, `sticky-note`, `bookmark`, `highlighter`, `link`/`link-2`,
`pencil`, `search`, `plus`, `star`, `sun`/`moon`, `arrow-left`, `check`, `x`.
**Brand-ассети** (`assets/`): `logo-mark.svg`, `logo-wordmark.svg`.

## Компоненти (`components/**`)

Namespace бандла: `window.BookshelfDesignSystem_18192e`. Кожен компонент має
`.jsx`, `.d.ts` (контракт) і `.prompt.md` (як використовувати).

- **core/** — `Button`, `IconButton`, `Input`, `Textarea`, `Select`, `Switch`, `Checkbox`.
- **navigation/** — `Tabs`.
- **display/** — `Card`, `Badge`, `Tag`, `Avatar`.
- **book/** (доменні):
  - `Rating` — підписна оцінка 1–10.
  - `HighlighterPicker` — ряд свотчів 8 кольорів (`HighlighterKey`), `value`/`onChange`.
  - `NoteCard` — спайн-хайлайтер + цитата (`excerpt`) + рефлексія (`note`) + `page`/`tags`/`links`.
  - `BookCard` — обкладинка (`coverSrc`) або генерована (`cover` ∈ blue/coral/teal/
    purple/amber/green/ink), назва, автор, `rating`, `status` (reading/finished/toread), `notes`.

## Готові екрани (`ui_kits/bookshelf/`)

Клікабельний прототип застосунку — референс композиції екранів:
`HomeShelf` (полиця), `BookPage` (сторінка книжки), `NoteEditor` (редактор),
`Sidebar`, `Icon`, `data.js`. Див. `ui_kits/bookshelf/README.md`.

## Як використовувати

1. Підключити `styles.css` — він тягне токени, шрифти та interaction-states.
2. Брати `--accent` для одного сильного action; `--hl-*` — лише для нотаток і
   обкладинок; `ruled`/`--texture-rule` — на поверхнях для письма.
3. Перед UI-роботою читати `.prompt.md` потрібного компонента й відповідні `tokens/*.css`.
