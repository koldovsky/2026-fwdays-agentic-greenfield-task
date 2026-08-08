## Автор

Misha Sydoruk

## Проєкт

**MetalReleaseTracker** — публічний каталог реліз-новинок метал-музики. Це
**greenfield-перепис** старої event-driven системи (Kafka / MinIO / Autofac / два
Postgres / React SPA) у **.NET 10 модульний моноліт із Vertical Slice Architecture
всередині кожного модуля + фронтенд на Next.js (App Router, TypeScript)**.
**Phase 1 уже в продакшені**: каталог живе на **https://metal-release.com/Monolith**
з реальними мігрованими даними — **946 альбомів**, гурти, дистриб'ютори та обкладинки —
а стара версія на кореневому домені лишилась недоторканою.

## Відео-демо (1–2 хв)
<!-- буде оновлено посиланням -->
Video: _(додається)_

## Які практики Agentic Engineering застосовано

Проєкт зроблено **spec-driven** через **Project Factory + OpenSpec**, а не покроковим
ручним промптингом.

- **Контекст-інженерія.** Канонічні правила в `AGENTS.md` (+ тонкий шим `CLAUDE.md`) і
  `.claude/rules/*` (architecture / code-style / testing / frontend / parser) —
  **статичний** контекст; **динамічний** — per-slice OpenSpec change-папки на кожен
  зріз. Два вендорені скіли (`dotnet-vsa-webapi`, `dotnet-best-practices`) тримаються
  pristine, а всі проєктні відхилення (no Aspire, no OpenTelemetry, xUnit замість
  MSTest, .NET 10/C# 14) винесені в окремий override-шар із чіткою precedence.
- **Специфікації наперед (SDD).** Кожна capability має OpenSpec-спеку
  (`openspec/specs/`), яку ганяю через `openspec validate --all --strict`. Вимоги
  пронумеровані (FR/NFR/TC/BC), простежувані наскрізь: `@trace FR-…` у тестах і
  трейлери `Slice:` / `Refs:` у комітах, плюс скрипти `check-traceability` та
  `check-trajectory`.
- **Цикли (loop engineering).** Доставка йде **фазами (5)** і **зрізами**: на кожен
  зріз — цикл `спека → червоні тести → зелена реалізація → рев'ю → архів → деплой`, що
  запускається як петля, а не як серія ручних кроків. Зрізи Phase 1: `operations`,
  `catalog`, `storage`, `data-migration`, `frontend(public)`.
- **maker ≠ checker.** Реалізацію робить один агент, а **окремі рев'ю-агенти**
  (`code-reviewer`, `security-reviewer`, `spec-compliance-auditor`) перевіряють дифф
  кожного зрізу — автор ніколи не оцінює сам себе. На форку ще й **CodeRabbit** як
  другий незалежний рев'ювер.
- **Верифікація замість «наче працює».** xUnit + **Testcontainers** (реальний Postgres)
  для інтеграційних тестів, **Playwright** E2E на desktop і mobile (375×812, без
  горизонтального оверфлоу), StyleCop-as-error, і **повний локальний Docker-білд перед
  кожним пушем**. Продакшн-катовер — окремий gated-пайплайн (FR-106), а не автоматичний
  деплой.
- **Інструменти / MCP.** Claude Code; Project Factory + OpenSpec; **Playwright MCP** для
  візуальної перевірки UI; **context7 MCP** для актуальної документації бібліотек;
  GitHub Actions CI/CD (авто-стейджинг на кожен зелений пуш + свідомий продакшн-катовер).
- **Що вирішував я, а що агент.** Я задавав рамки: архітектуру (модульний моноліт + VSA,
  14 ADR, межі модулів, «без Aspire/OTel»), 5-фазний план, і рішення про go-live та
  продакшн-катовер. Агент писав спеки, червоні тести й реалізації по зрізах, ганяв
  рев'ю-проходи, вів катовер-пайплайн, **сам читав логи CI, діагностував і фіксив**
  (напр. баг зі шляхом `/storage` для обкладинок, int-ordinal enum у легасі-міграції,
  exit 139 через передчасний stop Kestrel) — усе під моїм наглядом і за гейтами.

**Результат доведено до кінця:** публічний каталог реально живе в проді
(`/Monolith/albums` → 200, API `totalCount` = 946, обкладинки → 200 `image/webp`), а не
«згенерував і кинув».

## (Опційно) Посилання на код

- **PR з усім кодом (greenfield → main):** https://github.com/msydoruk/MetalReleaseTracker/pull/27
- **Репозиторій:** https://github.com/msydoruk/MetalReleaseTracker (гілка `greenfield/monolith`)
- **Живий продакшн:** https://metal-release.com/Monolith/albums
- **Артефакт процесу (агенти, скіли, gate-stack):** https://claude.ai/code/artifact/8b7046e7-e6bb-4a23-8802-87a3bd2d1984

---

### Чекліст
- [x] Вказано справжнє імʼя
- [ ] Додано посилання на відео-демо (1–2 хв) — _додається_
- [x] Описано застосовані практики Agentic Engineering
- [x] Результат робочий і доведений до кінця
