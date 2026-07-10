# Homework submission — Agentic Engineering: Greenfield

> Checklist and copy-paste assets for the PR to your fork of
> [koldovsky/2026-fwdays-agentic-greenfield-task](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task).

## Before you push

1. **Git safe directory** (if `git status` fails with "dubious ownership"):

   ```powershell
   git config --global --add safe.directory E:/Education/2026-fwdays-agentic-greenfield-task
   ```

2. **Verify locally:**

   ```bash
   npm run lint
   npm run test:run
   npm run build
   npx @fission-ai/openspec@latest validate --all --strict
   npm run check:trace
   ```

## Regenerate video

```bash
npm run dev                    # terminal 1
npm run qa:record-homework     # screen capture + voice + final mp4
# or, if .webm already exists:
npm run qa:mux-homework-voice  # voice + mux only
```

Requires: Playwright Chromium (`npx playwright install chromium`), ffmpeg, Python + `pip install edge-tts`.
Optional: `PYTHON=/path/to/python.exe` if auto-detect fails.

Output: `docs/homework-demo/homework-demo-final.mp4`

3. **Branch and push:**

   ```bash
   git checkout -b homework/weather-explorer
   git add .
   git commit -m "feat: Weather Explorer MVP + Memory Bank + homework artifacts"
   git remote add origin https://github.com/arabuga/2026-fwdays-agentic-greenfield-task.git
   git push -u origin homework/weather-explorer
   ```

4. **Enable CodeRabbit** on your fork (free for public repos).

5. **Open PR** to `main` — the template in `.github/pull_request_template.md` pre-fills sections.

---

## Fill in (manual)

| Field | Your value |
|-------|------------|
| **Author name** | Vitalii Yurkov |
| **Video URL** | https://github.com/arabuga/2026-fwdays-agentic-greenfield-task/blob/homework/submission/docs/homework-demo/homework-demo-final.mp4 |
| **Fork URL** | https://github.com/arabuga/2026-fwdays-agentic-greenfield-task |

---

## PR description (copy-paste draft)

Replace placeholders, then paste into the PR body.

```markdown
## Автор

Vitalii Yurkov

## Проєкт

**Weather Explorer** — україномовний веб-застосунок для планування вихідних за погодою.
Стек: Next.js 16, React 19, TypeScript, Tailwind 4, Open-Meteo, Leaflet/OSM.
Допомагає обрати місто, побачити 7-денний прогноз, comfort score на вихідні,
порівняти до 3 міст на карті — без акаунтів, cookies і платних API.

## Відео-демо (1–2 хв)

Video: <посилання>

## Які практики Agentic Engineering застосовано

### Контекст-інженерія
- `AGENTS.md` — канонічні правила для всіх агентів (стек, коректність, валідація).
- **Статичний контекст:** правила `.cursor/rules/` (project-factory, memory-bank, docs-maintenance).
- **Динамічний контекст:** skills (`project-factory`, `vercel-react-best-practices`), OpenSpec specs,
  Memory Bank (`docs/memory/`) — підвантажуються за потреби, не на кожен хід.
- `docs/current-state.md` + Memory Bank — handoff між сесіями.

### Цикли (loop engineering)
- **Project Factory** — детермінований цикл: propose → test-first → implement → review gate → archive.
- 9 capability slices (`add-shell` … `add-weekend-compare`) з OpenSpec контрактами.
- `scripts/check-*` + git hooks + CI — автоматичні гейти замість ручного «перевір ще раз».

### Maker ≠ checker
- Окремі суб-агенти: `code-reviewer`, `spec-compliance-auditor`, `security-reviewer`, `eval-judge`.
- Review findings збережені в `openspec/changes/archive/*/review-findings.json`.
- Trajectory check (`check-trajectory.mjs`) — свіжий суддя, не той самий агент що писав код.

### Верифікація
- **50 unit-тестів** Vitest з `@trace FR-*` на кожен requirement.
- **OpenSpec** `validate --strict` — контракти не розходяться з кодом.
- **QA proof pack:** traceability matrix, manual test plan, 9 Playwright demo clips.
- **Output evals** (`evals/cases/`) — якість rationale (наприклад, «приємно» під дощем).
- `npm run check:trace`, `check:recordings`, `check:trajectory`.

### SDD (специфікації наперед)
- `docs/requirements.md` (32 FR) → baseline `openspec/specs/` → slice deltas → archive.
- Тести писались зі сценаріїв spec **спочатку** (red → green).

### Інструменти
- **Cursor** + Agent mode, суб-агенти, MCP (browser для smoke, Context7 для Next.js 16 docs).
- **Playwright** — demo recordings як артефакт, не замість тестів.

### Що робив я, що — агент
- **Я:** вибір продукту (weather/weekend planner), затвердження scope, фінальний sign-off, відео.
- **Агент:** scaffold, імплементація слайсів за spec, тести, review passes, QA pack, Memory Bank.

## (Опційно) Посилання на код

Увесь код у цьому форку; окремий репозиторій не потрібен.
```

---

## Video script (~90 seconds, Ukrainian)

Record screen + voice (Loom / OBS / Win+G). Show the app at `npm run dev`.

| Time | Show | Say (приклад) |
|------|------|----------------|
| 0:00 | Empty hero, search | «Це Weather Explorer — допомагає вирішити, чи варто їхати на вихідні за погодою.» |
| 0:15 | Search «Київ», select | «Місто шукається через Open-Meteo, без акаунтів.» |
| 0:30 | Forecast + comfort badges | «Сім днів прогнозу і comfort score — зелений вихідні означає «можна їхати».» |
| 0:45 | Map click or marker | «На карті можна клікнути й змінити локацію.» |
| 0:55 | Weekend compare (pin 2 cities) | «Порівняння до трьох міст на суботу й неділю.» |
| 1:05 | Quick scroll: animated bg, footer joke | «Фон відображає погоду; жарти в футері — детерміновані, без мережі.» |
| 1:15 | IDE: `AGENTS.md`, `docs/memory/`, OpenSpec folder | «Будував агентно: Project Factory, 9 слайсів, тести з spec, maker≠checker review.» |
| 1:25 | Terminal: `npm run test:run` green | «50 тестів і OpenSpec validate — верифікація, не вайбкод.» |

Upload to YouTube (unlisted) or Loom; paste URL in PR.

---

## Grading checklist (from course README)

- [ ] Справжнє імʼя в PR
- [ ] Відео 1–2 хв з демо **і** розповіддю про агентний процес
- [ ] Змістовний опис практик (не загальні слова)
- [ ] Робочий результат до кінця
- [ ] **Бонус:** AGENTS.md, specs, тести/evals, review evidence, demo recordings, Memory Bank

---

## After PR

1. Read CodeRabbit feedback; fix clear issues; push again.
2. Send **PR link** in the course channel as your submission.
