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

---

# Deploy to Vercel

Vouch is a single Next.js app (App Router). Tailoring runs inline in route
handlers, so there is no separate worker or queue to deploy. You need three
things: a Vercel project, a managed Postgres database, and an Anthropic API key.

## 1. Prerequisites

- Vercel account with this repo imported (the framework preset auto-detects Next.js).
- Managed Postgres with TLS: Neon, Vercel Postgres, or Supabase. Get a connection
  string that ends in `?sslmode=require`.
- Anthropic API key (Claude powers generation, grounding, and the coverage judge).

## 2. Environment variables

Set these in Vercel under Project Settings, Environment Variables (add to
Production and Preview). Generate every secret with `openssl rand -base64 32`.

### Required

| Variable | Purpose | Notes |
|---|---|---|
| `DATABASE_URL` | Postgres connection | Include `?sslmode=require`. Managed Postgres negotiates TLS against the public CA, no extra config. |
| `CV_ENCRYPTION_KEY` | AES-256-GCM key for CV-at-rest (NFR-SEC-01) | 32-byte random, hex or base64 (`openssl rand -base64 32`). Rotating it makes existing encrypted CVs unreadable. |
| `AUTH_SECRET` | Auth.js (next-auth v5) JWT signing | 32+ byte random (`openssl rand -base64 32`, or `npx auth secret`). |
| `ANTHROPIC_API_KEY` | Claude API | Without it, tailoring cannot generate and the coverage judge fails soft to OFF. |

### Optional / environment-specific

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://vouch.app` | Canonical origin for SEO metadata. Inlined at BUILD time, so set it before the build you promote, then redeploy. Use your Vercel domain. |
| `COVERAGE_JUDGE` | on (key-gated) | LLM coverage judge. Defaults ON when `ANTHROPIC_API_KEY` is set; set to `off` to skip the extra LLM call per tailoring (NFR-COST-01). |
| `MAINTENANCE_SECRET` | unset | Bearer token for the cleanup endpoint (step 6). The route returns 503 until this is set. |
| `LLM_PROVIDER` / `LLM_MODEL` | `claude` / adapter default | Provider and model overrides. |
| `DATABASE_SSL` | from URL | Explicit SSL toggle if you are not using `?sslmode=require`. |
| `SENTRY_AUTH_TOKEN` | unset | CI-only. Uploads source maps at build time; the build works without it. |

Do NOT set `PAYMENTS_PROVIDER` in production: the payments emulator is
hard-disabled in prod by design, and no real merchant-of-record adapter is wired
yet, so checkout and upgrade stay off until one exists.

## 3. Provision the database

Create the Postgres instance and copy its `DATABASE_URL` (with `?sslmode=require`)
into the Vercel environment variables.

## 4. Run migrations (manual, before first use)

Deploy has no automatic migration step. Run the forward-only, idempotent runner
against the target database once, and again after any new migration lands:

```bash
DATABASE_URL="postgres://user:pass@host/db?sslmode=require" yarn db:migrate
```

Run it locally or from CI. It records applied files in `schema_migrations`, so
re-runs are safe.

## 5. Deploy

Push to the connected branch, or run `vercel --prod`. Vercel uses `next build`
and `yarn install` by default (Node 20). The CV parsers and exporters
(`pdf-parse`, `mammoth`, `@react-pdf/renderer`, `docx`) and the Cyrillic PT Sans
fonts are already handled in `next.config.ts` (`serverExternalPackages` +
`outputFileTracingIncludes`), so they ship with the serverless functions with no
extra config.

After the first deploy, set `NEXT_PUBLIC_SITE_URL` to the assigned domain and
redeploy, so the build inlines the correct origin.

## 6. Optional: schedule abandoned-tailoring cleanup

`POST /api/maintenance/tailoring-cleanup` sweeps abandoned `pending` tailorings
(freeing free-tier slots). It is auth-gated with `Authorization: Bearer
$MAINTENANCE_SECRET` and returns 503 until `MAINTENANCE_SECRET` is set. Schedule
it about every 30 minutes with any external scheduler that can POST the header:

```bash
curl -X POST https://<your-domain>/api/maintenance/tailoring-cleanup \
  -H "Authorization: Bearer $MAINTENANCE_SECRET"
```

Native Vercel Cron sends a GET, so it would need a GET variant of the route; an
external scheduler or a GitHub Actions cron running the POST above is the
simplest path today.

## Verify

- The landing page loads at your domain.
- Sign up, upload a CV, paste a job description, run a tailoring: the grounded
  checklist renders (confirms the database, `ANTHROPIC_API_KEY`, and
  `CV_ENCRYPTION_KEY` are all wired).
- On the account page, "Download my data" returns a JSON file (confirms the
  decryption path and the GDPR export).
