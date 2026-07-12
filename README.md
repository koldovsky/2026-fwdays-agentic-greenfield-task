<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/readme-banner.png">
  <img src="docs/assets/readme-banner.png" alt="Invoice Maker 2026 — Agentic Engineering Greenfield" width="100%" />
</picture>

<br />

**Двомовні інвойси для міжнародних розрахунків · NACE 2.1-UA · USD/EUR**

<br />

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![OpenSpec](https://img.shields.io/badge/OpenSpec-SDD-22d3ee?style=for-the-badge&logo=openapi-initiative&logoColor=black)](openspec/config.yaml)
[![WEG3D Fin](https://img.shields.io/badge/Design-WEG3D_Fin-ef4136?style=for-the-badge)](Design.md)

<br />

| | | |
| :---: | :---: | :---: |
| **40+** | **6** | **G4** |
| нумерованих вимог | capabilities | активний gate |
| `FR` · `NFR` · `TC` · `BC` | vertical slices | slice cycle |

<br />

[Документація UA](docs/README-uk.md) · [Вимоги](docs/requirements.md) · [Архітектура](docs/ARCHITECTURE.md) · [Методологія](https://koldovsky.github.io/2026-fwdays-agentic-greenfield-slidev/)

</div>

<br />

### `// SLICE · G4` · Один слайс: від спеки до зеленого

<table>
<tr>
<td><img src="https://img.shields.io/badge/7-нарізка-1d4ed8?style=flat-square" alt="7" /></td>
<td>Розбий MVP на <strong>capabilities</strong>, познач залежності, один власник на вимогу.</td>
</tr>
<tr>
<td><img src="https://img.shields.io/badge/8-спека_+_код-1d4ed8?style=flat-square" alt="8" /></td>
<td>Візьми <strong>одну</strong> здатність (<code>nace-catalog</code> + <code>invoice-calc</code> + <code>template-render</code>): спека → <code>src/lib/</code>.</td>
</tr>
<tr>
<td><img src="https://img.shields.io/badge/9-тести_+_verify-1d4ed8?style=flat-square" alt="9" /></td>
<td>Падаючий тест → зелений, потім повний прогін перевірки.</td>
</tr>
</table>

```bash
# change: invoice-slice-1
# proposal · spec (FR-NACE, FR-CALC, FR-TPL) · tasks

> write failing test -> implement -> green
> npm run lint && npm run typecheck && npm run build
> openspec validate --strict

✓ slice ready · maker ≠ checker
```

> **Generation is solved.** Verification, judgment, and direction are the engineering craft.  
> У цьому репозиторії код — наслідок **специфікацій**, **тестів** і **детермінованих гейтів**, а не навпаки.

**Invoice Maker 2026** — веб-додаток для швидкого створення **двомовних (українська + англійська) інвойсів** для українських ФОПів і фрілансерів, які виставляють рахунки іноземним клієнтам у **USD** або **EUR**.

Розробка ведеться за підходом **Agentic Engineering** і **Spec-Driven Development**: спочатку — перевірювані вимоги та специфікації, потім — вертикальні зрізи з детермінованими гейтами якості. Поточний фокус — перший vertical slice: від структурованого вводу до HTML-превʼю інвойсу.

---

## Зміст

**Огляд**

- [Що це за продукт](#що-це-за-продукт)
- [Для кого](#для-кого)
- [Поточний стан](#поточний-стан)

**Інженерія**

- [Процес розробки](#процес-розробки-agentic-engineering)
- [Архітектура](#архітектура)
- [MVP: перший vertical slice](#mvp-перший-вертикальний-слайс)

**Довідник**

- [Доменна модель](#доменна-модель)
- [Технологічний стек](#технологічний-стек)
- [Інструменти та процеси](#інструменти-та-процеси)
- [Швидкий старт](#швидкий-старт)
- [Верифікація](#верифікація)

<details>
<summary><strong>Розгорнути повний зміст (структура репо, документація, roadmap)</strong></summary>

- [Структура репозиторію](#структура-репозиторію)
- [Документація](#документація)
- [Дорожня карта](#дорожня-карта)

</details>

---

## Що це за продукт

Invoice Maker автоматизує рутину міжнародного виставлення рахунків:

1. Користувач заповнює **форму** (клієнт, послуга, сума, валюта, терміни).
2. Система підбирає **опис послуги за кодом NACE 2.1-UA** (не застарілий KVED).
3. Розраховує номер, дати, ціну за одиницю, передоплату, залишок.
4. Підставляє **банківські реквізити** (USD/EUR IBAN) з профілю постачальника.
5. Генерує **двомовний HTML-документ** з шаблону `docs/invoice-template.html`.
6. Користувач **переглядає, завантажує PDF/HTML** і сам надсилає клієнту (Telegram, WhatsApp, email).

```mermaid
flowchart LR
  subgraph input [Ввід]
    FORM[Форма інвойсу]
    DIR_S[Довідник постачальників]
    DIR_C[Довідник клієнтів]
  end

  subgraph engine [Доменний рушій]
    NACE[NACE 2.1-UA каталог]
    CALC[Розрахунки]
    TPL[Шаблон HTML]
  end

  subgraph output [Результат]
    PREV[Превʼю в браузері]
    PDF[PDF / HTML файл]
    SHARE[Користувач ділиться файлом]
  end

  FORM --> NACE
  FORM --> CALC
  DIR_S --> FORM
  DIR_C --> FORM
  NACE --> TPL
  CALC --> TPL
  TPL --> PREV
  PREV --> PDF
  PDF --> SHARE
```

### Ключові принципи продукту

| Принцип | Опис |
| --- | --- |
| **Шаблон — контракт** | Блок TERMS AND CONDITIONS і підпис незмінні (`BC-LEGAL-01`) |
| **NACE, не KVED** | Класифікатор NACE 2.1-UA (наказ Держстату № 191, 2025) |
| **Двомовність документа** | Кожен рядок послуги, дата, термін — EN + UA |
| **Знімок документа** | Виданий інвойс зберігає все, що надруковано; зміна IBAN не переписує старі рахунки |
| **Чесні помилки** | Невалідний ввід → пояснення + приклад правильного формату |
| **Без юридичних порад** | Система генерує документ; відповідальність за комплаєнс — на користувачі |

---

## Для кого

**Основний користувач:** український ФОП / фрілансер у сфері креативних послуг:

- графічний і візуальний дизайн (NACE **74.12**)
- спеціалізований дизайн / 3D-візуалізація (**74.14**)
- постпродакшн відео (**59.12**)

**Типовий сценарій:** виставити рахунок іноземному замовнику в USD або EUR за 2–3 хвилини замість ручного заповнення Word/HTML-шаблону.

---

## Поточний стан

| Область | Статус | Деталі |
| --- | --- | --- |
| **Foundation** | ✅ Готово | Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui |
| **Design system** | ✅ Готово | WEG3D Fin (`Design.md`, `src/styles/design-tokens.css`) |
| **App shell (S0)** | ✅ Shipped | Landing, dashboard, responsive nav 375/768 px, MobileNav (PR #3) |
| **Health API** | ✅ Shipped | `GET /api/health` → `{ status: "ok", service: "invoice-maker" }` (`FR-SHELL-03`) |
| **Domain core (S1)** | ✅ Shipped | `src/lib/nace/` + `src/lib/invoice-calc/` — 104 Vitest tests |
| **Специфікації** | ✅ Готово | `docs/requirements.md`, `docs/product-brief.md`, `CONTEXT.md`, OpenSpec |
| **OpenSpec** | 🔄 В процесі | S0+S1 shipped; S2 directories наступні |
| **Довідники (S2)** | 📋 Наступний крок | `supplier-profile` + `client-directory` |
| **Генерація інвойсу** | 📋 Заплановано | M4: form → live HTML preview (S4) |
| **Chat / LLM ввід** | ⏳ Post-MVP | `FR-CHAT-*` перенесено в Future |
| **Supabase / Auth** | ⏳ Post-MVP | Enterprise-архітектура в `docs/ARCHITECTURE.md` — фаза 2+ |

---

## Процес розробки (Agentic Engineering)

Проєкт використовує **Agentic Engineering** — оркестрацію AI-агентів навколо перевірюваних специфікацій замість нетвореної генерації коду. Методологічні орієнтири: [Agentic Engineering — Greenfield](https://koldovsky.github.io/2026-fwdays-agentic-greenfield-slidev/) (Вʼячеслав Колдовський).

### Product pipeline

<table>
<tr>
<td align="center" width="30%"><sub>01 · INPUT</sub><br /><strong>Форма + довідники</strong><br /><sub>клієнт · послуга · валюта</sub></td>
<td align="center" width="5%">→</td>
<td align="center" width="30%"><sub>02 · ENGINE</sub><br /><strong>NACE + calc + template</strong><br /><sub>детермінований lib/</sub></td>
<td align="center" width="5%">→</td>
<td align="center" width="30%"><sub>03 · OUTPUT</sub><br /><strong>HTML / PDF</strong><br /><sub>bilingual · A4 · share</sub></td>
</tr>
</table>

### Engineering pipeline

<table>
<tr>
<td align="center" width="18%"><sub>SPEC</sub><br /><strong>requirements.md</strong><br /><sub>+ OpenSpec</sub></td>
<td align="center" width="4%">→</td>
<td align="center" width="18%"><sub>RED</sub><br /><strong>test-first</strong><br /><sub>Vitest</sub></td>
<td align="center" width="4%">→</td>
<td align="center" width="18%"><sub>GREEN</sub><br /><strong>lib/ impl</strong><br /><sub>minimal diff</sub></td>
<td align="center" width="4%">→</td>
<td align="center" width="18%"><sub>GATES</sub><br /><strong>typecheck · lint</strong><br /><sub>build</sub></td>
<td align="center" width="4%">→</td>
<td align="center" width="18%"><sub>REVIEW</sub><br /><strong>maker ≠ checker</strong><br /><sub>archive</sub></td>
</tr>
</table>

### Етапи інженерного процесу

| Етап | Зміст | Статус у проєкті |
| --- | --- | --- |
| **Foundation** | Greenfield-репозиторій, Next.js, agent rules | ✅ |
| **Контекст** | Вимоги, дизайн-система, OpenSpec | ✅ |
| **Vertical slice** | spec → test → impl → gates → review | 🎯 поточний |
| **Автоматизація** | Hooks, CI, traceability matrix | заплановано |
| **QA & release** | E2E, UAT, демо-сценарії | заплановано |

### Vertical slice (G4)

Центральний елемент процесу — **Slice Cycle (G4)**: перехід від специфікації до верифікованого «зеленого» стану.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#0d1528', 'primaryTextColor': '#e2e8f0', 'primaryBorderColor': '#22d3ee', 'lineColor': '#64748b', 'secondaryColor': '#111b37', 'tertiaryColor': '#172554'}}}%%
flowchart TD
  SPEC[OpenSpec: capability spec] --> RED[Test-first: червоний тест зі спеки]
  RED --> IMPL[Імплементація lib/ модуля]
  IMPL --> GREEN[Тест зелений]
  GREEN --> GATES[Гейти: typecheck · lint · build]
  GATES --> REVIEW[Review-gate: maker ≠ checker]
  REVIEW --> ARCHIVE[/opsx:sync + /opsx:archive/]

  style SPEC fill:#111b37,stroke:#22d3ee,color:#e2e8f0
  style GREEN fill:#052e16,stroke:#22c55e,color:#dcfce7
  style RED fill:#450a0a,stroke:#ef4136,color:#fee2e2
  style GATES fill:#172554,stroke:#38bdf8,color:#e0f2fe
```

**Правило maker ≠ checker:** той, хто імплементує слайс, **не ревʼюить** власну роботу. Тести пишуться **до** коду, зі специфікації.

### Три вкладені цикли

```mermaid
flowchart TB
  subgraph project [PROJECT · на продукт]
    P1[PRD + requirements.md]
    P2[Capability map]
    P3[Roadmap MVP → Future]
  end

  subgraph slice [SLICE · на здатність]
    S1[spec → tests red]
    S2[impl green]
    S3[gates → review → archive]
  end

  subgraph edit [EDIT · на правку]
    E1[lint / typecheck hooks]
    E2[commit verification]
  end

  project --> slice
  slice --> edit
```

<details>
<summary><strong>Гейти G0–G8 (детерміновані команди з кодом виходу)</strong></summary>

<br />

| Гейт | Призначення | Наш проєкт |
| --- | --- | --- |
| **G0** | Ініціалізація циклу (loop first) | `AGENTS.md`, OpenSpec, git hooks (планується) |
| **G1** | Нумеровані вимоги, scope підписаний | `docs/requirements.md` (FR/NFR/TC/BC) |
| **G2** | OpenSpec: capability specs | `openspec/specs/<capability>/spec.md` |
| **G3** | План зміни + людський чекпойнт | `openspec/changes/<name>/` |
| **G4** | **Slice cycle: spec → red → green → gates** | **Перший слайс: nace + calc + template** |
| **G5** | Traceability: FR → spec → test → proof | Матриця в `docs/requirements.md` |
| **G6** | QA verify (Playwright, візуальні перевірки) | Планується для release |
| **G7** | Adversarial review | Окремий checker-агент |
| **G8** | UAT triage + регресійні тести | Приймальне тестування |

</details>

<details>
<summary><strong>Ланцюг трасування та OpenSpec workflow</strong></summary>

<br />

### Ланцюг трасування (FR → коміт)

```mermaid
flowchart LR
  FR["FR-CALC-01<br/>docs/requirements.md"]
  SPEC["OpenSpec spec<br/>openspec/specs/"]
  TEST["Vitest unit test<br/>lib/"]
  CODE["Implementation<br/>src/lib/"]
  PROOF["Proof + commit"]

  FR --> SPEC
  SPEC --> TEST
  TEST --> CODE
  CODE --> PROOF
  PROOF -.->|check:trace| FR
```

### OpenSpec workflow (Spec-Driven Development)

```mermaid
flowchart LR
  PROPOSE["/opsx:propose"] --> EXPLORE["/opsx:explore"]
  EXPLORE --> APPLY["/opsx:apply"]
  APPLY --> SYNC["/opsx:sync"]
  SYNC --> ARCHIVE["/opsx:archive"]

  PROPOSE -.- P1[proposal.md]
  PROPOSE -.- P2[design.md]
  PROPOSE -.- P3[tasks.md]
  PROPOSE -.- P4[delta specs]
  SYNC -.- S1[openspec/specs/]
```

| Команда | Дія |
| --- | --- |
| `/opsx:propose <change>` | Створити change: proposal, design, tasks, delta specs |
| `/opsx:explore` | Дослідити ідеї без імплементації |
| `/opsx:apply` | Виконати tasks з активного change |
| `/opsx:sync` | Злити delta specs у `openspec/specs/` |
| `/opsx:archive` | Архівувати завершений change |

</details>

---

## Архітектура

### MVP (поточна ціль)

MVP — **детермінований генератор у браузері**: форма + live preview, дані в `localStorage`, експорт PDF/HTML. Без серверної БД, без публічних посилань на інвойси.

```mermaid
flowchart TB
  subgraph browser [Browser]
    UI[React Client Components<br/>форма + превʼю]
    LS[(localStorage<br/>постачальники · клієнти · інвойси)]
    LIB[lib/<br/>nace · calc · template]
  end

  subgraph static [Static assets]
    TPL[docs/invoice-template.html]
    NACE_PDF[docs/191_2025.pdf]
  end

  UI --> LIB
  UI --> LS
  LIB --> TPL
  LIB --> NACE_PDF
```

<details>
<summary><strong>Enterprise-архітектура (post-MVP)</strong></summary>

<br />

Повна архітектура з multi-tenancy, Supabase, Server Actions — задокументована в [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

```mermaid
flowchart TB
  subgraph client [Browser]
    UI[React Client Components]
  end

  subgraph next [Next.js App Router]
    RSC[Server Components]
    SA[Server Actions]
    RH[Route Handlers]
  end

  subgraph domain [Domain Layer]
    INV[Invoice]
    CLI[Client]
    ORG[Organization]
  end

  subgraph infra [Infrastructure]
    DB[(Postgres / Supabase)]
    PDF[PDF Service]
    MAIL[Email Provider]
  end

  UI --> RSC
  UI --> SA
  RSC --> domain
  SA --> domain
  domain --> DB
  domain --> PDF
  domain --> MAIL
```

</details>

---

## Доменна модель

Словник домену: [`CONTEXT.md`](CONTEXT.md)

| Сутність | Опис |
| --- | --- |
| **Organization** | Tenant-акаунт (post-MVP) |
| **Client** | Замовник, якому виставляється рахунок |
| **Invoice** | Документ з line items, сумами, статусом |
| **LineItem** | Рядок послуги (опис, кількість, ціна, податок) |
| **Payment** | Оплата (post-MVP) |

### Статуси інвойсу (MVP)

```mermaid
stateDiagram-v2
  [*] --> draft: створення
  draft --> sent: користувач позначає «надіслано»
  sent --> paid: користувач позначає «оплачено»
  sent --> cancelled: скасування
  paid --> [*]
  cancelled --> [*]

  note right of sent
    overdue — похідний статус:
    sent + дедлайн минув
    (не зберігається в БД)
  end note
```

---

## MVP: перший вертикальний слайс

Рекомендований **перший vertical slice** (`docs/requirements.md`):

> `nace-catalog` + `invoice-calc` + `template-render` → один зелений шлях від структурованого вводу до HTML-превʼю **без чату**.

```mermaid
sequenceDiagram
  actor User as Користувач
  participant Form as Форма
  participant NACE as lib/nace
  participant Calc as lib/calc
  participant Tpl as lib/template
  participant Preview as Превʼю

  User->>Form: Заповнює клієнта, послугу, суму, валюту
  Form->>NACE: Ключові слова послуги
  NACE-->>Form: NACE 74.12 + bilingual text
  Form->>Calc: qty, amount, prepay%, dates
  Calc-->>Form: номер YYYY-NNN, unit×qty, deadlines
  Form->>Tpl: Змінні {{VARIABLE}}
  Tpl-->>Preview: Self-contained HTML (A4)
  User->>Preview: Перегляд / завантаження
```

### Capabilities (зрізи продукту)

| Capability | Requirement IDs | Gate |
| --- | --- | --- |
| `shell` | FR-SHELL-01..03 | ✅ shipped (S0) |
| `nace-catalog` | FR-NACE-01..05, BC-NACE-01 | ✅ shipped (S1) |
| `invoice-calc` | FR-CALC-01..06 | ✅ shipped (S1) |
| `document-render` | FR-TPL-01..05, BC-LEGAL-01 | S3 |
| `export-share` | FR-EXPORT-01..05 | S4/S6 |
| `invoice-chat` | FR-CHAT-*, FR-INPUT-* | Future |

---

## Технологічний стек

### Реалізовано зараз

| Категорія | Технологія | Версія / примітка |
| --- | --- | --- |
| **Framework** | [Next.js](https://nextjs.org) App Router | 16.2.9 |
| **UI** | [React](https://react.dev) | 19.2.4 |
| **Мова** | [TypeScript](https://www.typescriptlang.org) | strict mode |
| **Стилі** | [Tailwind CSS](https://tailwindcss.com) | v4 |
| **Компоненти** | [shadcn/ui](https://ui.shadcn.com) + `@base-ui/react` | v4 |
| **Іконки** | [lucide-react](https://lucide.dev) | tree-shaken imports |
| **Шрифти** | Geist Sans + Geist Mono | `next/font/google` |
| **Design system** | WEG3D Fin | `Design.md` |
| **Compiler** | React Compiler | `babel-plugin-react-compiler` |
| **Lint** | ESLint + eslint-config-next | v9 |
| **Deploy** | [Vercel](https://vercel.com) | preview per PR (планується) |

### Заплановано (MVP / post-MVP)

| Категорія | Технологія | Коли |
| --- | --- | --- |
| **Валідація** | [Zod](https://zod.dev) | MVP — спільні схеми форма + lib |
| **Тести** | [Vitest](https://vitest.dev) | MVP — `lib/` (calc, NACE, template) |
| **E2E / QA** | Playwright | G6 — smoke та візуальні перевірки |
| **ORM** | [Drizzle](https://orm.drizzle.team) | Post-MVP |
| **Backend** | [Supabase](https://supabase.com) (Postgres + Auth) | Post-MVP |
| **PDF** | Browser print / `@react-pdf/renderer` | MVP: browser; post-MVP: server |

---

## Інструменти та процеси

### Agentic IDE та агенти

| Інструмент | Роль у проєкті |
| --- | --- |
| **Cursor** | Основний Agentic IDE; slash-команди `/opsx:*` |
| **Claude Code** | Альтернативний агент; skills у `.claude/` |
| **AGENTS.md** | Конституція проєкту: Next.js rules, design system, OpenSpec |
| **Agent Skills** | `openspec-*`, `vercel-react-best-practices` |
| **OpenSpec CLI** | `@fission-ai/openspec` — spec-driven workflow |

### Процеси якості

| Процес | Опис |
| --- | --- |
| **Spec-Driven Development (SDD)** | Специфікація → план → імплементація → верифікація |
| **OpenSpec** | Living specs у `openspec/specs/`, зміни через `openspec/changes/` |
| **Test-first (G4)** | Червоний тест зі спеки → імплементація → зелений |
| **Maker ≠ Checker** | Імплементер не ревʼюить власний слайс |
| **Нумеровані вимоги** | Стабільні ID: `FR-*`, `NFR-*`, `TC-*`, `BC-*` |
| **Traceability matrix** | FR → spec → test → proof → commit |
| **Verification gates** | `npm run typecheck && npm run lint && npm run build` |
| **ADR** | Architecture Decision Records у `docs/adr/` |

### Навички (skills), які застосовуємо

- **Domain modeling** — сутності Invoice, Client, NACE catalog
- **Frontend patterns** — RSC, Client Components лише для інтерактивності
- **React best practices** — Vercel engineering guide (`.agents/skills/`)
- **Security review** — IBAN/ПДВ не в client bundle (`NFR-SEC-01`)
- **TDD workflow** — test-first для `lib/` модулів

---

<details>
<summary><strong>Структура репозиторію</strong></summary>

<br />

```
.
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/        # Dashboard, invoices, clients, settings
│   │   ├── api/health/         # Health check (shipped)
│   │   └── page.tsx            # Landing
│   ├── components/
│   │   ├── ui/                 # shadcn primitives
│   │   ├── layout/             # Sidebar, shell
│   │   └── invoices/           # InvoiceStatusBadge, domain UI
│   ├── lib/                    # Domain logic (calc, nace, template — planned)
│   ├── actions/                # Server Actions scaffold (post-MVP)
│   ├── types/                  # Invoice, Client, LineItem
│   └── styles/design-tokens.css
├── docs/
│   ├── assets/                 # README banner, handoff assets
│   ├── requirements.md         # Source of truth — нумеровані вимоги
│   ├── product-brief.md        # Бізнес-наратив
│   ├── ARCHITECTURE.md         # Enterprise-архітектура (фаза 2+)
│   ├── research.md             # Оригінальні нотатки (UA)
│   ├── invoice-template.html   # HTML-шаблон інвойсу
│   └── adr/                    # Architecture Decision Records
├── openspec/
│   ├── config.yaml             # OpenSpec + project context
│   ├── specs/                  # Living capability specs
│   └── changes/                # In-flight changes
├── Design.md                   # WEG3D Fin design system
├── CONTEXT.md                  # Domain glossary
└── AGENTS.md                   # Agent rules (Cursor / Claude Code)
```

</details>

---

## Документація

| Документ | Призначення |
| --- | --- |
| [`docs/requirements.md`](docs/requirements.md) | **Єдине джерело правди** — FR/NFR/TC/BC з ID |
| [`docs/product-brief.md`](docs/product-brief.md) | Бізнес-контекст, MVP vs Future |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Шарова архітектура, фази імплементації |
| [`docs/research.md`](docs/research.md) | User research, формати вводу, тригери |
| [`docs/invoice-template.html`](docs/invoice-template.html) | Контракт верстки інвойсу |
| [`docs/191_2025.pdf`](docs/191_2025.pdf) | NACE 2.1-UA (наказ Держстату № 191) |
| [`Design.md`](Design.md) | WEG3D Fin — токени, типографіка, компоненти |
| [`CONTEXT.md`](CONTEXT.md) | Глосарій домену |
| [`openspec/config.yaml`](openspec/config.yaml) | Контекст для OpenSpec-агентів |
| [`docs/README-uk.md`](docs/README-uk.md) | Повна українська документація (дубль README) |

---

## Швидкий старт

### Вимоги

- Node.js 20+
- npm 10+

### Встановлення

```bash
git clone <repo-url>
cd "INVOICE MAKER 2026"
npm install
cp .env.example .env.local   # опційно для post-MVP
```

### Розробка

```bash
npm run dev
```

Відкрийте [http://localhost:3000](http://localhost:3000).

| Маршрут | Опис |
| --- | --- |
| `/` | Landing page |
| `/dashboard` | Dashboard shell |
| `/invoices` | Список інвойсів |
| `/invoices/new` | Створення інвойсу |
| `/clients` | Клієнти |
| `/settings` | Налаштування |
| `/api/health` | Health check |

---

## Верифікація

Перед кожним merge / gate G4:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run build       # typecheck + next build
```

Цільові NFR:

- `NFR-PERF-01` — build < 60 s
- `NFR-DX-01` — typecheck + lint + build проходять на main

---

## Дорожня карта

<details>
<summary><strong>Розгорнути Gantt roadmap та out-of-scope</strong></summary>

<br />

```mermaid
gantt
  title Invoice Maker 2026 — Roadmap
  dateFormat YYYY-MM-DD
  axisFormat %b

  section Foundation
    Next.js + shadcn + WEG3D Fin     :done, f1, 2026-06-01, 2026-07-01
    requirements.md + product-brief   :done, f2, 2026-06-15, 2026-07-05
    OpenSpec init                     :active, f3, 2026-07-01, 2026-07-15

  section Slice 1 (G4)
    nace-catalog                      :s1, 2026-07-08, 2026-07-20
    invoice-calc                      :s2, 2026-07-15, 2026-07-25
    template-render + preview         :s3, 2026-07-20, 2026-08-01

  section Slice 2
    export PDF/HTML                   :s4, 2026-08-01, 2026-08-10
    browser storage + directories     :s5, 2026-08-05, 2026-08-15
  section Release
    Demo scenario (BC-DEMO-01)          :demo, 2026-08-15, 2026-08-25

  section Post-MVP
    Supabase + Auth + RLS             :p1, 2026-09-01, 2026-10-01
    PDF server + email                :p2, 2026-10-01, 2026-11-01
    Chat / LLM input                  :p3, 2026-11-01, 2026-12-01
```

### Out of scope (MVP)

- Chat / LLM-ввід (`FR-CHAT-*`)
- Multi-tenant auth, Supabase, Drizzle
- Серверний PDF, email delivery
- Payment tracking, автоматичний lifecycle
- Повний каталог NACE (651 клас) — лише креативні послуги
- E-invoicing / інтеграція з податковою

</details>

---

## Ліцензія

All rights reserved.
