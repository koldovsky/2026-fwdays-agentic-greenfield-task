# Bookshelf — Current State

> Жива нотатка про останній стан роботи. Оновлюється агентом наприкінці кожної
> значущої дії (правило — у `CLAUDE.md`). Єдине джерело про «де ми зараз».

**Останнє оновлення:** 2026-06-29 14:20:12 EEST

**Поличка (полірування):** корінці тепер **як справжні книжки** (палітурка-highlight,
головки/хвостики, тінь сторінкового зрізу, варіативна висота+товщина); **hover → легке
прев'ю** (обкладинка+самарі, без scrim), **клік → повний попап** (`BookPopup`).
OpenSpec: `update-shelf-spines` + `add-shelf-hover-preview` (обидва archived).
**Перевірено в реальному Chromium (Playwright):** корінці, прев'ю (приховане→hover),
клік→попап, **0 console/hydration-помилок**. Баг «колір нотатки» НЕ відтворився — у
браузері свотч обирається коректно (`value=green`, `aria-checked=true`).
Тести **63/63**, tsc/build зелені.

Hover-прев'ю відкривається **вниз** від книжки (не перекриває заголовок). Локально
засіяно ~11 книжок у `./content` (gitignored) — 9 тег-полиць.

**Навігацію спрощено (фікс «клік нічого не робить»):** причина — модалка по кліку
залежала від гідратації; у браузері користувача JS не «оживав», тож клік нічого не
робив, а видно було лише CSS-hover-прев'ю (глухий кут). **Рішення:** корінець тепер
**справжнє посилання `<a href="/book/<slug>">`** — клік навігує **завжди, без JS**;
hover-прев'ю отримало посилання **Open book / ＋ Add note**; модалку (`BookPopup`)
прибрано. **Перевірено клік-навігацію в Chromium І WebKit (рушій Safari)** — NAV OK, 0
помилок. OpenSpec: `add-popup-actions` → потім `simplify-shelf-navigation` (обидва
archived; −Book summary popup). Тести **62**, tsc/build зелені.

Урок: hover (CSS) працює без гідратації, клік-стейт — ні; для критичних шляхів —
звичайні `<a>`, а не JS-only обробники.

**КОРІНЬ усіх «не клікається» знайдено (2026-06-29):** застосунок відкривався через
**LAN-IP `192.168.0.204:3000`**, а Next dev **блокує cross-origin доступ до `/_next`
(HMR+чанки)** → сторінка не гідратується → будь-який `onClick` мертвий (свотч кольору,
стара модалка), а hover (CSS) працює. Доведено before/after через IP (без конфігу клік
лишає `yellow`; з конфігом → `green`; у лозі `⚠ Blocked cross-origin request`).
**Фікс:** `allowedDevOrigins` у `next.config.ts` (коміт `00dd20d`). **Треба перезапуск
dev-сервера.** Додати свій LAN-IP, якщо інший.

**Головну перероблено на дерев'яну книжкову шафу** (референс користувача): рама,
заглиблені полиці з дерев'яними дошками, тег-лейбли, щільні різнокольорові корінці
(`.bs-bookcase`/`.bs-shelf`/`BookSpine`). Додано дерев'яний грейн + нахил останньої
книжки («притулена»). 62 тести, tsc/build зелені.

**`GET /sw.js` 404:** не наш SW — застряглий service worker від попереднього застосунку
на цьому порту. Додано self-unregistering `public/sw.js` (kill-switch: чистить кеші +
розреєстровується). Тепер `/sw.js` → 200.

**Дані:** локально засіяно **топ-100 книжок** у `content/` (gitignored) — 100 книжок
**із короткими самарі** (видно в hover-прев'ю та на сторінці книжки), 176 корінців на
~20 тег-полицях; шафа повна. Книжки рівні; під кожним рядом — суцільна дошка від стінки
до стінки (фоновий патерн полиці).

**Навігація + легенда (OpenSpec `add-navigation-and-color-legend`, archived):**
- **Хлібні крихти** (`components/Breadcrumbs.tsx`) на внутрішніх сторінках (book,
  book new/edit, note new/edit) — нова capability `navigation`.
- **Легенда кольорів** у редакторі нотатки (`NoteForm`): 8 кольорів → значення
  (Idea/Question/Disagree/Resonates/Theme/Fact/Term/Quote), обраний виділено — `note-editor` (+1 req).
64 тести, tsc/build зелені.

**Нотатки + зв'язки (локальні дані):** для перших 50 книжок засіяно по 2 нотатки
різних типів-кольорів (Idea/Question/…/Quote) з excerpt/page/рефлексією та посиланнями
на сусідні книжки й їхні нотатки → граф беклінків наповнено (видно «Linked from» на
сторінках книжок). 100 нотаток усього.

**Сторінка графу `/graph` (OpenSpec `add-graph-view`, archived):** SVG-хордова діаграма
зв'язків між книжками (`lib/content/graph.ts` `buildGraph` + `app/graph/page.tsx`,
`coverSolid`). Вузли = книжки (колір=coverColor, розмір=ступінь), ребра = посилання нотаток,
клік → сторінка книжки. Кнопка «Graph» у шапці полиці. 66 тестів, tsc/build зелені.

**Git:** гілка `2026-ai-bookshelf`, remote `origin` (SSH: `git@github.com:atovstonog/
2026-fwdays-agentic-greenfield-task`). **Запушено** (`273ccd9` foundation + `7a8ed87` docs),
відстеження налаштовано. Push працює через SSH (HTTPS креденшелів нема).

> **Git увімкнено.** Гілка `2026-ai-bookshelf`, remote `origin` →
> github.com/atovstonog/2026-fwdays-agentic-greenfield-task. Комітимо по capability;
> push — лише з дозволу.

## Поточна фаза

**УСІ 15 capabilities (C1–C15) реалізовано й заархівовано.** Застосунок повністю
збирається: **61/61 тестів зелені**, `tsc --noEmit` чисто, `npm run build` ✓
(роути: `/`, `/book/[slug]`, `[...cover]`, `/book/new`, `/edit`, `/notes/new`, `/notes/[id]/edit`).
15 специфікацій у `openspec/specs/`, активних changes нема.

UI/мутації (C9,C10,C15,C11–C14) зроблено **паралельно через Workflow** (2 хвилі,
спільне дерево). Незалежна перевірка (build) піймала латентну ваду плану: у
`'use server'`-модулі всі експорти мусять бути async — чисті парсери винесено в
`lib/content/forms.ts`, `app/actions.ts` лишив лише async-екшени.

## Зроблено (реалізація)

Реалізовано й заархівовано C1–C8 (TDD). Файли в `lib/content/` + `lib/markdown.ts`:
- **C1 storage-io** — `paths.ts`, `fs-utils.ts`.
- **C2 domain-model** — `types.ts`, `colors.ts`.
- **C3 slug** — `slug.ts` (укр→лат транслітерація, fallback `book`).
- **C4 book-store** — `books.ts` (parse/serialize/CRUD, unique slug, malformed) [gray-matter].
- **C5 note-store** — `notes.ts` (CRUD, tolerant defaults, excerpt/page).
- **C6 links-backlinks** — `links.ts` (parseLink/linkKey/linkHref/buildBacklinkIndex/isBrokenLink).
- **C7 markdown-render** — `markdown.ts` (md→HTML + `[[…]]` wiki-links) [remark].
- **C8 queries** — `queries.ts` (groupBooksByTag), `index-data.ts` (loadBacklinkIndex/loadLinkTargets).

UI/мутації — `app/`, `components/`:
- **C10 design-system-integration** — `components/ds/*` (вендорено, `'use client'`), `app/design-system/*` (токени+styles), `app/layout.tsx`, `app/globals.css`.
- **C9 mutations** — `app/actions.ts` (async-екшени), парсери в `lib/content/forms.ts`.
- **C15 cover-images** — `app/book/[slug]/[...cover]/route.ts`, `atomicWriteBuffer`.
- **C11 shelf** — `app/page.tsx`, `BookCardLink`, `TagShelf`.
- **C12 book-page** — `app/book/[slug]/page.tsx`, `NoteCardView`, `Backlinks`.
- **C13 book-form** — `app/book/new`, `[slug]/edit`, `BookForm`.
- **C14 note-editor** — `app/book/[slug]/notes/*`, `NoteForm`, `LinkPicker`.

Усі 15 специфікацій у `openspec/specs/`. Архів: `openspec/changes/archive/`.

## Наступні кроки (опційні)

Усі capabilities готові. Далі — на вибір:
- Запустити застосунок: `npm run dev`, додати книжку, нотатки (E2E вручну).
- Закомітити UI-шар + (за дозволу) `git push`.
- Дрібниці: прибрати/лишити Tailwind (зайвий, бо стилізуємо токенами); Lucide-іконки;
  перемикач темної теми; рендер markdown усередині рефлексії нотатки (зараз plain text).

## Тулчейн (факт)

- Next.js 16 + React 19 + TypeScript, Tailwind 4 (зі скафолду), ESLint.
- Vitest 4.1.9. Тести: `npm test`. Дані: `BOOKSHELF_CONTENT_DIR` (інакше `<cwd>/content`).
- ⚠ Розбіжність із планом: скафолд має **Tailwind**, хоча план передбачав `--no-tailwind`.
  Не блокує (UI стилізуємо токенами дизайн-системи); прибрати/лишити Tailwind вирішимо на C10.

## Раніше в цій сесії

- Створено фронтенд-скіл `.agents/skills/bookshelf-frontend/` (SKILL.md + references).
- Витягнуто дизайн-систему з claude.ai/design у `docs/design-system/` (84 файли).
- Рішення: English UI, 8 хайлайтерів зі значеннями, багатша нотатка
  (excerpt + reflection + page), статуси `reading/finished/toread`.
- Оновлено `CLAUDE.md`, `docs/product-brief.md`, `docs/requirements.md`
  (модель + §5 capabilities/залежності/власність над вимогами).
- `DESIGN.md` — опис поточної дизайн-системи.
- План: задачі 1–8 під нову модель; UI-задачі 9–15 переписано під DS (вендоринг у Task 9).
- Додано правило вести `docs/current-state.md`.

## Наступний крок

Почати реалізацію за планом — **Task 1: Project scaffold + tooling**
(`docs/superpowers/plans/2026-06-27-bookshelf.md`): скафолд Next.js + Vitest.
Далі — задача за задачею через `superpowers:executing-plans` або
`superpowers:subagent-driven-development`.

## Відкриті питання / блокери

- **C10 (інтеграція DS):** зафіксовано рішення «вендорити» DS у застосунок
  (Task 9). Перевірити асоціацію label↔control у DS-інпутах при першому
  прогоні тестів форм (примітка в Task 13).
- Поза MVP (свідомо): рендер markdown/wiki-посилань *усередині* рефлексії
  нотатки, іконки Lucide, перемикач темної теми.

## Орієнтир по документах

- `CLAUDE.md` — контекст і правила.
- `docs/product-brief.md` · `docs/requirements.md` (вимоги + §5 capabilities).
- `DESIGN.md` — дизайн-система. · `docs/design-system/` — першоджерело UI.
- `docs/superpowers/plans/2026-06-27-bookshelf.md` — план (15 задач).
