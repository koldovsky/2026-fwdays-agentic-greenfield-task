# Architecture — «Поливайко»

> Single-user local web app: succulent watering reminders + growth/watering
> tracker with charts. Stack & no-deploy decision: [ADR-0001](../adr/ADR-0001-stack.md).
> Context-budget decision: [ADR-0002](../adr/ADR-0002-context-architecture.md).
> Requirements: [`../requirements.md`](../requirements.md).

## Stack (ADR-0001)

| Layer | Choice | Why |
|---|---|---|
| Web | **Next.js 16** App Router, TypeScript, React 19 ([`package.json`](../../package.json)) | Server components + server actions; no separate API tier |
| Data | **SQLite + Drizzle ORM** ([`db/client.ts`](../../db/client.ts)) | File persistence survives restarts (NFR-DATA-01); zero infra |
| Charts | **Recharts 3** ([`components/charts/`](../../components/charts/)) | Client-island line charts (TC-05) |
| Styling | **Tailwind 4** `@theme` + CSS vars ([`app/globals.css`](../../app/globals.css)) | «Поливайко» design tokens (FR-DS-01) |
| Tests | **Vitest** + **Playwright** + axe | unit/component, E2E, a11y — see [`testing.md`](./testing.md) |

Dropped from the Project-Factory default: Better Auth + Resend (no auth/email,
TC-04, NFR-SEC-01) and Postgres/Vercel (no cloud deploy in MVP).

## Layering: the `lib/<domain>` module pattern

Every domain (`plants`, `growth`, `watering`, `reminders`, `charts`) is a folder
under [`lib/`](../../lib/) with the same four-file shape:

| File | Role | Purity / DB |
|---|---|---|
| `validation.ts` | parse + bound raw form strings → typed input; Ukrainian messages | pure, no DB |
| `queries.ts` | raw Drizzle reads/writes; **`db` injected as first param** | DB, no business rules |
| `service.ts` | business ops between actions and queries; `db` defaulted to singleton, injectable | DB |
| `actions.ts` | `"use server"` entrypoints: validate → service → `revalidatePath` → `ActionResult` | DB |

Examples: [`lib/plants/service.ts`](../../lib/plants/service.ts) takes
`db: PlantsDb = defaultDb`; [`lib/reminders/queries.ts`](../../lib/reminders/queries.ts)
takes `db` as its first param so tests drive a fresh in-memory DB. The DB type is
narrowed to `Pick<DB, "select" | ...>` per module so a query can't reach beyond
what it declares. Pure status math lives in
[`lib/reminders/status.ts`](../../lib/reminders/status.ts) (no DB, no `Date.now()` —
`today` is injected as a `YYYY-MM-DD` string, comparisons stay lexicographic).

Cross-cutting helpers: [`lib/dates.ts`](../../lib/dates.ts) (`todayInKiev`,
`isAfterToday`, `formatAcquiredDate`, `addDays`), [`lib/i18n/uk.ts`](../../lib/i18n/uk.ts)
(all UI copy — Ukrainian per NFR-LOC-01; code/ids stay English).

## The `ActionResult` inline-error contract (FROZEN)

Defined in [`lib/forms/result.ts`](../../lib/forms/result.ts) — every form-backing
action returns this discriminated union and **never throws on user input**:

```ts
type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; fieldErrors?: FieldErrors; formError?: string; values?: SubmittedValues };
```

Helpers `ok()`, `fieldError(fieldErrors, values?)`, `formError(message, values?)`.
A failure echoes the submitted `values` so the form repopulates uncontrolled
inputs via `defaultValue` after React 19 auto-resets `<form action>` on resolve —
this is how the Owner's typed input survives a validation round-trip
(FR-SHELL-03, NFR-USA-02). DB/FK/validation errors are translated to a human
Ukrainian message; driver internals go to server-side `console.error`, never the
response (see [`security-review-notes.md`](../qa/security-review-notes.md) #9).

## Rendering: server-component pages + thin client islands

Pages are async server components that load data once and render
([`app/page.tsx`](../../app/page.tsx), [`app/plants/[id]/page.tsx`](../../app/plants/%5Bid%5D/page.tsx)).
Data-backed routes set `export const dynamic = "force-dynamic"` so they read
mutable plant data per request and never prerender at build. Client islands are
narrow: charts ([`components/charts/`](../../components/charts/)), delete-confirm,
water-now button. **FR-CHART-04 / FR-REM-05 freshness needs no client machinery** —
each action calls `revalidatePath('/')` / `revalidatePath('/plants/<id>')`, which
re-renders the force-dynamic page so derived series, counts, and pills recompute.

The home ([`app/page.tsx`](../../app/page.tsx)) loads `getHomeReminders(db)` ONCE,
so the summary count, the reminder list, and every card pill read from the SAME
derived status — no duplicate state (FR-REM-07).

## Design-token layer (FR-DS-01)

«Поливайко» tokens (source of truth [`../design.md`](../design.md)) are wired into
Tailwind's `@theme` + CSS vars in [`app/globals.css`](../../app/globals.css):
palette (forest/pine/sage/moss/mist, bark/clay/sand, paper/cloud/ink/stone/border,
status chips), radii (inputs 13, soft buttons 14, cards 18–22, pills 999), and the
three fonts loaded via `next/font` in [`app/layout.tsx`](../../app/layout.tsx)
(Quicksand display, Mulish body+Cyrillic, Spline Sans Mono meta). Single light
"paper" theme only — the light/dark toggle was removed (FR-SHELL-02a supersedes
FR-SHELL-02). Three text tokens (clay/stone/placeholder) were darkened from their
nominal hex to clear WCAG AA 4.5:1 (NFR-A11Y-02) — see design.md AA-override note.

## Auto-migrate on init

[`db/client.ts`](../../db/client.ts) opens a `better-sqlite3` handle (WAL,
`foreign_keys = ON`, `busy_timeout = 5000`), keeps a dev singleton across HMR, and
applies committed migrations on startup via Drizzle's migrator (idempotent —
tracks applied migrations). Without this a fresh `data/app.db` has no tables and
every query 500s. `DATABASE_URL` accepts a `file:` URL or bare path; `:memory:` is
honored for tests. Data model + the 4 migrations: [`data-model.md`](./data-model.md).
Operations: [`operations.md`](./operations.md).
