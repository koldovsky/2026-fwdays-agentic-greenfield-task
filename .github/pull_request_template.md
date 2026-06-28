<!-- Домашнє завдання — Agentic Engineering: Greenfield.
     Заповни всі розділи. Стек — будь-який. -->

## Автор
<!-- Твоє справжнє імʼя -->
Dmytro Tarasenko

## Проєкт
`omnictx` — Go-бінарник, що виводить сегмент промпту з активною хмарою (Azure / AWS / GCP) та поточним kube-контекстом. Читає локальні конфіги напряму, без мережі і без виклику `kubectl`/`az`/`aws`/`gcloud` 
## Відео-демо (1–2 хв)
<!-- Обовʼязково: посилання на YouTube / Loom / Google Drive з демонстрацією -->
Video:


## Які практики Agentic Engineering застосовано

**Контекст-інженерія**
- `AGENTS.md` — єдине джерело правил (команди, структура, інваріанти, конвенції); `CLAUDE.md` — тонкий імпорт через `@AGENTS.md`.
- `PRD.md` — живий spec: статус, функціональні вимоги, архітектура, план верифікації (§8), порядок реалізації (§10), критерії готовності (§8.3).
- Статичний контекст = `AGENTS.md` + `PRD.md`; динамічний = конкретні файли та фікстури, що читалися під кожне завдання.

**Loop engineering (§10 PRD)**
Агент працював за автономним циклом `implement → make test → fix → repeat → make lint` без покрокового промптингу:
1. Provider-interface рефактор → Azure через нього → тести зелені
2. `internal/ini` + тести
3. AWS-провайдер + фікстури + тести
4. GCP-провайдер + фікстури + тести
5. Active-cloud selection (`auto`/`none`/pin) + config/env/flag
6. Render через слот `cloud` + golden-тести
7. Документація

Після кожного кроку: `go test ./... -race -count=1` + `golangci-lint run`.

**Maker ≠ Checker (§11 PRD)**
Незалежна перевірка запуском, а не читанням: `go test -race`, grep на залишки `ctxline`, перевірка `auto`-пріоритету, деградація при broken-конфігах, exit 0 при будь-якій помилці.

**Верифікація**
- Table-driven тести на кожен пакет (`internal/ini`, `internal/aws`, `internal/gcp`, `internal/cloud`, `internal/config`, `internal/render`, `internal/shellinit`, `internal/kube`, `internal/azure`)
- Golden-файли для рендеру (shell × icons × provider)
- `bash -c` eval smoke-тест для `init`-сніпета (idempotency)
- `--help` тест із переліком обов'язкових рядків
- Render benchmark
- CI: `go vet` → `golangci-lint` → `go test -race` → build matrix `linux/amd64,arm64`

**SDD (Spec-Driven Development)**
`PRD.md` написано до коду мульти-хмари; spec → тести (§8.2) → реалізація. Критерії готовності (§8.3) слугували чеклістом для фінальної верифікації.

**Що вирішував агент, що — я**
- Я: початкове планування проєкту; написання `PRD.md` до початку реалізації (SDD), робилось за допомогою Opus 4.8, в окремій сессії; вибір per-provider Nerd Font іконок замість генерик `☁`; фіча `omnioff -G` (глобальний on/off через конфіг); уточнення UX (`--cloud` — one-shot, не сесійний); відкат зайвих фіч (`omnicloud`)
- Агент: реалізація всіх пакетів, рефакторинг (`setConfigKey`), тести, golden-файли, виправлення помилок у процесі
**Інструменти**
- Claude Code (terminal) — maker
- `golangci-lint`, `go test -race`, `go vet` — автоматична верифікація
- GitHub Actions CI — незалежний runner
- CodeRabbit — review на PR


## (Опційно) Посилання на код
<!-- Якщо проєкт живе в окремому репозиторії — встав посилання -->


---

### Чекліст
- [ ] Вказано справжнє імʼя
- [ ] Додано посилання на відео-демо (1–2 хв)
- [ ] Описано застосовані практики Agentic Engineering
- [ ] Результат робочий і доведений до кінця
