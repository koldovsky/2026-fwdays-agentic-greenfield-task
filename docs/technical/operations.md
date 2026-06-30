# Operations & environments — «Поливайко»

> How to run the app locally. There is **no deploy** — local single-user only
> (ADR-0001). Architecture: [`architecture.md`](./architecture.md). Data model:
> [`data-model.md`](./data-model.md).

## Local run

Prerequisites: Node (npm v11 ok), then:

```bash
npm install               # better-sqlite3 prebuilt binary loads; if it fails: npm rebuild better-sqlite3
cp .env.example .env.local   # optional — DATABASE_URL defaults work without it
npm run db:migrate        # apply migrations (also auto-applied on app init)
npm run db:seed           # optional — deterministic demo data (db/seed.ts)
npm run dev               # http://localhost:3000
```

Migrations are also applied automatically on startup by
[`db/client.ts`](../../db/client.ts) (idempotent), so a fresh `data/app.db` is
created and schema'd on first request — `db:migrate` is for an explicit pre-step.

### Scripts ([`package.json`](../../package.json))

| Script | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev / production build / serve |
| `npm run db:generate` | drizzle-kit generate a new migration from schema |
| `npm run db:migrate` | apply migrations (`tsx db/migrate.ts`) |
| `npm run db:seed` | deterministic seed (`tsx db/seed.ts`) |
| `npm run test:run` / `test:e2e` / `check:a11y` | tests — see [`testing.md`](./testing.md) |
| `npm run qa:verify` / `gate:status` | QA aggregate + gate verdicts |

## Environment

| Var | Default | Notes |
|---|---|---|
| `DATABASE_URL` | `file:./data/app.db` | `file:` URL or bare path; `:memory:` for tests. `.env.local` is gitignored — never commit it |

No other secrets exist: no auth/email/integrations (TC-04, NFR-SEC-01). No
`NEXT_PUBLIC_*` vars, so nothing secret can reach the client bundle
([`../qa/security-review-notes.md`](../qa/security-review-notes.md) #9).

The SQLite connection uses WAL, `foreign_keys = ON` (required for the delete
cascade, SC-5), and `busy_timeout = 5000` to wait out a held lock rather than
crash under parallel build workers / concurrent dev requests.

## No-deploy decision (ADR-0001)

Cloud deploy is **out of MVP scope** — the Owner runs it locally, single-user
(Checkpoint 1 sign-off). Consequently the `deploy-gated` NFRs (PERF-03,
COMPAT-03, SEC-02, LOC-02) are Future, not skipped. When deploy becomes MVP+1, a
follow-up ADR swaps SQLite→Postgres (Drizzle keeps the schema portable) and the
full security checklist re-runs (add per-record owner scoping to the `getPlant` /
`listMeasurements` / `listWaterings` queries, session handling, rate limiting —
[`../qa/security-review-notes.md`](../qa/security-review-notes.md) re-check trigger).

## Accepted limitations (honest)

- **Cyrillic display font → Mulish.** Quicksand and Spline Sans Mono ship Latin
  only (no Cyrillic subset on Google Fonts). The `@theme` stacks fall through to
  Mulish (Cyrillic) then system sans, so Cyrillic headings/meta render in Mulish
  while the Latin display face applies to Latin glyphs
  ([`app/layout.tsx`](../../app/layout.tsx)).
- **No auth** — single local user by design (NFR-SEC-01, TC-04, BC-02). There is
  no authz surface and no IDOR-across-tenants risk; recorded N/A-by-design, not
  silently passed ([`../qa/security-review-notes.md`](../qa/security-review-notes.md)).
- **postcss / esbuild-kit advisories** — `npm audit` reports 6 moderate, 0
  high/critical, all build-chain / devDependency (postcss via Next tooling;
  esbuild-kit via drizzle-kit), none on a request-handling runtime path.
  `npm audit fix --force` is **not** advisable (it downgrades Next to 9.3.3);
  pick up postcss via the normal Next patch bump (security-review #10).
- **`today` bound stale across midnight** in a long-lived open tab — purely
  cosmetic (the server re-validates against its own `todayInKiev()` on every
  write); self-correcting on refresh.
- **Rate limiting: none** — accepted for a local single-user app with no
  network-exposed endpoints; add it before any deploy/multi-user.

Full register: [`../qa/risk-register.md`](../qa/risk-register.md). None block MVP
acceptance.
