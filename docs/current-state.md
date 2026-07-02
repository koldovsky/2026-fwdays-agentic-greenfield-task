# Current state

> Live handoff between agent sessions. Read first, update before finishing.
> Keep short — overwrite stale content, don't append endlessly.

**Updated:** 2026-07-02

## Last action

- **Agent-engineering improvements done + verified (2026-07-02).** All four planned items:
  1. **FSD boundaries now ESLint-enforced** (`eslint.config.mjs`): downward-only layer imports,
     slice index.ts public-API rule, `shared/lib` framework-free (TC-PURE-01). Verified: lint
     green on existing code AND catches an injected violation. Limit: only `@/` alias imports
     checked — relative-path escapes stay checker territory.
  2. **`.claude/agents/`**: `checker` (fresh-context maker≠checker review, read-only) +
     `verifier` (build/lint/test + FR/NFR evidence). Both wrap the existing skills.
  3. **Project permissions** in `.claude/settings.json`: deny `rm -rf`/force-push/hard-reset/
     `git clean`/`.env*`; allow `yarn build|lint|test`, `openspec validate`, read-only git.
  4. **`perf-audit` skill built** (was proposed): `.claude/skills/perf-audit/` + Cline mirrors,
     codifies `docs/perf/log.md` Lighthouse procedure (NFR-PERF-04); registered in AGENTS.md.
  Gates: lint + build green, 153/153 tests. Nothing committed yet.
- **Plan-first workflow wired (2026-07-02).** Project `UserPromptSubmit` hook injects plan-first
  rule (plan in this file before code); `Stop` hook blocks finishing when tree changed but this
  file wasn't updated. Codified in AGENTS.md. User-level: caveman statusline badge + SessionStart
  context-check hook in `~/.claude/settings.json`. Live-confirmed: prompt hook fires.

- **Auth.js session + GDPR endpoints done + live-verified (2026-07-02).** TC-STACK-07 decided:
  **next-auth v5 (5.0.0-beta.31), JWT sessions, Credentials provider** over the existing scrypt
  service (rationale in `openspec/changes/add-auth/design.md`; Supabase/Clerk rejected — hosted,
  need external creds).
  - App-layer wiring (shared/lib stays framework-free): `src/app/auth.ts` (`handlers`, `auth`,
    `currentUserId()`), `/api/auth/[...nextauth]`, `/api/auth/register` (validation + uniform codes).
  - **GDPR endpoints (persistence 3.x):** `GET /api/account/export` (user + decrypted CV text +
    full tailoring history, 401 anon) and `DELETE /api/account` (hard delete, FK cascade, clears
    session cookie) — thin routes over new framework-free `shared/lib/account` service;
    `user-repo` gained `deleteById`.
  - **Live-verified over real HTTP:** `scripts/dev-pglite-server.mjs` (pglite over TCP :5544,
    migrations on boot; single-connection — stop app before hand-seeding) + `next start`:
    register 201 → duplicate `email_taken` → weak password 400 → sign-in 302 + JWT cookie →
    session has user id → export JSON → delete → export 404. Plus pglite integration tests for
    export (decrypted rawText) + cascade delete. Build/lint green, **153 tests**.
  - Env: **`AUTH_SECRET` now required at runtime** (added to launch env list below).
  - Still open in `add-auth`: Google OAuth flow (needs client id/secret), password reset (needs
    email sender), `features/sign-in` UI + top-bar session state (3.1/3.3), checker-review (4.3).
- **Perf + environment-audit interlude (2026-07-02).** All previously uncommitted work is now
  committed (4 commits on `rromanko`: prior-session work, perf, audit fixes, animations spec).
  No main-flow code touched.
  - **Landing perf (NFR-PERF-04): targets met.** Lighthouse mobile throttled vs `next start`:
    LCP 2.64 s → **2.48 s** (target < 2.5 s), TBT 30 → **25 ms** (target < 200 ms), CLS 0.
    Fixes: Faq rebuilt on native `<details>/<summary>` (drops its client JS), 26 KB
    favicon.ico → 570 B `icon.svg`, unused `fallow` devDep removed. Font-weight clamping
    tried + reverted (Google serves identical bytes). Evidence: `docs/perf/baseline.json`,
    `after.json`, `log.md` (diagnosis, per-fix deltas, remaining headroom: self-hosted subset
    fonts ≈ −0.2 s; ~147 KB framework JS is the floor). **LCP margin ≈ 20 ms** — re-run the
    log.md procedure after any landing change.
  - Fixed pre-existing `next build` breakage (readonly-type errors in
    `shared/lib/evals/fixtures.ts`). Build, lint, **150 tests** green.
  - **Agent-environment audit done.** Fixed: marketing-landing FAQ spec synced to the
    `<details>` implementation; AGENTS.md baseline-spec list + dead `/vouch-design` skill refs
    (also in DESIGN.md); stale "yarn build broken" note in agent-verify (3 copies).
    `openspec validate --all --strict` 9/9. Flagged, not built: no hooks / no project
    permission deny-list, no `.claude/agents/`; proposed a `perf-audit` skill (needs approval).
  - **`landing-animations` change proposed (SPEC ONLY, 4/4 artifacts valid):** scroll-reveal,
    hero entrance, CTA micro-interactions; constraints: prefers-reduced-motion off-switch,
    CLS 0, deps ≤ 3 kb, perf budget must hold. **Priority: after current main-flow task,
    before any new features.**

## Prior (done, see git log)

- `add-auth` core (2026-07-02): scrypt password + `registerWithPassword`/
  `authenticateWithPassword` over ports, migration `0002_auth.sql`, pglite-verified,
  no account enumeration. Open: Auth.js/session decision, Google OAuth, reset email, sign-in UI.
- `add-persistence` (2026-07-02): pg + raw SQL over `Queryable` port, AES-256-GCM CV at rest
  (`shared/lib/crypto`), cv-profile/tailoring repos, forward-only migrations, pglite-verified.
  Open: GDPR endpoints (need session helper) + checker-review.
- `add-landing-page` shipped + ARCHIVED: `views/landing` at `/`, full SEO, English copy
  (display font lacks Cyrillic — see blockers).
- Foundation P0–P4: Vitest, pure `shared/lib` scoring/i18n/llm prompt core, `shared/ui` kit,
  entities, widgets, `views/tailor-workspace` at `/tailor` (stub fixture). SDD baseline specs.

## Working on

- **`add-auth` remainder** — sign-in UI (3.1/3.3), Google OAuth (creds), reset email, checker-review.
  `add-persistence` fully done except checker-review (4.3).

## Next steps

1. **`features/sign-in` UI** + top-bar session state; sign-in enforced only at export/paywall,
   one free anonymous tailoring stays (FR-ONBOARD-01).
2. **`add-agent-loop`** — replaces the `/tailor` stub. Needs `ANTHROPIC_API_KEY`; reuses
   `shared/lib/llm`; keep user ids out of LLM payloads (NFR-SEC-02).
3. **`add-payments-emulator`** — needs persistence + auth.
4. **`landing-animations`** — implement only after the main-flow items above.

Also open: `export-resume`, `edit-bullet`, `upload-cv`/`paste-jd` (TC-PARSE-01/02).

## Blockers / open questions

- **Ukrainian-first vs display font** — Bricolage Grotesque has no Cyrillic subset; landing
  shipped English. Resolve before i18n (NFR-I18N-01 / BC-BRAND-01 tension).
- **Env before launch:** `NEXT_PUBLIC_SITE_URL` (SEO defaults to `https://vouch.app`),
  `DATABASE_URL`, `CV_ENCRYPTION_KEY` (64 hex or base64 → 32 bytes), `AUTH_SECRET` (32+ bytes).
- Google OAuth needs client id/secret; password reset needs an email sender (Auth.js/session
  decided — see `add-auth/design.md`). Merchant-of-record (`TC-STACK-06`) undecided.
- `add-agent-loop` needs LLM SDK choice + `ANTHROPIC_API_KEY`; BullMQ/Redis not stood up.
- Agent-env: deny-list, subagents, FSD lint, `perf-audit` all done 2026-07-02. Remaining gap:
  no auto-format hook (repo has no prettier config — adding one is a human call).
