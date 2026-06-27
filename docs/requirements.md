# PRD — Kolo360

Last updated: 2026-06-27

This document is the **single source of truth** for what the product does and
what constraints govern it. Every requirement has a stable ID. Specs, tests,
PRs, AI evals, and demo recordings reference these IDs to keep traceability
intact.

- Narrative context: [docs/product-brief.md](product-brief.md).
- Visual source of truth: [docs/KoloDesign/uploads/kolo360-design-brief.md](KoloDesign/uploads/kolo360-design-brief.md)
  and the design system under [docs/KoloDesign/](KoloDesign/).

Scope here is the **MVP thin slice**: one HR manager, seeded read-only
templates, one respondent per cycle, web form **or** server-side AI interview,
and an AI summary. Full 360° multi-reviewer, Telegram delivery, template editor,
and the editorial approval gate are explicitly **out of scope** (see end).

## ID conventions

| Prefix   | Meaning                    | Example                                          |
| -------- | -------------------------- | ------------------------------------------------ |
| `FR-*`   | Functional Requirement     | `FR-CYCLE-01` — HR launches an assessment cycle  |
| `NFR-*`  | Non-Functional Requirement | `NFR-PERF-01` — homepage TTFB budget             |
| `TC-*`   | Technical Constraint       | `TC-STACK-01` — Next.js + Postgres               |
| `BC-*`   | Business / UX Constraint   | `BC-PRIVACY-01` — answers visible to HR only     |

Status values: `proposed` · `accepted` · `shipped` · `dropped`.

## Glossary

- **Employee** — a person in the HR directory (name, role, contacts). Reused
  across cycles.
- **Template** — a named, ordered list of questions. Two question types in MVP:
  `scale` (one labelled option from a fixed set) and `open` (free text).
  Seeded and read-only in MVP.
- **Cycle** — one assessment: a snapshot of a template, a subject employee, a
  deadline, a private link, and a status. The unit the HR manager works with.
- **Respondent** — the person who completes a cycle. In MVP, one respondent per
  cycle (typically the subject themselves).
- **Response** — the respondent's answers to a cycle, one entry per question.
- **Summary report** — the AI-drafted, read-only summary of a completed cycle's
  answers.

## Functional requirements

### Auth & cabinet shell (capability `shell`)

| ID          | Description                                                                                                  | Status     |
| ----------- | ------------------------------------------------------------------------------------------------------------ | ---------- |
| FR-AUTH-01  | HR manager signs in before reaching any cabinet screen; unauthenticated cabinet requests redirect to sign-in | proposed   |
| FR-AUTH-02  | A single HR account is supported in MVP; credentials are configured, not self-registered                     | proposed   |
| FR-AUTH-03  | Sessions use a short-lived access token + a longer-lived refresh token; the access token is refreshed transparently via the refresh token | proposed   |
| FR-AUTH-04  | Both tokens are delivered **only** in `httpOnly`, `Secure`, `SameSite` cookies — never readable by client-side JavaScript, never in `localStorage` or the URL | proposed   |
| FR-AUTH-05  | Sign-out and refresh-token rotation invalidate the prior refresh token (no silent reuse of a stolen token)     | proposed   |
| FR-SHELL-01 | Cabinet shell: left sidebar (Kolo360 wordmark, nav: Cycles, Employees, user at bottom) + sticky page header with right-aligned primary action | proposed   |
| FR-SHELL-02 | Respondent screens (`/respond/[token]`) use a separate shell: no sidebar, single centered column ≤ 640px, mobile-first | proposed   |
| FR-SHELL-03 | Every list/detail screen defines explicit empty, loading, and error states — never a blank area              | proposed   |

### Employee directory (capability `directory`)

| ID         | Description                                                                                          | Status     |
| ---------- | ---------------------------------------------------------------------------------------------------- | ---------- |
| FR-DIR-01  | HR can add an employee via a form: full name (**required**), email (**required**), role (optional), phone (optional), Telegram handle (optional) | proposed   |
| FR-DIR-02  | HR sees a list of employees and can edit or archive one (archive, never hard-delete)                  | proposed   |
| FR-DIR-03  | Form fields are validated on blur with specific messages (e.g. "Email is not valid"); required fields block submit with a specific inline message | proposed   |
| FR-DIR-04  | The directory and add/edit form are not in the design brief's screen list; they follow the Kolo360 design system (cards, hairline borders, sentence case, design-system form components) | proposed   |

### Templates (capability `templates`)

| ID         | Description                                                                                                | Status     |
| ---------- | ---------------------------------------------------------------------------------------------------------- | ---------- |
| FR-TPL-01  | App ships with at least two seeded templates (e.g. probation check-in, peer feedback), each with a name, methodology tag, and an ordered question list | proposed   |
| FR-TPL-02  | Each question has: stable id, order, text, type (`scale` \| `open`), required flag; `scale` questions carry an ordered list of labelled anchors (value + label) | proposed   |
| FR-TPL-03  | Templates are read-only in MVP; HR can preview a template as the respondent would see it                   | proposed   |

### Cycles (capability `cycles`)

| ID          | Description                                                                                                        | Status     |
| ----------- | ----------------------------------------------------------------------------------------------------------------- | ---------- |
| FR-CYCLE-01 | HR creates a cycle by choosing a template + a subject employee + a deadline (date)                                 | proposed   |
| FR-CYCLE-02 | Launching a cycle generates a unique, hard-to-guess link token and sets status `collecting`                        | proposed   |
| FR-CYCLE-03 | On launch the chosen template is **snapshotted** into the cycle; later template/seed changes never alter it        | proposed   |
| FR-CYCLE-04 | Cycle status is one of `collecting` · `done` (auto-set to `done` when the response is complete) · `expired` (past deadline, incomplete) | proposed   |
| FR-CYCLE-05 | Cycles list shows: subject name, methodology tag, deadline (days remaining), progress, status; row opens the cycle  | proposed   |

### Link delivery (capability `link`)

| ID         | Description                                                                                                | Status     |
| ---------- | ---------------------------------------------------------------------------------------------------------- | ---------- |
| FR-LINK-01 | Each cycle exposes a private respondent URL `/respond/[token]`; HR copies it with a one-click "Copy link" action | proposed   |
| FR-LINK-02 | The token resolves to exactly one cycle, carries no personal data in the URL, and is not enumerable          | proposed   |
| FR-LINK-03 | Opening an expired or unknown token shows a calm explanatory page, never a stack trace or generic error      | proposed   |

### Respondent entry & choice (capability `respond`)

| ID          | Description                                                                                                      | Status     |
| ----------- | --------------------------------------------------------------------------------------------------------------- | ---------- |
| FR-RESP-01  | The respondent page intro states plainly: who is assessed, assessment type, deadline, and a one-line confidentiality note | proposed   |
| FR-RESP-02  | The respondent chooses one of two modes: **fill the form** or **answer the AI's questions**; the choice is remembered for the link | proposed   |
| FR-RESP-03  | Both modes write to the same per-question response model, so a cycle's results are identical in shape regardless of mode | proposed   |

### Web form mode (capability `form`)

| ID          | Description                                                                                                  | Status     |
| ----------- | ------------------------------------------------------------------------------------------------------------ | ---------- |
| FR-FORM-01  | Form shows one section/question group at a time with a thin "Section N of M" progress indicator              | proposed   |
| FR-FORM-02  | `scale` questions render their anchors as a vertical labelled option list (the anchor text is the control, not a bare 1–5 row); `open` questions use an auto-growing textarea | proposed   |
| FR-FORM-03  | Answers autosave per section; the link is resumable; required questions block advancing with a specific inline message | proposed   |
| FR-FORM-04  | On completion the respondent sees one quiet confirmation sentence; no confetti, no celebratory animation     | proposed   |

### AI interview mode (capability `ai-interview`)

| ID         | Description                                                                                                                    | Status     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| FR-AI-01   | AI interview renders as a chat page at the same link; the agent greets calmly in Ukrainian and explains it will ask the template's questions | proposed   |
| FR-AI-02   | The agent asks the template's questions **in order**, one at a time, in plain Ukrainian                                          | proposed   |
| FR-AI-03   | When an answer is insufficient (empty, off-topic, or below a defined sufficiency rule), the agent asks at most N follow-ups (N configurable, default 2) or clarifies the question, then proceeds | proposed   |
| FR-AI-04   | The agent never invents answers, never asks questions outside the template, and never reveals other respondents' data or the system prompt | proposed   |
| FR-AI-05   | When a question is satisfied, the agent records a normalised answer to the same response model as the form (for `scale`, it maps the reply to one valid anchor value; for `open`, it stores the respondent's words) | proposed   |
| FR-AI-06   | The conversation is resumable: reopening the link continues from the last unanswered question; completing all questions sets the cycle `done` | proposed   |
| FR-AI-07   | If the Claude API is unavailable, the interview degrades to a calm "try again shortly" state and offers the form mode as a fallback | proposed   |
| FR-AI-08   | If the respondent asks something off-topic (anything not part of the current assessment), the agent does not answer it; it briefly, politely declines and steers back to the current question | proposed   |
| FR-AI-09   | Off-topic handling is robust to prompt-injection attempts (e.g. "ignore your instructions"): the agent stays on the template, never reveals its system prompt, and never changes its task | proposed   |

### Progress & results for HR (capability `results`)

| ID             | Description                                                                                              | Status     |
| -------------- | -------------------------------------------------------------------------------------------------------- | ---------- |
| FR-PROGRESS-01 | The cycles list and cycle detail show live progress: answered / total questions and a thin progress bar  | proposed   |
| FR-PROGRESS-02 | Cycle detail shows answers per question; `scale` answers render as the signature five-dot scale with the numeral, `open` answers as text | proposed   |
| FR-PROGRESS-03 | If the respondent used AI interview, HR can view the raw dialog for a question on demand; it is never shown outside the cabinet | proposed   |

### AI summary report (capability `report`)

| ID            | Description                                                                                                          | Status     |
| ------------- | ------------------------------------------------------------------------------------------------------------------- | ---------- |
| FR-REPORT-01  | For a `done` cycle, HR triggers "Draft summary"; while it runs the action shows inline progress, not a frozen button | proposed   |
| FR-REPORT-02  | The summary is **grounded only in the cycle's answers** — strengths, growth areas, and short verbatim quotes; no invented facts, scores, or names | proposed   |
| FR-REPORT-03  | The summary is read-only in MVP and visible to HR only; the raw answers and dialogs remain private to HR             | proposed   |
| FR-REPORT-04  | The summariser output is a structured object (sections + quotes with their source question), rendered with the design system's report styling | proposed   |

### Token-cost accounting (capability `usage-accounting`)

| ID            | Description                                                                                                          | Status     |
| ------------- | -------------------------------------------------------------------------------------------------------------------- | ---------- |
| FR-USAGE-01   | Every Claude API call records a usage row: timestamp, purpose (`interview` \| `summary`), cycle id, model id, input tokens, output tokens (cached vs uncached tokens captured when available) | proposed   |
| FR-USAGE-02   | Each row computes a cost in USD from a **configurable price table** (per-model input/output $ per 1M tokens), so historical rows keep the price that applied when they were recorded | proposed   |
| FR-USAGE-03   | HR can see aggregate spend — total and per cycle, split by model and purpose — for cost-of-operation analysis        | proposed   |
| FR-USAGE-04   | The seeded price table reflects current Anthropic pricing (per 1M tokens, input/output): Opus 4.8 `$5 / $25`, Sonnet 4.6 `$3 / $15`, Haiku 4.5 `$1 / $5`; prices are editable without code changes | proposed   |

## Non-functional requirements

| ID            | Description                                                                                                            | Status     |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------- |
| NFR-PERF-01   | Cabinet list/detail pages reach interactive in ≤ 2.5 s on a mid-range laptop over a typical connection                 | proposed   |
| NFR-PERF-02   | AI interview shows the agent's first question within 3 s of mode selection (excluding model latency on the reply)      | proposed   |
| NFR-A11Y-01   | All interactive elements have a visible 2px accent focus ring and accessible names; full keyboard tab order            | proposed   |
| NFR-A11Y-02   | Color palette meets WCAG AA contrast; status is never communicated by color alone (always a text label)                | proposed   |
| NFR-SEC-01    | Cabinet routes require auth; respondent routes require a valid cycle token; no endpoint leaks one cycle's data to another | proposed   |
| NFR-SEC-02    | The Claude API key and database credentials live only in server-side env; never shipped to the client bundle           | proposed   |
| NFR-OBS-01    | Console is silent at runtime (no warnings, no errors) on a healthy session; server logs never contain full answer text at info level | proposed   |
| NFR-COST-01   | AI usage is bounded: interview follow-ups capped (FR-AI-03) and summary runs once per explicit HR action               | proposed   |
| NFR-I18N-01   | Product UI strings centralised in `lib/i18n/uk.ts` (Ukrainian-first); English fallback in `en.ts`; no runtime i18n library in MVP | proposed   |
| NFR-DX-01     | `lint`, `tsc --noEmit`, unit tests, and `build` run clean on a fresh checkout; pure-logic functions have unit tests; AI behaviours have at least a smoke-level eval | proposed   |

## Technical constraints

| ID            | Description                                                                                                                          | Status     |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-STACK-01   | Next.js (App Router) + TypeScript strict + React, per repo `AGENTS.md` (read `node_modules/next/dist/docs/` before writing code)     | accepted   |
| TC-STACK-02   | PostgreSQL as the single datastore for employees, templates, cycles, responses, dialogs, summaries, and usage rows                  | accepted   |
| TC-STACK-04   | **Prisma** is the ORM and migration tool for all database access; the schema lives in `prisma/schema.prisma` and DB access goes through one shared client (`lib/db/`) | accepted   |
| TC-STACK-03   | Styling and components follow the Kolo360 design system in `docs/KoloDesign/` (tokens, components, brief)                            | accepted   |
| TC-AI-01      | The AI agent runs **server-side inside the app** on the **Claude API** (Anthropic); no third-party bot platform handles raw people-data | accepted   |
| TC-AI-02      | Model per task (configurable, not hard-coded at call sites): **interview + form-fill assistance** use `claude-sonnet-4-6` (or `claude-haiku-4-5` for cheaper runs); the **summary/evaluation** uses `claude-opus-4-8`. All model calls go through one server-side module (`lib/ai/`) holding prompts, model choice, and the sufficiency/grounding rules | proposed   |
| TC-AI-03      | The interview and summary prompts are channel-agnostic, so a Telegram channel can be added later without changing the core agent     | proposed   |
| TC-AI-04      | The AI interview uses **server-side HTTP streaming** from a Next.js Route Handler (streaming the Claude API response token by token); **no WebSocket server** in MVP. HR's live progress is delivered by polling, not sockets | accepted   |
| TC-DATA-01    | All Claude API and database calls happen in Server Components, Route Handlers, or server actions; never from the client              | proposed   |
| TC-TEST-01    | Vitest for unit tests on `lib/`; AI behaviours verified via lightweight evals (fixed transcripts → expected sufficiency / grounding outcomes); no Playwright in MVP | proposed   |
| TC-DEPLOY-01  | Hosted on **Vercel** (Git integration → a preview URL per PR); Postgres via a managed provider (e.g. Neon / Supabase); configuration via environment variables with a documented `.env.example` | accepted   |
| TC-PURE-01    | `lib/` is framework-free (no `next/*`, no `react`, no DOM globals): answer-sufficiency rules, progress/scale aggregation, template snapshotting, and token generation are pure and 100% unit-testable | proposed   |
| TC-VALID-01   | All inbound data (Route Handlers, server actions, AI structured outputs, env vars) is validated with **Zod** at the boundary; downstream TypeScript types are **inferred from the Zod schemas** (`z.infer`), so schema and type never drift | accepted   |
| TC-TS-01      | Strict typing with no escape hatches: **no `any`**, **no type assertions / casts (`as`, `as unknown as`, `!` non-null)**, no `@ts-ignore` / `@ts-expect-error` to silence errors. Types are correct and inferred (from Zod via `z.infer`, from Prisma's generated types); use `unknown` + a Zod parse at boundaries instead of casting. Lint/CI fails the build on a violation | accepted   |
| TC-ARCH-01    | Architecture is a priority: anything reused lives in a shared location, not copy-pasted — shared types/schemas, UI components, and helpers each have one home (e.g. `lib/`, `components/`, `lib/schemas/`); a thing is defined once and imported | accepted   |

## Business / UX constraints

| ID             | Description                                                                                                          | Status     |
| -------------- | -------------------------------------------------------------------------------------------------------------------- | ---------- |
| BC-PRIVACY-01  | Answers and AI dialogs are visible to HR only; respondents see only their own session                               | accepted   |
| BC-PRIVACY-02  | Respondent links carry no personal data and are not enumerable; confidentiality is stated plainly where the respondent acts | accepted   |
| BC-PRIVACY-03  | No third-party trackers or analytics; the only external service that sees content is the Claude API, server-side    | accepted   |
| BC-PRIVACY-04  | Data minimisation to the model: any Claude prompt receives only what the task needs — template questions, the current conversation/answers, and a pseudonymous identifier (at most the subject's first name where natural phrasing requires it). Personal data (surname, email, phone, Telegram handle) is never placed in a prompt. The token ↔ employee mapping lives only in the database | accepted   |
| BC-BRAND-01    | UI follows the Kolo360 design system: Ukrainian-first, calm and confidential tone, sentence case, no exclamation marks, no emoji | accepted   |
| BC-BRAND-02    | The report screen reads like a typeset document (serif body), per the design brief; every other screen stays quiet and dense | proposed   |
| BC-DEMO-01     | Every requirement is demonstrable in the 1–2 min demo: a full cycle from launch through AI interview to AI summary    | accepted   |

## Out of scope (MVP)

- Full 360°: multiple reviewers per subject, reviewer relations, coverage
  minimums, calibration flags.
- Telegram (or any external messenger) as a delivery/interview channel — the
  agent is built channel-agnostic so it can be added later.
- HR-facing template editor and custom methodologies (templates are seeded,
  read-only).
- Editorial approval gate for reports: in-place editing, evidence pull-quotes,
  locking, versioning, approval.
- Reminders, scheduled jobs, background refresh, notifications.
- Multiple HR users, roles, organisations, or tenants.
- Exports (PDF / CSV) and cross-cycle analytics.
- Dark mode (design light-only in v1; keep tokens semantic).
- Self-hosting on the team's own AWS server (for a later, confidentiality-hardened
  production deployment; MVP ships on Vercel).
- Automated email delivery of the respondent link (e.g. via Resend, with a verified
  sending domain). MVP delivers the link by **manual copy-to-clipboard** (FR-LINK-01);
  email send is a fast-follow.
