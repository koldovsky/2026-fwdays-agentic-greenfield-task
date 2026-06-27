<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Kolo360 — agent rules

Kolo360 is an internal HR tool for structured employee assessments (360°, performance,
probation). An HR manager creates an assessment from a template for an employee, shares
a private link; the respondent answers via a web form **or** a server-side AI chat
interview; answers land in Postgres; HR sees progress and gets an AI summary.

## Source of truth (read before building)

- `docs/requirements.md` — the **PRD**: numbered requirements (`FR-*`, `NFR-*`, `TC-*`,
  `BC-*`). The single source of truth for *what* and *constraints*. Cite IDs in specs,
  tests, and commits.
- `docs/product-brief.md` — the business narrative (*why / for whom*).
- `DESIGN.md` + `docs/KoloDesign/` — the visual source of truth (*how it looks*).
- Build only what's in scope; the PRD's "Out of scope (MVP)" list is deferred.

## Stack & architecture

- Next.js (App Router) + TypeScript strict + React. Postgres via **Prisma**
  (`prisma/schema.prisma`, one shared client in `lib/db/`). Styling via the Kolo360
  design tokens (`app/tokens.css`) + Tailwind. Deploy: Vercel.
- **Architecture is a priority.** Anything reused lives in one shared home — shared
  types/schemas in `lib/`, UI in `components/`, Zod schemas in `lib/schemas/`. Define
  once, import everywhere. No copy-paste.
- `lib/` is framework-free (no `next/*`, no `react`, no DOM): pure, 100% unit-testable
  logic (scoring/aggregation, sufficiency rules, snapshots, token generation).

## Typing & validation (hard rules)

- **No `any`. No type assertions / casts** (`as`, `as unknown as`, `!` non-null).
  No `@ts-ignore` / `@ts-expect-error` to silence errors. Use `unknown` + a Zod parse
  at boundaries instead of casting.
- Validate **all** inbound data (Route Handlers, server actions, AI outputs, env) with
  **Zod**; derive TypeScript types from the schemas via `z.infer` — never hand-write a
  parallel type. Use Prisma's generated types for DB rows.

## AI

- The agent runs **server-side, in-code, on the Claude API** — never a third-party bot
  platform. All model calls go through one module (`lib/ai/`) holding prompts, model
  choice, and the sufficiency/grounding rules.
- Models per task: interview + form-fill = `claude-sonnet-4-6` (or `claude-haiku-4-5`);
  summary/evaluation = `claude-opus-4-8`.
- **Data minimisation**: prompts get only questions + the current conversation/answers
  + a pseudonymous id (at most a first name). Never surname/email/phone/Telegram.
- The interviewer stays on the template, declines off-topic questions, never invents
  content, never reveals its system prompt (injection-resistant). The summariser uses
  only the collected answers.
- Interview transport: server-side HTTP streaming from a Route Handler — **no
  WebSockets**.
- Record token usage per call (model, tokens) and cost in USD from a configurable
  price table.

## Design

- Follow the Kolo360 design system (`DESIGN.md`, `docs/KoloDesign/`). Use the tokens;
  port the reference components in `docs/KoloDesign/components/**`, don't reinvent.
- Sentence case everywhere, calm/confidential tone, **no exclamation marks, no emoji**,
  Lucide outline icons only. **Light theme only in v1** (tokens stay semantic).
- Ukrainian-first UI strings centralised in `lib/i18n/uk.ts` (English fallback `en.ts`).
- Every screen designs its empty, loading, and error states.

## Verification loop (before "done")

- Run, and keep green: `npm run lint && tsc --noEmit && npm test && npm run build`.
- Tests-first where it matters: pure `lib/` logic has unit tests (Vitest); AI behaviour
  has at least a smoke-level eval. A failing check is a STOP — fix it, never weaken or
  bypass it.
- **maker ≠ checker**: whoever wrote a slice does not review or verify it; use a
  separate review pass / agent.
- Console stays silent at runtime on a healthy session; secrets only in server-side env.
