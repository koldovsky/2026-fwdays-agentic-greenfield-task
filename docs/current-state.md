# Current state

> Live handoff between agent sessions. Read first, update before finishing.
> Keep short — overwrite stale content, don't append endlessly.

**Updated:** 2026-07-02

## Last action

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

- **Main flow: `add-persistence` + `add-auth` remainder** — unchanged; pick up in a fresh session.

## Next steps

1. **Decide the Auth.js library / session strategy** (next-auth v5 vs lucia vs custom HMAC).
   Gates the session helper, `src/app/api/auth/**`, and the GDPR endpoints
   (`GET /api/account/export`, `DELETE /api/account`). Register/authenticate + repos exist —
   only the session/HTTP wrapper is new.
2. **`features/sign-in` UI** + top-bar session state; sign-in enforced only at export/paywall,
   one free anonymous tailoring stays (FR-ONBOARD-01).
3. **`add-agent-loop`** — replaces the `/tailor` stub. Needs `ANTHROPIC_API_KEY`; reuses
   `shared/lib/llm`; keep user ids out of LLM payloads (NFR-SEC-02).
4. **`add-payments-emulator`** — needs persistence + auth.
5. **`landing-animations`** — implement only after the main-flow items above.

Also open: `export-resume`, `edit-bullet`, `upload-cv`/`paste-jd` (TC-PARSE-01/02).

## Blockers / open questions

- **Ukrainian-first vs display font** — Bricolage Grotesque has no Cyrillic subset; landing
  shipped English. Resolve before i18n (NFR-I18N-01 / BC-BRAND-01 tension).
- **Env before launch:** `NEXT_PUBLIC_SITE_URL` (SEO defaults to `https://vouch.app`),
  `DATABASE_URL`, `CV_ENCRYPTION_KEY` (64 hex or base64 → 32 bytes).
- **Auth.js / session strategy undecided** (`TC-STACK-07`); Google OAuth needs client
  id/secret; reset flow needs an email sender. Merchant-of-record (`TC-STACK-06`) undecided.
- `add-agent-loop` needs LLM SDK choice + `ANTHROPIC_API_KEY`; BullMQ/Redis not stood up.
- Agent-env gaps needing a human: project `.claude/settings.json` with permission deny-list +
  format/test hooks absent; `perf-audit` skill proposed, awaiting approval; caveman statusline
  badge still unapplied (self-modification block).
